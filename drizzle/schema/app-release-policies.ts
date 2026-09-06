import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { check, jsonb, pgPolicy, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * ===== app_release_policies（推奨 / 強制アップデートの方針） =====
 *
 * モバイルアプリの各プラットフォームについて「**いま出回っている版のうち、
 * どこまでを許容するか**」を 1 行で持つ。クライアントは起動時とフォアグラウンド復帰時に
 * この 1 行を読み、自分の版と突き合わせて `none` / `recommended` / `forced` を決める。
 *
 * 判断ロジックは `frontend/apps/mobile/src/features/app-update/model/`（純粋関数・テスト済み）。
 * 運用手順は `docs/mobile/app-update-runbook.md`、判断の正本は `.claude/skills/app-update/`。
 *
 * ## なぜ「テーブル + RLS」なのか
 *
 * `.claude/rules/supabase-first.md` の判断順で第 1 段（supabase-js から直接読める）に
 * 収まる。Edge Function を挟むと**アプリを起動できるかどうかが関数のコールドスタートに
 * 依存する**ようになり、止めたときの被害が大きい。行は 2 行しかなく RLS も `true` なので、
 * 関数を挟む理由が無い。
 *
 * ## 絶対に壊してはいけない不変条件（ここを DB 側で担保する）
 *
 * 1. **`minimum_version` は `latest_version` を超えられない。**
 *    超えると「ストアに存在しない版を要求する」状態になり、**全ユーザーとストア審査担当者が
 *    アプリを起動できないまま復旧手段を失う**。UPDATE 文のタイプミス 1 つで起きるので、
 *    アプリ側のフェイルオープンだけに頼らず CHECK 制約で止める。
 * 2. **版の表記は `<major>.<minor>.<patch>` の 3 つの数値に固定する。**
 *    そうすることで `string_to_array(v, '.')::int[]` の配列比較がそのまま版の大小になり
 *    （`{1,10,0} > {1,9,0}`）、文字列比較の "1.10.0" < "1.9.0" 事故を DB 側でも起こさない。
 *
 * ## 何と比較するか
 *
 * 比較対象は **ユーザーとストアに見えるマーケティング版**
 * （iOS = `CFBundleShortVersionString` / Android = `versionName`。`app.json` の `expo.version`）。
 * ビルド番号（`CFBundleVersion` / `versionCode`）は EAS の `autoIncrement` で毎ビルド動くうえ、
 * ストアの掲載にも出ないので、下限の宣言には使わない。
 */
export const appReleasePolicies = pgTable(
  'app_release_policies',
  {
    /** 'ios' | 'android'。プラットフォームごとに審査・公開のタイミングがずれるため必ず分ける */
    platform: text('platform').primaryKey(),

    /** これ**未満**の版は起動をブロックする（強制アップデート） */
    minimumVersion: text('minimum_version').notNull(),

    /** ストアで公開中の最新版。これ**未満**なら「後で」を選べる推奨アップデートを出す */
    latestVersion: text('latest_version').notNull(),

    /**
     * ストアの当該アプリのページ。**環境ごとに bundle id / package name が違う**ため
     * アプリ側にハードコードせず、方針と同じ行に持たせる。
     *
     * **`https://` のみ**（CHECK 制約）。iOS は `https://apps.apple.com/app/id<ID>`、
     * Android は `https://play.google.com/store/apps/details?id=<package>`。
     * これが Apple / Google の一次情報で裏の取れる唯一の形式であり、
     * かつ行を書き換えられても任意スキームの URL を開かせないための制約でもある。
     */
    storeUrl: text('store_url').notNull(),

    /**
     * 「新しくなったこと」をロケールキーで持つ（例: `{"en": "...", "ja": "..."}`）。
     * **任意**。無ければアプリ側の i18n 既定文言にフォールバックする
     * （UI の固定文言は i18n が正本。ここに入れるのはリリースごとに変わるデータだけ）。
     */
    releaseNotes: jsonb('release_notes').$type<Record<string, string>>(),

    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    check('app_release_policies_platform_check', sql`${table.platform} in ('ios', 'android')`),
    check(
      'app_release_policies_minimum_version_format_check',
      sql`${table.minimumVersion} ~ '^[0-9]+\\.[0-9]+\\.[0-9]+$'`
    ),
    check(
      'app_release_policies_latest_version_format_check',
      sql`${table.latestVersion} ~ '^[0-9]+\\.[0-9]+\\.[0-9]+$'`
    ),
    // 下限が最新を追い越すと、ストアに無い版を要求して全員（審査担当者を含む）が詰む。
    check(
      'app_release_policies_minimum_not_above_latest_check',
      sql`string_to_array(${table.minimumVersion}, '.')::int[] <= string_to_array(${table.latestVersion}, '.')::int[]`
    ),
    check('app_release_policies_store_url_check', sql`${table.storeUrl} ~ '^https://'`),
  ]
).enableRLS()

// ===== RLS ポリシー =====

/**
 * 未ログインでも読めなければならない。**アップデート判定はログインより前に走る**
 * （古いクライアントはログイン画面すら開けないことがあるため）。
 *
 * 書き込みポリシーは**意図的に 1 本も置かない**。RLS 有効 + ポリシー無し = 既定拒否なので、
 * `anon` / `authenticated` からの INSERT / UPDATE / DELETE は届かない。
 * 更新経路はマイグレーションと `service_role`（RLS をバイパスする）だけに限定する。
 */
export const selectAppReleasePolicies = pgPolicy('select_app_release_policies', {
  for: 'select',
  to: ['anon', 'authenticated'],
  using: sql`true`,
}).link(appReleasePolicies)

// ===== 型エクスポート =====
export type AppReleasePolicy = InferSelectModel<typeof appReleasePolicies>
export type NewAppReleasePolicy = InferInsertModel<typeof appReleasePolicies>

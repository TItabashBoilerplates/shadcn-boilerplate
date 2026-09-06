/**
 * app_release_policies のマスタデータ（推奨 / 強制アップデートの方針）
 *
 * **ローカル / 開発環境で、アップデート判定を「何も出ない」状態から始めるための行。**
 * `mode: boilerplate` の間は本物のストア URL が存在しない（bundle id / package name が
 * 意図的に未決定）ので、環境変数で渡されたときだけ実物を使い、無ければ
 * **判定が必ず `none` になる値**を入れる。
 *
 * ## 既定値の考え方
 *
 * `minimum_version` = `latest_version` = **`app.json` の版そのもの**にしてある。
 * こうすると手元のビルドは常に「最新かつ下限以上」なので、
 * **開発中に強制アップデート画面が出てしまって何も触れなくなる**という事故が起きない。
 * 挙動を試したいときは runbook の手順で `minimum_version` を上げる
 * （`docs/mobile/app-update-runbook.md`）。
 *
 * ## `mode: product` にしたら
 *
 * ストアの実 URL に差し替える。**この seed の値を本番へ流さないこと** —
 * 本番の行はマイグレーションまたは runbook の SQL で入れる（seed は開発用）。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../schema'
import { appReleasePolicies } from '../../schema'

type Database = PostgresJsDatabase<typeof schema>

/**
 * `app.json` の `expo.version` を読む。
 *
 * **直書きしない。** クライアントが比較するのはこの値なので、ここがずれると
 * seed 直後のローカルで意図せず推奨アップデートが出る。
 */
function readAppVersion(): string {
  const appJsonPath = fileURLToPath(
    new URL('../../../frontend/apps/mobile/app.json', import.meta.url)
  )
  const version = JSON.parse(readFileSync(appJsonPath, 'utf8'))?.expo?.version

  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(
      `frontend/apps/mobile/app.json の expo.version が "<major>.<minor>.<patch>" ではありません: ${String(version)}. ` +
        'app_release_policies は 3 セグメントの数値表記しか受け付けません（CHECK 制約）。'
    )
  }
  return version
}

export async function seedAppReleasePolicies(db: Database): Promise<void> {
  const version = readAppVersion()

  // ストア URL は環境ごとに違う（bundle id / package name が違う）ので env から取る。
  // 未設定なら「形は正しいがどのアプリでもない」URL を入れる。ローカルでは
  // 判定が none なので開かれることはなく、product へ持ち込めば store-preflight で気づく。
  const iosStoreUrl =
    process.env.APP_UPDATE_IOS_STORE_URL ?? 'https://apps.apple.com/app/id000000000'
  const androidStoreUrl =
    process.env.APP_UPDATE_ANDROID_STORE_URL ??
    'https://play.google.com/store/apps/details?id=com.example.placeholder'

  await db
    .insert(appReleasePolicies)
    .values([
      {
        platform: 'ios',
        minimumVersion: version,
        latestVersion: version,
        storeUrl: iosStoreUrl,
      },
      {
        platform: 'android',
        minimumVersion: version,
        latestVersion: version,
        storeUrl: androidStoreUrl,
      },
    ])
    // 何度流しても同じ状態になること（master seed の約束）
    .onConflictDoUpdate({
      target: appReleasePolicies.platform,
      set: {
        minimumVersion: sql`excluded.minimum_version`,
        latestVersion: sql`excluded.latest_version`,
        storeUrl: sql`excluded.store_url`,
        updatedAt: sql`now()`,
      },
    })
}

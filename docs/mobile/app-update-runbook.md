# 推奨 / 強制アップデート 運用手順

**判断の正本は [`.claude/skills/app-update/`](../../.claude/skills/app-update/SKILL.md)。**
このファイルは「実際に何を打つか」の手順書。

> ⚠️ **`minimum_version` を上げる操作は、こちらから取り消せない。**
> 上げた瞬間、それ未満の全ユーザーがアプリを起動できなくなる。サーバ側で戻しても、
> すでにアンインストールされた分は戻らない。**§3 の前提条件を 1 つでも満たさないなら上げない。**

---

## 1. まず状態を見る（書き換えない）

```sql
select platform, minimum_version, latest_version, store_url, updated_at
from public.app_release_policies
order by platform;
```

Supabase の調査は **MCP 経由**で行う（`.claude/rules/mcp-supabase.md`）。
ローカルは `supabase` MCP、本番は `supabase-prod` MCP（read-only）。

あわせて **ストアの現況**も見る（「公開済みか」を確認するため）:

```bash
store-status          # 両ストアの状態と次の一手（書き込まない）
```

---

## 2. 新しい版を出したとき（推奨アップデートを出す）

ストアで**公開が開始されたら** `latest_version` を上げる。これだけで、古い版の
ユーザーに「後で」を選べる案内が出る。**ブロックはしない。**

```sql
update public.app_release_policies
set latest_version = '1.3.0',
    release_notes  = '{"en":"Faster search and dark mode fixes.","ja":"検索が速くなりました。ダークモードの表示崩れも修正しています。"}'::jsonb,
    updated_at     = now()
where platform = 'ios';
```

- `release_notes` は**任意**。無ければアプリ内の既定文言だけが出る。
- **ロケールキーは `PROJECT.md` の `locales` に揃える**（現在 `en` / `ja`）。
  無いロケールは `en` にフォールバックする。
- iOS と Android は**公開タイミングがずれる**ので、行は必ず別々に更新する。

### 「後で」の記憶

ユーザーが「あとで」を押すと、**その版を見送ったこと**が端末に残り、
**さらに新しい版が出るまで再表示されない**（`lib/dismissal.ts`）。
毎起動で出す設計にしないのは、読まずに閉じる癖がつくと本当に必要な強制アップデートも
同じ扱いをされるため。

---

## 3. 強制アップデートにする（`minimum_version` を上げる）

### 3.1 前提条件（**全部満たすまで実行しない**）

| # | 条件 | 確認方法 |
|---|---|---|
| 1 | その版が**ストアで公開開始済み**（審査通過だけでは不足） | `store-status` で iOS は `READY_FOR_SALE`、Android は該当 track が公開中 |
| 2 | `latest_version` が既にその版になっている | §1 の SELECT |
| 3 | **OTA では直せない**内容である | ネイティブ変更 / 権限変更 / SDK 更新のいずれか（`.claude/skills/app-update/` §8） |
| 4 | **審査中の新しい版が無い**、あるいは審査中の版がこの下限を満たす | `store-status` |
| 5 | 段階的公開（Play の rollout / iOS の phased release）が**完了している** | 途中だと、まだ受け取れないユーザーをブロックすることになる |

**条件 5 が最も見落とされる。** Play で 10% ロールアウト中に下限を上げると、
残り 90% は「更新しろと言われるが更新が降ってこない」状態になる。

### 3.2 実行

```sql
-- 例: 1.2.0 未満をブロックする（1.2.0 は公開済み・ロールアウト完了済み）
update public.app_release_policies
set minimum_version = '1.2.0',
    updated_at      = now()
where platform = 'ios';
```

**本番 DB への書き込みはユーザー承認が必要**（`.claude/rules/database.md`）。
エージェントが勝手に実行しない。

### 3.3 DB 側が止めてくれること

| 制約 | 止める事故 |
|---|---|
| `minimum_version <= latest_version` | **ストアに存在しない版の要求**（全員が更新しようがなくなる） |
| `^[0-9]+\.[0-9]+\.[0-9]+$` | `'1.2'` / `'v1.2.0'` / `'1.2.0-beta'` のような比較できない値 |
| `platform in ('ios','android')` | 行の取り違え |
| `store_url ~ '^https://'` | 誘導先の破壊 |

制約が `1.10.0 > 1.9.0` を数値として判定することも
`supabase/tests/app_release_policies_rls.sql` で固定してある。

### 3.4 元に戻す

```sql
update public.app_release_policies
set minimum_version = latest_version_that_was_fine, updated_at = now()
where platform = 'ios';
```

戻せば**次の起動またはフォアグラウンド復帰から**ブロックが解ける
（アプリは最大 5 分間隔で再判定する）。ただし**その間にアンインストールされた分は戻らない。**

---

## 4. 不具合版を出してしまった（ブロックする前に読む）

**`minimum_version` を上げるのは最後の手段。** 先に検討すること:

| 順 | 手段 | 条件 |
|---|---|---|
| 1 | **OTA（EAS Update）で直す** | JS / スタイル / 画像の問題なら。`expo-updates` を導入している場合 |
| 2 | **patch を上げて出し直し、`latest_version` だけ更新** | ブロックせずに更新を促せる |
| 3 | **Android: Play Console の Recovery tools / `apprecovery` API** | **コード変更不要**で特定 versionCode 範囲に更新プロンプトを出せる。ブロッキングではないが、閉じてもコールドリスタートのたびに再表示される。Play App Signing + AAB が前提 |
| 4 | `minimum_version` を上げる | 上記で対処できず、**古い版を動かし続けるほうが危険**なとき |

> iOS に 3 の同等手段は無い。

**同じマーケティング版の別ビルド（1.2.0 build 41 と 42）は区別できない。**
不具合版を止めたいときは **patch を上げて出し直す**。

---

## 5. 動作確認（ローカル）

`devenv up` でローカル Supabase を起動し、seed を流すと
`minimum_version = latest_version = app.json の版` の行が入る（＝何も出ない状態）。

```bash
devenv tasks run seed:all
```

挙動を試すときは**ローカルの行だけ**を動かす:

```sql
-- 推奨アップデートを出す
update public.app_release_policies set latest_version = '9.9.9' where platform = 'ios';

-- 強制アップデートを出す（latest も上げないと CHECK 制約に弾かれる）
update public.app_release_policies
set latest_version = '9.9.9', minimum_version = '9.9.9' where platform = 'ios';

-- 戻す
update public.app_release_policies
set minimum_version = '1.0.0', latest_version = '1.0.0' where platform = 'ios';
```

- 実機 / シミュレータで確認する（**Expo Go と web では判定が走らない** —
  `expo-application` が `null` を返すため、仕様どおりフェイルオープンする）。
- 画面そのものは Storybook でも見られる（`build-storybook` → `UpdateRequiredScreen` /
  `UpdateAvailableNotice`）。**強制画面に閉じる手段が無いこと**をここで確認する。

---

## 6. 新規プロジェクトで最初にやること（`mode: product` へ移すとき）

1. **`PROJECT.md`** の `distribution` を確定し、モバイル節の App Store ID / package name を埋める
2. **`store_url` を実物に差し替える**（seed のプレースホルダのままにしない）
   - iOS: `https://apps.apple.com/app/id<APP_STORE_ID>`
     （`APP_STORE_ID` は `scripts/mobile/config.env` の `APPLE_ASC_APP_ID` と同じ値）
   - Android: `https://play.google.com/store/apps/details?id=<package_name>`
3. 本番 DB に 2 行（ios / android）を入れる。**初期値は
   `minimum_version = latest_version = 最初に公開する版`**（＝何も出ない状態）から始める
4. リリースのたびに §2 →（必要なら）§3 を回す

---

## 参照

- 判断の正本: [`.claude/skills/app-update/SKILL.md`](../../.claude/skills/app-update/SKILL.md)
- 調査記録（一次情報の出典・未確認事項）: [`docs/_research/2026-09-06-force-update.md`](../_research/2026-09-06-force-update.md)
- リリース手順: [`docs/store/release-runbook.md`](../store/release-runbook.md)
- 審査要件: [`.claude/rules/store-review.md`](../../.claude/rules/store-review.md)

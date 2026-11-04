# OTA 更新（expo-updates / EAS Update）運用手順

JS とアセットだけの修正を、ストア審査なしでインストール済みアプリへ配る仕組み。
判断の正本は `.claude/skills/app-update/`（§8: OTA と強制アップデートの役割分担）。

## 構成（このリポジトリが入れたもの）

| 対象 | 内容 |
|---|---|
| `frontend/apps/mobile/package.json` | `expo-updates`（`expo install` で SDK 57 に合う版） |
| `frontend/apps/mobile/app.json` | `runtimeVersion: { policy: "appVersion" }`（公式推奨） |
| `frontend/apps/mobile/eas.json` | build profile ごとの `channel`（development / development-simulator / preview / production） |
| `scripts/mobile/update.sh`（`mobile-update`） | Doppler 注入 → `EXPO_PUBLIC_*` を EAS へ同期 → `eas update` |
| `frontend/policy/expo-updates.policy.test.ts` | 上記の配線が消えていないことの静的検査 |

更新の適用は `expo-updates` の既定動作に従う: **起動時に確認 → 取得 → 次回起動で適用**
（作業中のアプリを勝手に再起動しない）。

## 初回セットアップ（EAS プロジェクトごとに 1 回）

`updates.url` と `extra.eas.projectId` は **EAS プロジェクト固有の値**なので、
`mode: boilerplate` のリポジトリには置いていない。**この 2 つが無い間、expo-updates は
無効になり、埋め込みバンドルで動く**（公式: `Updates.isEnabled` は URL 欠落で false。ビルドは落ちない）。

`mode: product` へ切り替えるとき:

1. EAS プロジェクトを用意する（既にあるなら不要）。
2. `cd frontend/apps/mobile && EXPO_TOKEN=... bunx eas-cli update:configure`
   - `updates.url` と `extra.eas.projectId` が `app.json` に書かれる。**それを commit する**。
   - `runtimeVersion` は設定済みなので変更されない（`appVersion` のまま）。
3. **その後に**ストア用バイナリをビルドし直す。URL が焼き込まれていないバイナリは更新を受け取れない。

## 配信する

```bash
mobile-update production -m "fix: 〇〇の表示崩れ"   # channel: production（Doppler prd → EAS production）
mobile-update staging    -m "..."                   # channel: preview
mobile-update dev        -m "..."                   # channel: development
mobile-update production -m "..." --dry-run         # 同期されるキーを見るだけ
```

- SDK 55 以降、`eas update` は `--environment` が必須で、**EAS 側の環境変数だけ**を使う。
  ローカルの `.env` は読まれない。script が先に `EXPO_PUBLIC_*` を同期するのはこのため
  （同期漏れ → 更新後のアプリが起動直後にクラッシュ）。
- `-m` は必須。何を配ったか後から追えなくする運用を避ける。

## 戻す

```bash
cd frontend/apps/mobile && bunx eas-cli update:rollback
```

直前の更新を再配信し、無ければ埋め込みバンドルへ戻す。**不具合版の回収は OTA が第一手段**
（`docs/mobile/app-update-runbook.md` §4）。

## ⚠️ 守ること

| # | ルール |
|---|---|
| 1 | **リリース時は `app.json` の `version` を必ず上げる。** `appVersion` ポリシーでは、上げ忘れるとネイティブ変更を含む新バイナリと旧バイナリが同じ runtimeVersion になり、**非互換な JS が旧バイナリへ配られる** |
| 2 | OTA で配れるのは JS とアセットだけ。ネイティブコード・依存・権限・Expo SDK の変更は新バイナリ（`mobile-release-*`） |
| 3 | 新しい依存を入れた更新は、**その依存を含むバイナリが配布済みの runtimeVersion にだけ**出す |
| 4 | App Store 2.5.2: バンドル外から**機能を追加・変更するコード**を配ってはならない。修正・調整の範囲に留める |
| 5 | `eas update` の直接実行は禁止。資格情報は Doppler のみ（`mobile-update` を使う） |
| 6 | 強制アップデート（`minimum_version`）は OTA で直せないときだけ。OTA で直せるものを強制しない |

## 未確認事項

- `appVersion` と `autoIncrement` + `appVersionSource: remote` の併用: `runtimeVersion` は
  マーケティング版（`app.json` の `version`）だけを見て、EAS が管理するビルド番号は含まれない
  （公式 `eas update:configure` の説明）。実機での OTA 受信は、`eas update:configure` 済みの
  プロジェクトが無いため**まだ検証していない**。初回セットアップ後に preview ビルドで確認すること。

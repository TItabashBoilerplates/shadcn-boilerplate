# 依存関係のセキュリティ監査対応

2026-11-06。Bun1.4.4、Node24.22.1。元のfrontend監査は19件（high7 / moderate8 / low4）、Drizzleは0件。修正後の未フィルター監査はdeepmergeの1件（low）のみ。監査の重大度閾値・対象範囲は変更していない。

## 更新

| 依存 | 更新前 | 更新後 | 対応 |
|---|---|---|---|
| node-forge | 1.4.0 | 1.4.3 | 公式の追加セキュリティ修正と1.4.1のPEM Buffer回帰修正も取り込む |
| glob | 13.0.6 | 14.0.4 | AbortSignal中断の修正。Node24と既存のnamed APIに適合 |
| minimatch10 | 10.2.6 | 11.0.5 | `minimatch@^10` に限定したoverride。ESLint等が使うcallableな3.1.5は維持 |
| qs | 6.16.0 | 6.16.1 | 互換範囲内の修正版 |
| seroval | 1.6.9 | 1.6.11 | 互換範囲内の修正版 |
| systeminformation | 5.33.15 | 5.33.16 | 互換範囲内の修正版 |
| Expo | 57.0.28 | 57.0.32 | SDK57内のパッチ更新。関連モジュールはExpoの推奨バージョンへ |
| @expo/config | 57.0.10 | 57.0.11 | 上流がdeepmerge依存を除去 |

Bun公式の `audit fix` でまず16件を修正し、依存元の範囲に制限されるglob/minimatchは、実際の呼び出しAPIを確認して修正版へ限定した。古いminimatchまで一括でmajor更新していない。Expoの `install --fix` を使い、constants/linking/router/splash-screen/updatesもSDK57の推奨patchに揃えた。

Expo更新に伴う上流変更:

- xcode4はNode標準 `crypto.randomUUID()` を使い、uuid依存がなくなった。不要な `xcode>uuid` overrideを削除。実際のXcode ID生成の形式・一意性は引き続き検査する。
- Expo CLIのプラグイン検証は `@expo/schema-utils` に移り、MCP schema生成はZodを引数に取る。不要な `@expo/cli>zod` overrideを削除し、回帰検査を新しいAPIへ接続した。正常入力・不正な型・未知のフィールド・過大なコレクションの検査を維持した。

## 残るdeepmergeの検出

`GHSA-gcqx-w48m-w2h4` / `CVE-2026-93753` は、CVE公式記録で2026-11-02に **REJECTED**。理由は「セキュリティ脆弱性を記述していない」で、上流issueにも報告者の同意がある。npm/GitHubの監査フィードはまだこの棄却を反映していない。

Expo側の依存は除けたが、shadcnのCSSを使うためshadcnパッケージは必要であり、そこからdeepmerge4.3.1が残る。最新版shadcn4.23.0 / registry0.2.1にも同じ依存がある。監査のバージョン範囲を避けるだけの4.1.xへのdowngrade、別名への置換、CSS637行のコピーはしていない。

ユーザー承認に基づき、PROJECT.mdに根拠を記録したうえで `GHSA-gcqx-w48m-w2h4` の1件だけをfrontendのCI監査から除外した。他の重大度や将来のadvisoryは引き続き監査する。フィード訂正後に除外指定を削除する。未フィルターの `bun audit` は引き続きこの1件を表示する。

## 検証

- `expo-deps --check`: Dependencies are up to date。SDK58への変更はない。
- `build-frontend`: 成功。
- `unit-test`: 全体成功。Node cryptoとExpoの証明書/署名の相互運用、PEM Buffer読み込み、改ざんされた本文の検証失敗、globのAbortSignal、modern/legacy minimatch双方のAPIを確認。
- `mobile-export --platform ios`: 成功。ローカルのJS/assetバンドル生成のみで、実機のネイティブビルドや配布はしていない。
- `build-storybook` / `storybook-smoke`: 全171 stories成功。
- `ci-check`: 承認前は棄却済みdeepmerge1件だけで監査が失敗。1件だけの例外適用後は、監査・lint・format・型チェックの全体が成功。
- `frontend-pm` / `expo-deps` / `mobile-export` をdevenvの入口として追加し、依存操作・検証も固定toolchain経由で実行した。

## 一次情報

- [Bun audit fix](https://bun.com/docs/pm/cli/audit)
- [Bun update: transitive dependency更新](https://bun.com/docs/pm/cli/update)
- [Bun overrides](https://bun.com/docs/pm/overrides)
- [Expo公式の依存整合手順](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Forge公式1.4.3 changelog](https://raw.githubusercontent.com/digitalbazaar/forge/main/CHANGELOG.md)
- [CVE-2026-93753公式棄却記録](https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2026/93xxx/CVE-2026-93753.json)
- [上流issueの棄却確認](https://github.com/TehShrike/deepmerge/issues/273#issuecomment-6584747954)

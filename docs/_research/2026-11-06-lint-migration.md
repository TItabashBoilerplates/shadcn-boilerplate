# Oxlint 移行の実装結果

2026-11-06。Oxlint 1.91.0。性能値は全体の toolchain レポートを参照。

## 移行した範囲

- JS/TS の主 lint と Web/Mobile/Desktop の FSD 境界検査を Oxlint に移した。
- 元の有効 ESLint ルール・severity・options・settings の記録は [lint-rules.json](2026-11-06-lint-rules.json)。各アプリの TSX 代表ファイルを展開したもの。移行ツールは元の override も読んだ。
- 対応する React、Next、TypeScript、import、a11y の規則はネイティブルールを利用した。
- FSD は既存 boundaries v7 の JS plugin と既存のポリシーを再利用した。
- ネイティブにない React の no-deprecated、Hooks の config/gating、Next の no-location-assign-relative-destination、Mobile の import/no-unresolved、Expo の3ルールは JS plugin で保持した。
- jsx-uses-react/jsx-uses-vars は参照マーキング用で単独の違反診断を出さないため、Oxlint の JSX 解析へ委譲。no-dupe-args は構文解析の重複引数エラーで担保する。
- JSX require-render-return、import/export は移行ツールが既定で外す nursery 規則も明示的に有効にした。
- importType、barrel import 制限、img 制限の明示規則は Oxlint へ移した。import 整理は Biome assist として保持した。

## 統一できなかった範囲

**完全な単一 lint 化は未達。検査品質のため、次の互換ゲートを残した。**

1. Biome の既存 recommended ファミリーには exclusive / inspired 規則があり、名前だけの対応で同等性を保証できない。frontend/drizzle の Biome lint を残し、上記3規則など確認済みの重複を停止した。`noExplicitAny` は旧来の警告の扱いを保つため frontend では Biome が担当する。残存設定は各 biome.json が正本であり、全規則を Oxlint へ移したとは扱わない。
2. React immutability は Web/Mobile の1ルールだけを既存 ESLint 実装で検査する。Oxlint でアプリ全体を検査すると、現行 useAppUpdate.ts に存在しない `cancelled` の代入を指す診断が出た。元の ESLint は同じファイルで成功。元の plugin を Oxlint の JS bridge で呼んだ場合も差分を解消できず、限定した互換設定で保持した。

Oxlint の追加 correctness 規則が旧来の shared package に React Compiler 制約を新設しないよう、Compiler 専用規則を共通設定では無効にし、以前有効だったアプリだけで有効にした。native の no-useless-spread / no-new-array は sparse array の展開にも警告するため採用せず、従来の Biome 検査を維持する。

## 実行経路

- frontend の lint は Turbo の package タスクで分散する。policy / scripts / Storybook 設定も別途検査する。
- app の lint:fsd は従来と同様に app 全体の規則を含む。警告を失敗にする挙動を保持する。
- formatter と assist は `biome check --linter-enabled=false`。auto-fix は明示的な開発コマンドだけ。
- hook は変更ファイルを app ごとに分類し、同じ設定・cwd を使用する。設定変更時は全体を検査する。

## 境界検証

toolchain-lint test は一時ファイルを作成して後で削除し、3アプリそれぞれで以下を実行する。

- alias と相対パスによる上位層 import を拒否。
- 別 slice の import を拒否、同 slice と下位層 import を許可。
- workspace package import を許可。
- `@x` は現在の設定が明示許可を持たないため default-deny を保持。
- 未解決 alias は Mobile の import/no-unresolved が拒否。Web/Desktop は従来と同様、最終的な不明モジュール診断を型チェックが担う。

ルールの正例/負例を通すことと、現行コードが lint に通ることを分けて検証する。

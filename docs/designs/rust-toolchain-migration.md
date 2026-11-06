# Rust 製ツール移行方針

作成日: 2026-11-06。状態: 主要移行を実装。Oxlint の互換ゲートを保持（完全統一は未達）。
根拠: [調査記録・バージョン・一次情報](../_research/2026-11-06-rust-toolchain.md)。[実測結果・採用モード](../_research/2026-11-06-toolchain-performance.md)を参照。

## 1. 決定事項

目的は開発・検証の待ち時間とメモリ使用量を減らすこと。Rust 製の既存ツールを優先し、検査を減らして得た短縮は性能改善として扱わない。

ユーザーとの合意:

1. **JS/TS lint は Oxlint に統一することを第一目標とする。** 最初から ESLint を恒久併用する設計にはしない。
2. **Python 型チェックは ty へ移行する。** mypy との比較は採用可否の再審議ではなく、移行時の検査品質を確認するために行う。
3. tsrs は TS 型チェックの優先移行候補。通常モードと fast の診断・性能を比較し、採用モードを確定する。
4. formatter は Biome / Ruff を継続する。Oxlint 統一の対象は JS/TS lint。Python、Edge Functions の専用検査はそれぞれ維持する。
5. すべての実行経路は devenv に集約し、CI・hooks・エディタの担当を揃える。

本書によって実装の変更点を指定する。現行ルール・AGENTS.md の Biome lint / mypy の記述は移行完了と同じ変更単位で更新する。boilerplate の PROJECT.md にあるプロダクト未決定事項は本件で埋めない。

## 2. 目標構成

| 領域 | 移行後の担当 | 採用条件・境界 |
|---|---|---|
| JS/TS lint | Oxlint | Web / Mobile / Desktop / 共有 packages / tooling / policy / drizzle / 自作 scripts を対象にする |
| FSD 境界 | Oxlint + 既存 boundaries JS plugin | ネイティブ同等ルールがなければ既存 plugin を再利用。resolver・settings・警告も検証 |
| JS/TS/JSON format | Biome | linter を停止。import 整理は assist として明示的に保持し、format check と分けて検証 |
| TS 型チェック | tsrs（移行検証後） | 型・生成宣言を含む従来の全対象。検証中は TS7 を正規ゲートとして維持 |
| Python 型チェック | ty | Python 3.14、workspace の依存・src-layout を正しく解決する |
| Python lint / format | Ruff | ty と合わせて注釈必須等を担保。現行規則を棚卸しして不足だけ補う |
| Edge Functions | Deno lint / fmt / check / test | Deno 固有の解決・権限・生成物の扱いを維持 |
| 単体テスト | Vitest / Bun test / pytest / Deno test | ランナー変更より環境生成・重複・並列実行を改善 |
| Web / Desktop のバンドル | Turbopack / Vite 8 | 既存の Rust 系構成を継続 |
| hooks / タスク | prek / devenv / Turbo | JS package 内の仕事は Turbo、言語横断の統括は devenv |

Oxlint は formatter ではなく、tsrs は JS 実行環境ではない。Bun は Rust 製ではないが、Rust 製への統一だけを理由に撤去しない。

## 3. Oxlint への lint 統一

### 3.1 対象と設定の配置

- 共通の `.oxlintrc.json` をリポジトリルートに置き、framework ごとの overrides と最小の子設定で差を表す。frontend の node_modules で解決される plugin は依存の配置と設定の解決基準を一致させる。checkout の絶対パスは埋め込まない。
- frontend の各 package のタスクは package.json に置き、ルートは `turbo run` へ委譲する。drizzle は既存どおり独立 project として devenv から実行し、Oxlint の版は frontend と揃える。
- root/scripts 用タスクを設ける。supabase/functions、外部 skills、vendor、ビルド成果物は所有者を分けて除外する。既存対象と追加対象を移行表に列挙する。
- 生成 TS の lint 除外と型チェック対象は分離する。lint 除外を型チェックの全体除外に流用しない。

### 3.2 移行表を先に完成させる

devenv 内の一時調査タスクで、Next / Expo / desktop の有効 ESLint ルールと Biome の継承・overrides を展開する。代表ファイルごとの違いも記録する。

移行表には「元ルール・severity・options・対象・例外・移行先・違反 fixture・検証結果」を記載する。未対応を成功扱いにしない。

特に次を検査する:

| 現在の要求 | 移行時の確認 |
|---|---|
| Biome recommended 各カテゴリ | ルール名だけでなく検出する振る舞いを照合 |
| useImportType | 型専用 import、inline 型指定、自動修正形式 |
| noRestrictedImports | UI の barrel import 禁止を保持 |
| noImgElement | Web / Mobile / 汎用 JSX の対象差を維持 |
| useExhaustiveDependencies | severity、対象 glob、useSupabaseQuery の明示例外 |
| noExplicitAny | 現在の警告と CI の警告上限の扱い |
| organizeImports | formatter と別の assist。順序整理を無言で削除しない |
| Next / Expo preset | import 解決、React、Hooks、a11y、環境 globals、framework 固有の規則 |

### 3.3 FSD と統一判定

まず Oxlint の JS plugin 機構で既存 `eslint-plugin-boundaries` を動かす。既存ポリシーを再利用し、独自の import 解析器は書かない。JS plugin の利用も Oxlint という単一実行系への統一に含む。

Web / Mobile / Desktop それぞれについて、上位層 import、別 slice import、同 slice の許可、@x の規則、shared segment、app entry、`@/`・相対・workspace alias を含む有効/無効 fixture を用意する。未解決 alias が external 扱いで検査を通過しないことを確認する。

統一の完了条件は、移行表の全要求に対応があり、負例が検出され、正例が通ること。全アプリで正規 lint が通るだけでは完了としない。

未対応があれば、欠落規則・再現例・ネイティブ/JS plugin の代替可否を報告する。解決まで当該規則の既存ゲートだけを移行途中として残す。恒久例外や独自 Rust 実装を無断で増やさない。

統一後は ESLint CLI / 旧設定 / 不要な parser・resolver・preset / Biome lint を削除する。boundaries が必要とする依存は残す。TS6 の API 依存は ESLint 以外（生成ツール、Storybook、Next 等）も確認してから削除を判断する。

## 4. tsrs と型付き lint

### 4.1 CLI 型チェック

- 検証版は tsrs `0.22.0-ts7.1.0-beta` を起点とし、実装時に再確認して完全固定する。自動で latest を取得しない。
- 比較対象は現行 TS7.0.2 と、tsrs の参照 TS7.1 beta を分ける。現行との差は上流変更か移植差かを分類する。
- 各 package と drizzle を明示的に検査する。root tsconfig の references だけを `--noEmit` に渡して全体検査が済んだと判断しない。
- 既存の workspace-tsc の呼出箇所を移行の接点にする。恒久的に汎用 compiler selector を作らず、採用後は単一の既定経路にする。未インストール/失敗時に別 compiler へ黙って fallback しない。
- 通常モード、fast、既存 compiler の incremental cache は別領域で測定する。版・モード切替時は不適合な buildinfo を再利用しない。
- fast は実コード・型エラー fixture・増分更新の診断を評価して選ぶ。通常モードで要件を満たす場合は、fast 未採用でも移行を進められる。
- Next build 内部の型チェックや Next の language service は別経路として扱う。速度向上だけを理由に `ignoreBuildErrors` を設定しない。

### 4.2 Oxlint との統合

初期導入は Oxlint lint + tsrs type-check の分離実行。両者を検証した後、tsrs-lint を Oxlint の型解析に接続する統合経路を比較する。

標準の型付き lint は tsgolint（Go）を使う。Rust 経路の候補は tsrs 0.22 の release に記載された `OXLINT_TSGOLINT_PATH` / fast preset による接続であり、対応版をセットで固定する。これは設定の候補で、動作確認済みという意味ではない。

統合の条件:

- standalone と同じ tsconfig 集合、生成宣言、Oxlint 非対象 TS の型診断を検査する。
- tsconfig 外のファイルに lint がかかることと、型が検査されることを区別する。
- 重複 tsconfig の解析増加、メモリ、wall time を分離実行と比較する。
- 同じ検査内容で改善した場合だけ統合し、単独型チェックの重複を削除する。

Oxlint に lint を統一することと、型チェックも一度の実行にすることは別の完了条件とする。

## 5. ty への Python 型チェック移行

ty は採用済みの方針。実装時に `0.0.98` を起点として版を再確認し、dev dependencies と uv.lock に固定する。

- 設定の正本は backend-py/pyproject.toml の `[tool.ty]`。Python 3.14 と apps/api/src、apps/mcp/src、packages/core/src、workspace 依存を解決する。
- 現在の mypy が検査する production src をすべて含める。テストを型検査に追加する変更は別に扱い、移行前後の性能比較の対象を揃える。
- devenv の既存 type-check-backend-py を維持して中身を ty にする。workspace の全依存が必要な呼出は `uv run --all-packages` の方針を維持する。
- mypy strict の各要求を ty + Ruff にマッピングする。Ruff は既に ALL を選んでいるため、規則を重複追加せず、有効/ignore/preview の実際を確認する。
- `ignore_missing_imports=true` を機械的に移植しない。未知 import、Any、注釈なし関数、decorator、override、Optional、generic の検査を負例で確認する。
- Pydantic/SQLModel、FastAPI decorators、async、共有パッケージ、生成 entity を検証する。型検査の都合で生成物を手編集しない。
- 真のエラーは修正し、差分を隠す baseline や全体 ignore は導入しない。ty/Ruff で埋められない規則があれば再現例と対処案を示す。
- 切替完了時に mypy の依存・設定・hook を削除し、ty hook とエディタを配線する。Pyright/Pylance との診断重複も整理する。

比較用 mypy は移行 PR の検証に限定する。永続的な二重型チェックを目標にしない。ty で未対応の重要検査が判明した場合は、品質差を黙認せずその移行部分を未完了として報告する。

## 6. タスク・キャッシュ・テスト

### 実行経路

既存の lint / format / type-check / ci-check / unit-test を外側の入口として維持する。CI は ci-check と unit-test を呼び、個々の検査一覧を YAML に複製しない。auto-fix は明示的な開発コマンドだけとし、CI と hook は非変更モード。

- Biome check による lint+format 二重実行を分離し、format と import assist の担当を明示する。
- frontend 全体の型チェックが Mobile を含むことを確認したうえで、ci:check の Mobile 重複を削除する。個別コマンドは残す。
- lint-fsd は移行中の入口として残せるが、正規全体 lint で同じ規則を二度走らせない。
- ルールの JS 設定、package.json、lockfile、共有設定、Python tests、生成入力、devenv の wrapper 変更をキャッシュ入力に含める。設定だけの変更で再実行されることを試験する。
- execIfModified が大きな node_modules/target を走査しないことも確認する。Turbo 内側の cache が正しくても外側が誤 skip すれば検査されない。
- CI の Turbo cache は OS/ツール版/lockfile を区別して追加する。既存 node_modules exact-key 方針と `.devenv/` 非保存方針を維持する。リモート cache サービスは追加しない。
- security audit は外部 advisory の更新に依存するため、ソース未変更を理由に省略しない。

### テストの高速化

- Vitest は node を既定にし、既存 DOM テストのみ jsdom + DOM matcher setup を指定する。テストの削除や isolation の一括無効化はしない。
- unit-test の各言語群は devenv task の DAG で並列化する。全子タスクの終了を待ち、一件でも失敗すれば非ゼロを返す。
- 外側の同時実行数と Vitest 等の worker 数を一緒に調整する。CI runner と開発 Mac は別々に計測する。
- ユーザーの追加指示により pytest-xdist 3.8.0 を導入。並列優先で既定2 worker、AI が標準の `-n` / `--maxprocesses` で実行ごとに調整する。現状58件では直列の方が速かった測定結果も保存する。
- Storybook の既存並列 smoke、Maestro、pgTAP は継続する。UI 変更時の描画検査を削減しない。

## 7. 開発・デバッグ環境

Biome format、Oxlint diagnostics/fix、ty diagnostics をエディタの各担当に設定する。TS の LSP は CLI 移行と別に評価し、Next plugin・定義ジャンプ・rename・auto-import を確認して tsrs または公式 native LSP を選ぶ。formatter を複数同時に起動しない。

現行 watchfiles を継続し、Python の reload 監視を必要な src に絞れるか計測する。uvicorn の exec / signal 伝播設計を保つ。debugger の一律置換、Expo Metro/Babel の非公式置換、独自 Rust backend 化は本計画に含めない。

Desktop minifier の Oxc 既定化は別差分とし、esbuild 指定の意図を確認してから行う。sccache/nextest は Rust 本体の build/test が律速と分かってから検討する。

## 8. 測定・受入基準

最初に benchmark 用 devenv タスクを追加する。既存機能で集計し、大きな独自 benchmark framework を作らない。

| 測定 | 条件 |
|---|---|
| ツール単体 | セットアップ・install を時間外にし、タスク結果 cache を迂回。cold は compiler の永続 cache なし、warm はあり。OS page cache の強制 purge はしない |
| 開発者の全体待ち時間 | devenv shell 起動、ci-check、unit-test、dev server ready を別々に記録 |
| 増分 | production src、共有型、設定、テスト、削除/rename の各変更を別々に確認 |
| 反復 | 1回 warm-up 後、同じ snapshot を交互に5回以上。中央値・範囲・最大メモリ・終了コードを保存 |
| 記録 | OS/CPU/RAM、版、対象ファイル、cache 条件、worker 数、実コマンド、診断差分 |

測定は専用の一時 fixture/コピーで行い、ユーザー変更や生成物を上書きしない。通信・DB を要する検査は条件を別記する。

受入条件:

1. lint 移行表の要求、FSD 負例、型エラー負例を満たし、既存検査対象を落とさない。
2. auto-fix 後に再実行して差分が増えず、import assist と競合しない。
3. CI・hook・CLI の版・設定・対象が一致し、失敗/シグナルが非ゼロで伝わる。
4. 個別変更後と統合後に devenv の適切なチェックを行い、ci-check / unit-test を確認する。既存 security audit の失敗は PROJECT.md の既存例外に従って分けて報告し、成功へ改変しない。
5. pytest-xdist の既定並列化は、実測で遅くなっても並列を優先するというユーザー選択に従う。それ以外の性能改善の推奨目標は対象タスクの中央値15%以上。必須の移行方針を自動取消する閾値ではなく、未達なら原因と保守量/メモリの利点を示す。全体10%以上の悪化や OOM があれば構成・並列数を修正してから完了する。
6. 実装完了時の測定結果を調査記録へ追記する。公表 benchmark を実測結果として転載しない。

## 9. 実装フェーズと切り戻し

| フェーズ | 変更単位 | 終了時の成果物 |
|---|---|---|
| P0 | 測定入口・lint 移行表・型/FSD の検査 fixture | 現状値、全対象、ルール対応表。既存コードの無関係な不整合は別記 |
| P1 | Oxlint 導入・全ルール移行・Biome format 化 | 統一可否の証拠、単一 lint 経路。未対応は具体的に報告 |
| P2 | ty + Ruff、hook・エディタ・文書更新 | mypy 撤去、Python 品質ゲートの移行完了 |
| P3 | tsrs CLI | 通常/fast の採用モードと診断・性能比較、旧比較経路の撤去 |
| P4 | Oxlint + tsrs 統合評価 | 分離/統合の測定結果、速い方の単一正規経路 |
| P5 | テスト環境・並列数・CI cache・LSP | 全体の再測定、CI/hook/CLI の一致、使い方の更新 |

各フェーズは個別にレビュー・revert 可能な変更単位にする。設計タスクでは commit・導入・本番操作を行わない。

切り戻しは該当変更の通常の revert と lockfile の復元で行い、旧経路の feature flag を恒久維持しない。compiler cache は版・モードで分離する。ty は採用方針を維持しつつ、不具合時は問題の更新を戻して修正する。新 compiler が失敗したとき別 compiler の成功を返す fallback は禁止する。

## 10. 変更対象と完了時の整理

- `devenv.nix`: タスク、hook、cache 入力、測定・並列統括。Nix が供給する formatter と Bun/uv が供給する CLI の版ずれも解消する。
- `frontend/{package.json,bun.lock,turbo.json,biome.json,vitest*}`、各 package/app の scripts、既存 tooling/tsc・tooling/eslint。
- `drizzle/{package.json,bun.lock,biome.json}`、root `biome.json`、Oxlint 設定。
- `backend-py/{pyproject.toml,uv.lock,pyrightconfig.json,AGENTS.md}`、型検査 fixture。
- `.github/workflows/ci.yml`、`.vscode/{settings,extensions}.json`。
- `AGENTS.md`、`.claude/rules/commands.md`、関連する backend/frontend 規約、devenv-cicd/dev-check の案内、各 README。ツール名を規則として検査する policy test も対象とする。
- 生成された hook/MCP/型ファイルは手編集せず正本から再生成する。旧依存は利用者を確認して削除し、死んだ設定や比較専用 wrapper を残さない。

DB・公開 API・認証・課金・ストア配布の変更はない。追加 SaaS、リモート秘密情報、ランタイムの書き換えも不要。

## 11. 実装結果（2026-11-06）

- Oxlint 主 lint、ty、通常 tsrs、pytest-xdist（既定2 worker）、node 既定の Vitest、devenv のテスト DAG、CI Turbo cache、editor 設定を実装。
- Oxlint 完全統一の残件と、Biome / ESLint を残した具体的理由は [lint 移行結果](../_research/2026-11-06-lint-migration.md) に記録。無検証の完全移行とは扱わない。
- tsrs fast / 型付き lint 統合は正規経路に採用していない。Next の editor plugin 用 TS6 も保持。
- [性能比較](../_research/2026-11-06-toolchain-performance.md)に、改善・悪化・計測条件・再測定手順・品質確認の結果を保存した。

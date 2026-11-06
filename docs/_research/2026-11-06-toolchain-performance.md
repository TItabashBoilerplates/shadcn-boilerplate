# 開発ツール移行の実測結果

2026-11-06。設計: [移行方針](../designs/rust-toolchain-migration.md)。
根拠となる全 sample・実行コマンド・終了コード: [測定データ](2026-11-06-toolchain-performance.json)。
Oxlint の互換ゲート: [lint 移行結果](2026-11-06-lint-migration.md)。

## 環境と測定条件

- Apple M5 Max / 64 GiB / macOS 27.0.1 / arm64。devenv 2.4.0。
- Node 24.22.1、Bun 1.4.4、Python 3.14.7、uv 0.12.22。
- 基準コミット: `f998e2c002ae35c349ab3b6a7041749387118c81`。移行前は変更前の lockfile と設定で測定した。
- 1回 warm-up 後、各条件を5回測定し中央値を使用。auto の pytest だけは参考値として1回。
- install と devenv shell のセットアップ時間は対象外。OS の page cache は purge していない。
- compiler cache なしの比較は13個の実在 tsconfig（drizzle を含む）を同じ順序で直列実行。composite の制約に対応するため、各実行に新しい一時 `.tsbuildinfo` を割り当てた。
- Turbo 比較は `--force` でタスク結果 cache を迂回し、compiler の増分 cache は維持。上記13 project の直列比較とは別の指標。
- lint の同等範囲比較には format と import assist を含めた。旧設定は Biome CI と3 app の ESLint の中央値の和、新設定は Turbo 強制 lint + format-check の連続実行。
- 監視プロセス等がある開発用 Mac での逐次比較で、隔離した CI runner の交互測定ではない。範囲と raw sample も確認し、別マシンに同じ倍率を約束しない。
- プロセス負荷の大きい状態で lint + format が約7秒になった試行も保存した。別プロセスの CPU 負荷を確認した後に再測定した結果を主表とし、遅い試行を通常の性能値として混ぜない。

## 比較結果

| 対象 | 移行前 | 移行後 | 短縮率 |
|---|---:|---:|---:|
| Frontend lint + format + import assist（task cache なし） | 3.347s | 2.483s | 25.8% |
| TS 型チェック（13 project・compiler cache なし） | 1.362s | 0.597s | 56.2% |
| TS 型チェック（Turbo 強制・compiler cache あり） | 0.993s | 0.696s | 30.0% |
| Python 型チェック（再実行） | 0.179s | 0.115s | 35.9% |
| Frontend 単体テスト | 2.667s | 2.073s | 22.3% |

lint だけの新構成は、Turbo 強制で2.110秒、task cache が有効な再実行で0.236秒だった。これを旧 Biome 単体の0.107秒と直接比較していない。検査範囲が異なるためである。

個別の `lint-fsd` 相当の直列3 app 実行は、3.240秒から3.761秒へ遅くなった。JS plugin / compatibility gate の起動を含む。CI ではこの直列タスクを重ねて呼ばず、Frontend の並列 lint に統合する。

Frontend テストは47ファイル・525件成功、既存4件 skip を維持。DOM が必要な2ファイルだけ jsdom とし、それ以外を node にした。画像ポリシーの検査は Biome 設定から移行先の Oxlint 設定へ変更し、error を要求する条件は維持した。

## TypeScript の実装とモード

| compiler | 13 project の中央値 | 測定中の最大 peak RSS |
|---|---:|---:|
| TypeScript 7.0.2 | 1.362s | 約492 MiB |
| TypeScript 7.1.0-beta | 1.360s | 約327 MiB |
| tsrs 0.22.0 通常モード | 0.597s | 約155 MiB |
| tsrs 0.22.0 fast | 0.592s | 約170 MiB |

**通常モードを採用した。** fast の差は約0.005秒で、この測定ではメモリも増えている。fast 固有の診断差を受け入れる理由にはならない。

RSS は `/usr/bin/time` の child resource 情報を用いた指標で、並列 worker のメモリを足したプロセスツリー全体の peak ではない。特に Turbo / xdist の全体メモリと同一視しない。

Oxlint + tsrs-lint の `--type-aware --type-check` も試した。既存で有効にしていなかった型付き規則の診断（await-thenable、no-floating-promises 等）が追加されるため、同じ検査集合での置換としては採用していない。現時点は Oxlint と通常 tsrs の分離実行を正規経路とする。

## pytest-xdist

pytest 9.1.1 / pytest-xdist 3.8.0。すべて58件成功。設定以外のテスト変更や skip は追加していない。

| 設定 | wall time 中央値 | 反復 |
|---|---:|---:|
| `-n0` | 2.086s | 5回 |
| `-n2` | 2.873s | 5回 |
| `-n4` | 3.164s | 5回 |
| `-n auto` | 3.361s | 1回・参考値 |

この小規模スイートでは worker 起動・collection が勝ち、2 worker でも直列より約37.7%遅い。**ユーザーは結果を確認したうえで並列優先を選択したため、既定は `-n2` とする。** 速度向上したとは報告しない。

AI エージェントは CPU、RAM、テスト内容、外側の並列ジョブ数を見て実行ごとに選べる。

```bash
test-backend-py                         # 既定: 2 workers
test-backend-py -n 4                    # worker 数を明示
test-backend-py -n auto --maxprocesses 4 # 自動選択に上限を設定
test-backend-py -n 0                    # デバッグ時の直列実行
```

外部 DB 等を使うテストを追加する際は worker_id / testrun_uid 等で共有資源を分離する。現在のテストはプロセス内状態を使い、実 DB へ接続しない。

一次情報: [worker 数と配分](https://pytest-xdist.readthedocs.io/en/stable/distribution.html)、[共有資源の扱い](https://pytest-xdist.readthedocs.io/en/stable/how-to.html)、[3.8.0 release](https://github.com/pytest-dev/pytest-xdist/releases/tag/v3.8.0)。

## 採用した構成と制約

- Oxlint 1.91.0 を主 lint に採用。FSD は同じ boundaries policy を再利用。
- Oxlint への完全統一は未達。Biome の残る recommended 規則と Web/Mobile の ESLint immutability 1規則を保持。元の検査を落として統一済みとはしない。
- ty 0.0.98 に移行し、mypy を削除。検出された4診断を production source で修正し、新しい抑制を追加していない。
- tsrs は完全固定、別 compiler へ黙って fallback しない。TS6 は Next / API 利用者のため保持。
- VS Code の Oxlint / ty / Ruff を配線。Next の言語サービス plugin を維持するため、TypeScript の editor SDK は TS6 を保持し、CLI の tsrs とは区別した。IDE 操作の体感速度は未計測。
- unit-test は言語別タスクを並列化。toolchain contract は設定・ツール変更時に再検証する。CI の Turbo cache は追加したが、リモート runner での速度は未測定。

## 再測定

```bash
DOPPLER_SKIP=1 devenv shell -- bench-toolchain /tmp/toolchain.json \
  --case frontend-quality-uncached --case typescript \
  --case python-types --case frontend-tests
DOPPLER_SKIP=1 devenv shell -- bench-toolchain /tmp/compiler.json --case typescript-cold
DOPPLER_SKIP=1 devenv shell -- bench-toolchain /tmp/pytest.json \
  --case python-tests-serial --case python-tests-2 --case python-tests-4
```

出力 JSON と同じディレクトリに各実行のログを保存する。いずれかの測定コマンドが失敗したら benchmark 自体も非ゼロで終了する。移行前の再現には、別 worktree に基準コミットの依存・設定を準備し、raw JSON の command/cwd と測定コードを使用する。

## 検証

本番 build、単体テスト統括、FSD の正例/負例、tsrs の strict 診断・増分更新・終了シグナル、ty/Ruff の型検査 contract を実行した。

`ci-check` の security audit は **19件（high 7 / moderate 8 / low 4）で失敗**。PROJECT.md に記録された boilerplate の扱いに従い、監査を除外・成功扱いに変更していない。各 lint / format / type-check と監査の結果を分けて報告する。

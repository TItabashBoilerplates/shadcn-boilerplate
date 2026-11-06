# Python の起動・依存キャッシュ最適化

2026-11-06。Python 3.14.7 / uv 0.12.22 / pytest 9.1.1 / xdist 3.8.0、Apple M5 Max・64 GiB。追加の実行時依存なし。

## 採用した変更

- Docker の先行 `uv sync --frozen --no-dev --no-install-workspace` にも `--package api` を指定。virtual workspace root には本番依存がないため、後段の api 用依存を先行層へ入れる対象指定が必要だった。後段の `--locked --no-dev --no-editable --package api` は維持。
- devenv の依存同期時だけ `--compile-bytecode` を指定。`uv run` ごとにはコンパイルしない。本番 Docker は以前から `UV_COMPILE_BYTECODE=1` 済み。`PYTHONDONTWRITEBYTECODE=1` は維持し、生成済みの依存 bytecode を読む。
- pytest は `--disable-plugin-autoload` と `-p` で xdist / asyncio / mock / cov を明示。導入済みだが未使用の anyio plugin と xdist.looponfail の自動読込を省いた。pytest 本体の組込み plugin は維持。flag の導入版に合わせ `minversion=8.4`。
- GitHub Actions の主要2ジョブに uv の依存キャッシュを追加。Nix 提供 uv を使い、setup-uv を二重導入しない。OS/arch/lockfile をキーに `/tmp/uv-cache` を保存し、成功時に `uv cache prune --ci`。venv と `.devenv` はキャッシュしない。

Granian への置換は見送った。現状の HTTP route はヘルスチェックのみで、実際のアプリ処理の改善を示せないため、Uvicorn を維持した。

## 比較

全58テスト、同じ2 worker。1回の warmup を除外した5回の中央値。uv 起動・pytest collection・worker 起動を含む wall time。Docker build / CI / 他エージェントの重い検証は全計測後に開始した。生データは [JSON](2026-11-06-python-startup-performance.json)。

| 構成 | 中央値 |
|---|---:|
| 変更前：bytecodeなし・plugin自動読込 | 2.577秒 |
| bytecodeなし・plugin明示のみ | 2.445秒 |
| bytecodeあり・plugin自動読込 | 1.625秒 |
| 採用：bytecodeあり・plugin明示 | **1.443秒** |

今回の中央値では合計 **44.0%短縮**。各段階は直列に測定しており、外部負荷の揺れまで統制した倍率ではない。peak RSS は親子プロセス全体のメモリ合計ではない。

採用後に4 workerもwarmup+5回で再測定し、中央値1.334秒だった。このマシンでは追加候補になるが、CPU・メモリの異なるCIまで一律に増やさず、既定2 workerを維持し、エージェントが必要に応じ `-n4` 等で選ぶ。

測定開始時の site-packages は2,401 `.py` / 0 `.pyc`。最初の compile 対象は2,401ファイル、compile463ms、uv sync 全体約560ms。再実行の sync は1回参考値426ms。生成された `.pyc` 合計は40,488,220 bytes（約38.6 MiB）。依存導入時の時間・ディスク量増加と引き換えに、繰り返し起動を短縮した。

## 互換性・コンテナ検証

- `test-backend-py --cov=apps/api/src/api --cov=packages/core/src/core ...`: 全58件成功、coverage出力成功（274 statements / 104 missing、62%）。coverage閾値の変更や新しいskipはない。
- 一時的な追加テストで、async coroutine の実行と `mocker` fixture が2 worker・strict-config/strict-markersで動作することを確認（2件成功）。
- `test-api-container`: 実 Dockerfile のソース COPY 前までをビルド。API 用の外部依存47パッケージが入り、fastapi/supabase/sqlmodel/uvicorn が存在し、api/core/mcp は未インストールであることを確認。
- 続いて本番 Dockerfile 全体をビルドし、先行依存の RUN が `CACHED`、後段の追加インストールが api/core の2パッケージだけになった。非root・system-only PATH・非特権ポート制約下で `/healthcheck` が200を返した。テスト用コンテナ・image tagsは後始末済み。
- Docker 初回は apt/ネットワーク取得を含むため、ビルド速度の倍率は出していない。CI の cache 保存・復元にかかる時間もリモート runner 上では未測定。
- GitHub Actions自体のリモート実行は未実施。workflowの変更は公式context表と手動レビューで確認した。actionlintは環境にないため未実施。
- GitHub の context availability と照合。job-level env では runner context を使えないため、UV_CACHE_DIR は固定パスとした。
- `uv-cache-prune` は分離した空キャッシュで成功。通常のローカル uv cache は削除していない。
- `ci-check`: lint / format / 型チェック成功。既存 frontend 依存の監査19件で全体は失敗（high7 / moderate8 / low4）。監査抑制は追加していない。
- `build-frontend`: 全5タスク成功、cache hitなし。`unit-test`: backend / frontend / drizzle / functions / toolchain が成功。

## 再実行

すべて devenv shell 内で実行する。

```bash
bench-toolchain /tmp/python.json --runs 5 \
  --case python-tests-autoload --case python-tests-2 --case python-tests-4
test-backend-py --cov=apps/api/src/api --cov=packages/core/src/core --cov-report=term-missing
test-api-container
```

`python-tests-autoload` は `addopts` だけを上書きして旧 plugin 自動読込を再現する。インストール済み `.pyc` は消さないため、これだけでは「bytecodeなし」の旧条件は再現しない。完全な比較には別の使い捨て venv を使う。既定2 worker、`-n N` / `-n auto --maxprocesses N` でエージェントが選ぶ運用は維持する。

追加 plugin は root の `addopts` に登録する。一時的な追加は `test-backend-py -p anyio.pytest_plugin`、loop-on-fail は `test-backend-py -p xdist.looponfail --looponfail` のように明示する。

## 一次情報

- [pytest: plugin loading](https://pytest.org/en/stable/how-to/plugins.html#disabling-plugins-from-autoloading)
- [uv: Docker / bytecode / workspace layers](https://docs.astral.sh/uv/guides/integration/docker/)
- [uv: workspace root と --package](https://docs.astral.sh/uv/concepts/projects/workspaces/)
- [uv: GitHub Actions manual cache](https://docs.astral.sh/uv/guides/integration/github/#caching)
- [uv: CI cache pruning](https://docs.astral.sh/uv/concepts/cache/#caching-in-continuous-integration)
- [GitHub: context availability](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#context-availability)

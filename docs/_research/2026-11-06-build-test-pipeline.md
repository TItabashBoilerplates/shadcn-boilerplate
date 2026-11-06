# ビルド・テストの待ち時間改善

2026-11-06。Node24.22.1 / Bun1.4.4 / Turbo2.11.7 / Vitest5.0.4、Apple M5 Max・64 GiB。追加依存・クラウドサービスなし。全サンプル・終了コードは [JSON](2026-11-06-build-test-pipeline.json)。

## 採用した変更

- ツールチェーンの3検証を devenv の独立 task とし、`after` で並列実行。各検証を個別にキャッシュし、どれかが失敗したら集約も失敗する。
- quality task の入力を JS / Drizzle / Python / Deno / Terraform の依存に合わせた。Python lockfile の変更で JS 検査を、frontend lockfile の変更で Python 検査を失効させない。devenv.nix / lock / yaml の変更は引き続き全体を再確認する。
- Turbo の global runtime hash を Node/Bun の Nix derivation から作り、Python・OCI等の設定編集で JS の成果物を失効させない。root Oxlint policy は lint task 専用 hash に分離。共有runtimeの変更では全taskを失効させる。
- 個別FSD検査の入力に app tsconfig を追加。alias変更で検査結果が変わる場合の、既存のキャッシュ失効漏れも閉じた。
- Turbo の build / dev / type-check から `generate` 依存を外した。Git追跡された型・SDKを入力にし、API/DBの変更時は既存の `model:frontend` 等で明示再生成する。devenv のサービス起動時の model scheduling は変更していない。
- 型検査は公式 Transit Node パターンで、依存変更時の失効を維持しながら並列化。生成物の手編集や型検査対象の削減はしていない。
- Storybook build を実際の出力 `storybook-static/**` を持つ Turbo root task にした。既定入力には `.storybook`・Web/Mobile/Desktop・共有UI等のソースが含まれる。
- CI の ci-check / Storybook job で Turbo artifact cache を共有復元する。保存keyはproducer job別、復元prefixは共通。`TURBO_CACHE_DIR` と actions/cache の保存先を一致させ、Turbo未使用のunit-test jobから不要な転送を削除した。
- キャッシュ対象のSupabase環境変数を、実装どおり `PUBLISHABLE_KEY` に修正。Desktop のdebug/prodを混ぜないよう `TAURI_ENV_DEBUG` をDesktop buildの入力に追加。Nextの `.next/dev` は本番成果物から除外。
- `test-frontend` はCLI引数を転送し、AIエージェントが標準の `--maxWorkers` 等を使えるようにした。

tokensの生成物 `web.css` / `native.css` は元からpackage固有の設定で正しくキャッシュされていた。Git worktree間のローカル共有もTurboの既存機能だったため、新規改善として数えていない。

## 実測

devenv shellが初期化済みの状態で測定し、最初のshell/Nixセットアップ時間は含まない。warmup1回を除外。検証3系統とVitestは各5回、強制buildとStorybookは各3回。エージェント同士の重い測定は重ねていないが、外部Node/Bun/FSEvents/duの負荷は統制できていない。

| 対象 | 比較元 | 採用後 / cache hit |
|---|---:|---:|
| 検証3系統の強制再実行 | 直列10.910秒 | 並列9.598秒（約12%短縮） |
| Storybook build | 強制14.541秒 | 再利用0.165秒 |
| Web等の全build・強制再実行 | 変更前5.593秒 | 変更後5.533秒 |

最後の全buildはcompiler filesystem cacheがwarmの条件。差は測定の揺れの範囲で、コンパイラ自体が明確に高速化したとは扱わない。以前のgeneratorはAPI不在を即検出し既存生成物を再利用していたため、今回の条件で毎回5秒待っていたわけではない。

最終構成のbuild条件別の参考値（各1回）:

| 条件 | wall time | task再利用 |
|---|---:|---:|
| Next compiler cacheなし | 12.627秒 | 0/3 |
| 変更なし | 0.242秒 | 3/3 |
| Webの1ファイル変更 | 6.553秒 | 2/3 |
| ソース復元後 | 0.763秒 | 3/3 |

ツールチェーンのnative DAGも実行した。初回11.944秒、変更なし0.282秒、Python lockfileだけの変更1.262秒（各1回）。最後はPython検証のみが動き、TS/lint検証はcachedだった。従来は共通入力が1つの直列taskを失効させていた。

## キャッシュの正しさ

- frontend lockfileを変えるとJS検査が再実行され、Python型検査はcached。Python lockfileを変えると逆になることを実際のdevenv taskで確認。
- 新しいPythonファイルに意図的な型エラーを入れると、cached成功を使わず非ゼロ終了。削除・復元後は成功した。lockfileと一時ソースは元に戻した。
- tokensの入力変更で依存元とUI/Web/Mobile型検査のhashが変わることを確認。
- 72taskのdry-runで、lint policy hash変更はlintのみ、runtime hash変更は全taskを失効させることを確認。
- Storybook出力を退避してからcacheから復元し、151ファイル全SHAが同一だった。復元成果物で全171 storiesの描画に成功。
- Desktopはdebug buildとproduction buildの両方を実行し、productionへ戻した。最後のproduction出力にdebug sourcemapが残らないことも確認。

## 見送ったVitest設定

| 構成 | 中央値 |
|---|---:|
| 最初の既存設定 | 2.203秒 |
| threads / 4 workers | 1.982秒 |
| threads / 8 workers | 2.634秒 |
| forks / 4 workers | 4.453秒 |
| 再測定・既存設定 | 2.655秒 |
| 再測定・threads4 | 2.945秒（最終試行失敗） |

最初の4worker改善を再現できず、最後の試行は既存servicesテストの5000ms timeoutで失敗した。失敗を成功データから除いて有利な倍率を出すことはしていない。外部プロセス高負荷を確認したが、他の作業を停止していない。pool / worker既定値 / isolation / timeout / skipは変更しなかった。実行時resolved configを採取していないため、既存設定を特定のpool名・worker数と断定しない。

最終検証では既存設定で全47ファイル・525テスト成功、既存4件skip。`VITEST_MAX_WORKERS` はインストール実体ではconfig/CLIより優先されるため、CLIとenvを同時に別値で指定しない。

## 最終検証と制約

- `ci-check`: lint / format / 型チェック成功。既存frontend依存の監査19件（high7 / moderate8 / low4）で全体は失敗。監査の抑制は追加していない。
- `build-frontend` / `unit-test`: 成功。Frontend・Backend・Drizzle・Functions・toolchain・MCP同期検査の範囲を維持。
- Desktop debug用cache入力追加後にもproduction build・frontend lint/type-check・全テストを確認した。
- Storybook全171 storiesのsmoke成功。型/SDKの定義変更はなく、明示model生成タスクは実行していない。
- リモートGitHub Actionsのcache保存・復元時間は未測定。既存監査の失敗も残るため、CI全体の短縮倍率は出していない。
- RSSはプロセスツリー全体のメモリ合計ではない。少数サンプルの参考値を一般的な速度保証として扱わない。

## 再実行

すべてdevenv shell内で実行する。

```bash
bench-toolchain /tmp/contracts.json --runs 5 --case toolchain-serial --case toolchain-parallel
bench-toolchain /tmp/storybook.json --runs 3 --case storybook-build-forced --case storybook-build
turbo-frontend run build --dry=json
test-frontend --maxWorkers=4
devenv tasks run tests:toolchain
```

`toolchain-parallel` はnative DAGと同じ3コマンドを、キャッシュを使わず全PIDの終了を待って比較するための測定用。通常はnative taskを使う。

## 一次情報

- [devenv: task dependencies / execIfModified](https://devenv.sh/tasks/)
- [Turbo: Transit Nodes / task outputs](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks)
- [Turbo: caching / worktree sharing](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Turbo: environment variable inputs](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
- [Turbo: TURBO_CACHE_DIR](https://turborepo.dev/docs/reference/system-environment-variables)
- [Next: CI build caching](https://nextjs.org/docs/app/guides/ci-build-caching)
- [Vitest: profile first / performance](https://vitest.dev/guide/improving-performance)

# Frontend の Rust 系ツール追加活用

調査・実測日: 2026-11-06。Desktop の圧縮を Oxc に変更した。追加依存なし。

## 実測結果と採否

Apple M5 Max / 64 GiB、Node 24.22.1、Bun 1.4.4。各 build は別プロセスで warmup 1 回を除外し、5 回の中央値を比較。Turbo の結果キャッシュは使わず、OS キャッシュは温まった状態。生データは [frontend-rust-performance.json](2026-11-06-frontend-rust-performance.json)。

| 対象 | 変更前 | 変更後 | 判断 |
|---|---:|---:|---|
| Desktop build | esbuild 0.741秒 | Oxc 0.624秒 | 採用。今回の中央値は15.9%短縮 |
| Desktop JS/CSS合計 | 286,948 bytes | 284,618 bytes | 0.8%削減 |
| 同 gzip合計 | 86,725 bytes | 85,289 bytes | 1.7%削減 |
| Storybook build | 初回4.790秒 / 復元後5.367秒 | Babel ignore 5.072秒 | 効果が確定できず不採用 |
| Storybook build | 同上 | Babel skip hook 6.246秒 | 外部負荷で大きく変動、不採用 |

gzip は各 JS/CSS ファイルを個別に level 9、mtime=0 で圧縮した合計。Desktop は esbuild 5 回→Oxc 5 回の順で再比較。最初の調査では esbuild の中央値が0.350秒だったが、その後にマシン全体の負荷が上がったため、その値を変更後と比較していない。再比較でも範囲は esbuild 0.655〜0.785秒、Oxc 0.611〜0.748秒と重なる。15.9%は今回の実測値であり、常にその比率で速くなる保証ではない。Oxc は Vite 8 の既定で、非推奨の esbuild override を外す意味もある。

Storybook の Web/Desktop/UI だけ NativeWind 用 Babel preset を除外する案を2通り試した。`babel.ignore` と React plugin 5 の `api.reactBabel` hook。後者は Vite 8 の Oxc へ JSX/Fast Refresh を委譲できるが、React plugin 6 には同じ hook がなく、保守コストを増やす。測定中に fseventsd / 外部 Node プロセスの高負荷があり、hook の後半2回は16.1秒・17.9秒まで変動した。明確な利得がないため、どちらも撤回し、既存の NativeWind / Worklets 変換を維持した。

### Bundled Dev のブラウザ確認

Vite の `--force` でサーバーを起動し、独立した agent-browser Chrome session で実画面を確認した。通常モード / Bundled Dev の連続5回の navigation で FCP の中央値は148 / 144ms、resource 件数は43 / 3。通常側は事前に1回表示済み、Bundled 側は初回 compile を含むため、厳密な cold-start 比較ではなく探索用の参考値。HTTP cache は毎回消していない。ready ログは305 / 145msだったが、これをユーザーが見える画面の起動時間とは扱わない。

HomePage の見出しを一時変更し、DOM更新と `window` のトークン保持で両方の HMR / full reload 不発生を確認。各1回の参考値は通常1,619ms / Bundled 1,999msで、filesystem 通知の負荷も含む。Bundled の初回 HMR 試行は検証途中にサーバーを止めたため除外し、再試行の成功だけを記録した。変更したソースは復元済み。

この規模では描画時間の改善が小さく、HMR の速度向上も確認できないため Bundled Dev は既定にしない。`desktop-vite --experimentalBundle` で試せるようにした。

### 再実行

すべて devenv shell 内で実行する。

```bash
bench-toolchain /tmp/frontend-builds.json --runs 5 \
  --case desktop-build-esbuild --case desktop-build --case storybook-build
desktop-vite                         # Desktop のみ。Supabase 等を起動しない
desktop-vite --experimentalBundle     # 実験用。既定では無効
desktop-vite preview                  # build 済みの Desktop を確認
```

### 検証結果

- `ci-check`: lint / format / 型チェックは成功。既存 frontend 依存の security audit 19件（high 7 / moderate 8 / low 4）で全体は失敗。監査の抑制や閾値変更はしていない。
- `build-frontend`: 全5タスク成功、Turbo cache hit なし。Desktop の本番 Oxc build も含む。
- `test-frontend`: 47ファイル、525テスト成功、既存4件skip。
- `build-storybook` + `storybook-smoke`: 最終構成で171 stories全成功。`store-listing` profile の Chromium が Darwin 非対応だったため、既存 harness の `PLAYWRIGHT_CHROMIUM_PATH` でインストール済み Google Chrome を指定。
- agent-browser: Web/Mobile Button の背景色・高さ36px、NativeWind className保持、Desktop 更新バナーのボタン・見出しを確認。ブラウザを閉じ、HMR 検証用の一時ソース変更も復元。

これは frontend ツールチェーンの改善。ブラウザの実行性能や Tauri ネイティブ IPC / 署名済み配布物の速度向上を示す測定ではない。

## 現在の実物で確認したこと

- Next は package.json の指定が16.4.1系、lockfile/インストール実体は **16.4.2**。Web は Next の既定 Turbopack を使用。
- インストール済み next/dist/server/config-shared.js と同梱 docs の両方で、開発・本番 build の filesystem cache は既定 true。本番の既定有効化は16.3から。古い公開ドキュメントの「build は opt-in」を現行版へ適用しない。
- next/dist/server/config.js では lucide-react も自動 import 最適化の既定対象。同梱 local-development.md は Turbopack が自動分析するため optimizePackageImports 設定は不要と説明している。
- Vite **8.3.4**、root の plugin-react は6系。Desktop は react() のみで独自 Babel plugin を指定していない。
- 変更前は Desktop だけ build.minify に esbuild を明示していた。今回 Oxc に変更（debug の minify=false は維持）。
- Storybook は react-native-web-vite、vite-plugin-rnw 経由。vite-plugin-rnw は plugin-react **5.2系**に依存し、root の6系とは別経路。react-native-css/babel と Worklets の変換を使う。
- Storybook の docgen はすでに react-docgen（TypeScript checker ベースの docgen ではない）。
- Expo は Babel preset と Worklets plugin、Metro/NativeWind 統合が必要な構成。根拠なく Babel 全体を SWC/Oxc に置換しない。

## 比較した対象

| 順 | 対象 | 実験 | 判断条件 |
|---|---|---|---|
| 1 | Desktop minifier | esbuild 対 Oxc | build 時間、出力 byte/gzip、起動・更新通知 UI の動作 |
| 2 | Storybook transforms | Web の不要な Babel 処理を除き、Native に必要な変換を保持できるか | transform profile、build/初回描画/HMR、全ストーリー smoke、Native className と Worklets の描画 |
| 3 | Vite dev server | experimental.bundledDev | 起動ログの ready だけでなく、ブラウザ初回描画、module request 数、再読み込みと HMR を比較 |

Bundled Dev は8.1から利用できるが、現在も experimental。公表された巨大 app の倍率をこの boilerplate の予測値にしない。

Next の lazy dynamic import は16.4からの実験機能。現在の Web ソースで見つかった動的 import は i18n messages の読み込みで、client の大きな dynamic import 群はない。現時点で高優先の改善とは判断しない。

Next の plugin runtime workerThreads はメモリ削減候補だが、Node 24.13.1以降の teardown 問題で childProcesses に戻る。現在の24.22.1で forceWorkerThreads を設定して速度を狙わない。

新しい formatter・別の SWC plugin・別の bundler を重ねるより、既存の Rust 経路を遮っている override と JS transform を調べる。画面の実行性能（React render、通信、bundle 転送）は build ツールの実装言語とは別に測定する。

## 一次情報

- [Vite 8.1: Bundled Dev](https://vite.dev/blog/announcing-vite8-1)
- [Vite 8 build options: Oxc minifier が既定、esbuild 指定は非推奨](https://v8.vite.dev/config/build-options)
- [Vite performance: plugin の transform 範囲の調査](https://vite.dev/guide/performance)
- [Vite 8 / plugin-react 6 の Rust 化](https://vite.dev/blog/announcing-vite8)
- [Next development guide](https://nextjs.org/docs/app/guides/local-development)
- [Next lazy dynamic imports](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackLazyDynamicImports)
- [Next plugin runtime strategy と Node compatibility](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackPluginRuntimeStrategy)
- [Expo の Babel 設定](https://docs.expo.dev/versions/latest/config/babel/)
- [NativeWind v5 migration](https://www.nativewind.dev/v5/guides/migrate-from-v4)

ローカル根拠: frontend/apps/{web/next.config.ts,desktop/vite.config.ts,mobile/babel.config.js,mobile/metro.config.js}、frontend/.storybook/main.ts、frontend/node_modules/{next/dist/docs,next/dist/server/config-shared.js,next/dist/server/config.js,vite/dist/node/index.d.ts,vite-plugin-rnw/package.json,vite-plugin-rnw/dist/index.mjs}。

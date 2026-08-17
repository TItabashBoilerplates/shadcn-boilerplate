# TypeScript 7 へのアップグレード可否調査（+ 依存パッケージの最新化 / Tauri デスクトップ）

- 調査日: 2026-08-17
- 対象: `frontend/`（web / mobile / packages）, `drizzle/`
- 現状: `typescript@~6.0.3`（全ワークスペース） / Bun 1.3.11 / Next.js 16.3.0 / Expo SDK 57.0.10
- 結論: **可能。ただし「TypeScript を 7 にする」と「ESLint を動かし続ける」を同時に満たすには TS 6 との二本立てが必須。**

---

## 0. 結論サマリ

| 問い | 答え |
|---|---|
| TS 7 で型チェックは通るか | **通る。実測で新規エラー 0 件**（11 プロジェクト全て TS6 と同結果） |
| 速くなるか | **なる。apps/web の cold 型チェックが 6.24s → 1.27s（約 4.9x）** |
| そのまま `typescript@7` に上げて完了できるか | **できない。`typescript-eslint` が TS 7 でハードエラーになり、`lint` / `lint:fsd` が全滅する** |
| 回避策はあるか | ある。**TS 7（型チェック用）と TS 6 API（ESLint 用）の二本立て** |
| 公式の回避策はそのまま使えるか | **使えない。Bun でエイリアス解決が壊れる（実測）**。Bun 向けの代替構成が必要 |
| 依存を「全部最新」にできるか | **一部は不可**。`react-native` / `react` / `expo-*` は **Expo SDK 57 が許容する版に固定**。それ以外はメジャー跨ぎを個別検証 |
| Tauri デスクトップ | TS 7 とは無関係に問題なし。ただし**既存 web アプリの流用は不可**（Tauri は SSG のみ） |

**推奨: 今すぐ「TS 7 + TS 6 二本立て」に進めるのは可。ただし ESLint の完全解決は TypeScript 7.1（安定 API）待ちであり、そこまで割り切れるかは判断が必要（§7）。**

---

## 1. TypeScript 7 の状況（一次情報）

- **2026-07-08 GA**。Go 製ネイティブ移植で、公式はフルビルド **8〜12x** 高速化を提示
- npm の `typescript` パッケージの `latest` が **7.0.2**
- **7.0 には programmatic API（`ts.createProgram` 等）が無い**。安定 API は **7.1** 予定

実測（`typescript@7.0.2` を取得して中身を確認）:

```
bin:     { "tsc": "./bin/tsc" }          # tsserver は無い（LSP へ移行）
exports: { ".": "./lib/version.cjs",     # ← ルート export は version だけ
           "./unstable/sync", "./unstable/async", "./unstable/ast", ... }
```

`lib/version.cjs` の中身は実質 2 行:

```js
const { version } = require("../package.json");
exports.version = version;
```

つまり **`import ts from 'typescript'` をしているツールは全て壊れる**。`./unstable/*` に新 API の実装は入っているが、名前どおり不安定で、ツール側はまだ移行していない。

### tsconfig の破壊的変更（本リポジトリへの影響）

| 変更 | 本リポジトリへの影響 |
|---|---|
| `strict` の既定が `true` | 影響なし（全 tsconfig で明示的に `true`） |
| `types` の既定が `[]` | **影響なし**。`tooling/typescript/base.json` が既に `"types": []` を明示済み |
| `baseUrl` 廃止 | **影響なし**（未使用。`paths` はルート相対で書かれている） |
| `moduleResolution: node/node10/classic` 廃止 | **影響なし**（全て `bundler`） |
| `target: es5` 廃止 / `downlevelIteration` 廃止 | **影響なし**（`ES2017` / `ESNext`） |
| `module: amd/umd/system/none` 廃止 | 影響なし |
| `esModuleInterop` を `false` 不可 | 影響なし（`true`） |
| `rootDir` の既定が `./` | `noEmit` 運用なので実害なし |
| project references / `composite` / `incremental` | **サポート継続**（実測で `tsc -b` 成功） |

> 本リポジトリの tsconfig は **偶然ではなく既に TS 7 互換**になっている（`base.json` の `types: []` と `moduleResolution: bundler` が効いている）。tsconfig の書き換えは実質不要。

---

## 2. 実測: TS 6 と TS 7 の型チェック結果比較

`typescript@7.0.2` をスクラッチ領域に入れ、リポジトリには手を入れずに全プロジェクトへ実行。

| プロジェクト | TS 6.0.3 | TS 7.0.2 | 判定 |
|---|---|---|---|
| `apps/web` | 0 | 0 | ✅ |
| `apps/mobile` | 0 | 0 | ✅ |
| `packages/ui` | 0 | 0 | ✅ |
| `packages/native-ui` | 0 | 0 | ✅ |
| `packages/types` | 0 | 0 | ✅ |
| `packages/tokens` | 0 | 0 | ✅ |
| `packages/api-client` | 1 | 1 | ⚠️ **既存エラー**（TS7 のせいではない） |
| `packages/onesignal` | 0 | 0 | ✅ |
| `packages/app` | 0 | 0 | ✅ |
| `packages/client/supabase` | 0 | 0 | ✅ |
| `packages/db-schema` | 0 | 0 | ✅ |
| `drizzle` | 5 | 5 | ⚠️ **既存エラー**（TS7 のせいではない） |

**TS 7 に起因する新規エラーは 1 件も無い。** project references ビルド（`tsc -b`）も成功。

### 付随して見つかった既存の穴（TS 7 とは独立の問題）

CI が拾えていない型エラーが 6 件ある。**どちらも `ci-check` の対象外**になっているため気づけていない。

1. **`packages/api-client/index.ts:35`** — `'"@hey-api/client-fetch"' has no exported member named 'client'. Did you mean 'Client'?`
   → `@workspace/api-client` に `type-check` script が無く `turbo type-check` に乗っていない
2. **`drizzle/seed/random/*.ts`** — 5 件（`RefinementsType` が未 export、`f` が implicit any / unknown）
   → `devenv.nix` の `type-check:*` task に drizzle が存在せず、lint / format のみ

> TS 7 化とは別に手当てすべき。TS 7 移行時にまとめて直すのが自然（移行の PR で「TS7 が壊した」と誤認されるのを防ぐため、**先に別コミットで潰しておく**のが望ましい）。

### 速度（`apps/web`, cold, tsbuildinfo 削除後）

| | 実測 |
|---|---|
| TS 6.0.3 | **6.24 s** |
| TS 7.0.2 | **1.27 s** |
| | **約 4.9x** |

公式が謳う 8〜12x より控えめだが、これは web アプリ単体が小さいため。`ci-check` 全体では体感差はより大きくなる。

---

## 3. 最大のブロッカー: typescript-eslint（実測で確認）

`typescript@7.0.2` + `@typescript-eslint/parser@8.65.0` で parse を試すと、**型を使わない parse でも即座に落ちる**:

```
Error: typescript-eslint does not support TS 7.0.
Please see https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0
  to run typescript-eslint using the TS 6 API.
See also https://github.com/typescript-eslint/typescript-eslint/issues/10940
  for tracking typescript-eslint's support for TS >=7.1
```

typescript-eslint 自身がバージョンを検出して**明示的に拒否**している（peer も `typescript: >=4.8.4 <6.1.0`）。type-aware ルールを切っても回避できない。

### 本リポジトリでの影響範囲

typescript-eslint は**直接依存していないが、2 経路で必ず入る**:

```
typescript-eslint@8.46.2
└─ eslint-config-next@16.3.0        → apps/web（+ @workspace/eslint-config）

@typescript-eslint/parser@8.65.0
└─ eslint-config-expo@57.0.1        → apps/mobile
```

止まるもの:

- `apps/web` の `lint`（`eslint-config-next/core-web-vitals`）
- `apps/mobile` の `lint`（`eslint-config-expo/flat`）
- **`lint-fsd`（`eslint-plugin-boundaries` による FSD 境界検査）** ← `ci:check` に入っており、外せない

> Biome（`2.4.11`）は独自パーサなので TS 7 と無関係。**ESLint は「Next の core-web-vitals」「Expo」「FSD 境界」のために残っている**ので、代替や削除では解決できない。

---

### 3.1 実リポジトリでの実測（node_modules の `typescript` を 7.0.2 に差し替えて実行）

推測ではなく、このリポジトリで実際に走らせた結果:

| コマンド | 結果 |
|---|---|
| `apps/web` の `eslint src` | ❌ `TypeError: Cannot read properties of undefined (reading 'Cjs')` |
| `apps/mobile` の `eslint src` | ❌ `Error: typescript-eslint does not support TS 7.0.` |
| `vitest run`（frontend 全体） | ✅ **21 files / 263 tests 全て pass**（10.16s） |
| `tsc --noEmit`（全 11 プロジェクト） | ✅ 新規エラー 0 件（§2） |
| `next build` | ⚠️ 失敗するが **TS6 でも同じ 7 エラー = 既存バグ**（下記） |

**ESLint は「型を使うルールだから遅い/危ない」ではなく、`.ts` を parse する時点で落ちる。** 回避不能。

### 3.2 付随発見: `next build` が現在 main で壊れている（TS 7 とは無関係）

TS 6.0.3 のままでも `next build` が **7 エラー**で失敗する:

```
./apps/web/src/features/auth/api/deleteAccount.ts:8:1
Error: Only async functions are allowed to be exported in a "use server" file.
→ The export DELETE_ACCOUNT_CONFIRMATION was not found ... The module has no exports at all.
```

`"use server"` ファイルは **async 関数以外を export できない**のに、`deleteAccount.ts` が定数
`DELETE_ACCOUNT_CONFIRMATION` を export している。結果としてモジュール全体の export が消え、
`@/features/auth` 経由の import が連鎖的に壊れている。

**`ci:check` は lint / format / type-check のみで `next build` を含まないため、これが検出されていない。**
（`build-frontend` script は存在するが CI ゲートに入っていない）

---

## 4. `next build` と ESLint が同じ `typescript` を奪い合う（最重要の設計上の制約）

Next.js 16.3.0 は既定で **`useTypeScriptCli: true`**（`config-shared.js` で確認）。その tsc を
どう探すかが `node_modules/next/dist/esm/lib/typescript/runTypeScriptCli.js` に書かれている:

```js
packageJsonPath = resolveFrom(baseDir, 'typescript/package.json');   // ← 名前 "typescript" 固定
const tscBin = packageJson.bin?.tsc;
const tscBinPath = tscBin ? path.resolve(packageDir, tscBin) : undefined;
// TS7 の拡張子なし ESM bin は Node 20.9 で main entry にできないため lib/tsc.js へ差し替える分岐もある
```

`hasNativeTypeScriptPreview()` は `@typescript/native-preview` を見るが、**バイナリ選択には使われず
メッセージ用**。つまり:

> **`next build` に TS 7 を使わせる唯一の方法は、`typescript` という名前のパッケージ自体を 7 にすること。**
> しかし typescript-eslint も同じ `typescript` を `require` する。**両者は同じ 1 つの名前を奪い合う。**

これが本移行の核心。組み合わせは 3 つしかない。

| 案 | `typescript` の中身 | 型チェック task | `next build` の型検査 | ESLint | 評価 |
|---|---|---|---|---|---|
| **A** | **7.0.2** | TS7（速い） | TS7（速い） | ❌ **全滅** | lint を捨てられるなら最速 |
| **B** | **6.0.3** + `@typescript/native`=7.0.2 | **TS7（明示パス, 速い）** | TS6（遅い） | ✅ 動く | `next build` 内の型検査を `typescript.ignoreBuildErrors: true` で切り、独立した TS7 型チェックに寄せれば整合する |
| **C** | 6.0.3 のまま | TS6 | TS6 | ✅ | 現状維持（TS 7.1 待ち） |

**案 B の補足**: `ignoreBuildErrors: true`（Next 16.3 に存在を確認）は「型検査をやめる」ことではない。
`ci:check` は既に型チェックを独立 task として持っているので、**ビルドと型検査を分離する**だけであり、
むしろ責務が明確になる。この構成なら TS7 の高速化を型チェックで享受しつつ ESLint も生かせる。

---

## 5. Bun 固有の落とし穴（重要 / 実測）

公式が案内する側置き構成は次のとおり:

```bash
npm install -D typescript@npm:@typescript/typescript6     # ← 名前 typescript に TS6 API を割り当て（bin は tsc6）
npm install -D @typescript/native@npm:typescript@^7.0.2   # ← TS7 本体（bin は tsc）
```

`@typescript/typescript6@6.0.2` の実体はシムで、`lib/typescript.js` は 1 行:

```js
module.exports = require("@typescript/old");   // deps: { "@typescript/old": "npm:typescript@^6" }
```

### 実測結果

| パッケージマネージャ | `@typescript/old` の解決先 | `require('typescript')` | typescript-eslint |
|---|---|---|---|
| **npm** | `typescript@6.0.3`（正） | `6.0.3` / `createProgram: function` | ✅ 動く |
| **Bun 1.3.11** | **`@typescript/typescript6@6.0.2`（シム自身 = 循環）** | `undefined` | ❌ 壊れる |

Bun は、ルートで `typescript` という**名前**をシムにエイリアスしたことにより、シム内部の `npm:typescript@^6` を**ルートのエイリアス（＝シム自身）へ解決してしまう**。結果 `module.exports` が空オブジェクトになり、typescript-eslint は `Cannot read properties of undefined (reading 'split')` で落ちる。

`overrides: { "@typescript/old": "npm:typescript@6.0.3" }` でも**解消しない**（`typescript` という名前が再びエイリアスに吸われるため）。

### Bun で動く代替構成（実測で成功）

**シムを使わず、`typescript` に本物の TS 6 を置き、TS 7 を別名で入れる。**

```json
{
  "devDependencies": {
    "typescript": "6.0.3",
    "@typescript/native": "npm:typescript@^7.0.2"
  }
}
```

実測結果:

- `require('typescript')` → `6.0.3` / `createProgram: function` ✅
- `@typescript-eslint/parser` の parse ✅
- `node_modules/@typescript/native/bin/tsc --version` → `7.0.2` ✅

> ⚠️ `node_modules/.bin/tsc` は **TS6 と TS7 の両方が同じ bin 名を要求するため、どちらが勝つかがインストール順依存**（今回の実測では TS7 が勝った）。**`devenv.nix` / `turbo` の type-check は `node_modules/@typescript/native/bin/tsc` を明示パスで呼ぶ**こと。`.bin/tsc` に依存すると「ある日 lint も type-check も静かに TS6 に戻る」形で壊れる。

### 要検証（このフェーズでは未確定）

- **`next build` がどちらの tsc を使うか**。Next.js 16.3 は「project-local な `tsc` CLI を既定で使う」設計（`experimental.useTypeScriptCli` あり / 16.3.0 が実際に該当オプションを持つことは確認済み）。`typescript` が 6.0.3 の構成でどう解決されるかは実測が必要
- **エディタ / IDE**。TS 7 は tsserver を持たず LSP。VS Code は専用拡張（公式は「数週間のうちに VS Code 本体へ」と表明）。`typescript` が 6.0.3 のままだと**エディタは TS6 のまま**になる
- **Storybook の `react-docgen-typescript@2.4.0`** が node_modules に存在する。ただし `.storybook/main.ts` は `reactDocgen: 'react-docgen'`（TS API 非依存）を明示しているので、**現構成では発火しない**見込み。切り替えたら壊れる点は覚えておく

---

## 6. 依存パッケージの最新化（`bun outdated` 実測）

### 6.1 そのまま上げてよいもの（patch / minor）

| パッケージ | 現在 | 最新 |
|---|---|---|
| `@supabase/supabase-js` | 2.112.1 | 2.112.3 |
| `lucide-react` | 1.28.0 | 1.31.0 |
| `motion` | 13.0.0 | 13.1.0 |
| `zustand` | 5.0.14 | 5.0.15 |
| `@biomejs/biome` | 2.4.11 | 2.5.8 |
| `storybook` / `@storybook/*` | 10.5.7 | 10.5.8 |
| `turbo` / `@turbo/gen` | 2.10.8 | 2.10.10 |
| `@types/react` | 19.2.17 | 19.2.18 |
| `@types/react-dom` | 19.2.3 | 19.2.4 |
| `@tanstack/react-query(-devtools)` | 5.90.12 / 5.91.1 | 5.101.4 |
| `postgres`（drizzle） | 3.4.7 | 3.4.9 |
| `@types/bun` / `bun-types`（drizzle） | 1.3.1 | 1.3.14 |
| `react-native-safe-area-context` | 5.7.0 | 5.9.0 |
| `react-native-svg` | 15.15.4 | 15.15.5 |

### 6.2 メジャー跨ぎ（個別に検証が必要）

| パッケージ | 現在 | 最新 | 懸念 |
|---|---|---|---|
| `vite` | 7.3.1 | **8.2.1** | Storybook 10 / `@tailwindcss/vite` / `@storybook/react-native-web-vite` の対応確認が必須。Storybook 10.5.7 の peer に `vite-plus` が現れており、この系の互換は別途調査 |
| `@vitejs/plugin-react` | 5.2.0 | **6.0.5** | vite 8 と同時に上げる前提 |
| `jsdom` | 27.4.0 | **30.0.1** | Vitest 環境。3 メジャー跨ぎ |
| `@types/node` | 24.9.1 / 22.19.3 | **26.2.0** | `engines.node: >=20.19.0` と整合するか。ワークスペース間で 22 系と 24 系が混在しており先に統一すべき |
| `playwright-core` | 1.56.0 | 1.62.1 | `e2e/` は Bun workspace 外。プリベイク Chromium との整合に注意 |

### 6.3 上げてはいけないもの（Expo SDK 57 の制約）

`bunx expo install --check` の出力（公式ツールの判断）:

```
expo@57.0.10            → ~57.0.14
expo-constants@57.0.9   → ~57.0.12
expo-image@57.0.2       → ~57.0.3
expo-linking@57.0.5     → ~57.0.6
expo-router@57.0.10     → ~57.0.14
expo-splash-screen@57.0.5 → ~57.0.7
expo-symbols@57.0.1     → ~57.0.2
```

**注目すべきは「Expo が要求していないもの」**:

- `react-native` **0.86.2 → 0.87.0 は Expo が要求していない**。SDK 57 は RN 0.86 系に固定。**上げてはいけない**
- `react` / `react-dom` **19.2.3 → 19.2.8 も Expo は要求していない**。web だけ上げると mobile と版が割れる（`@workspace/native-ui` の peer も 19.2.3 前提）。**モノレポ全体で足並みを揃える必要があり、独立に上げない**

> つまり「依存を全て最新」は **mobile については成立しない**。`react-native` / `react` / `expo-*` は **Expo SDK の版が上限**であり、これを超えたい場合は SDK 58（現時点で canary のみ、正式 changelog 未公開）待ちになる。

---

## 7. Tauri デスクトップアプリ（新規追加前提）

### 現状

- `frontend/apps/` は **web と mobile のみ**。デスクトップアプリは**存在しない**
- `.claude/skills/monorepo/` は `@workspace/ui` を「Web / Desktop 用」と位置づけており、`design-system.md` に「Electron / Tauri など Web 技術ベースのホストは `@workspace/ui` をそのまま使える」と既に書かれている。**受け入れ口は設計済み**

### TS 7 との関係

`@tauri-apps/cli`（最新 **2.11.4**）は Rust バイナリ + JS ラッパで、**TypeScript の compiler API に依存しない**。`@tauri-apps/api` も型定義を自前で同梱するだけ。**TS 7 化のブロッカーにはならない。**

### ただし設計上の制約（TS とは別の話）

**Tauri は SSR を動かせないため、Next.js は SSG（`output: 'export'`）しか使えない。** 現 `apps/web` は Server Components / `next-intl` / Supabase SSR（`getUser()` によるサーバ側認可）前提なので、**そのまま Tauri で包むことはできない**。

現実的な選択肢:

1. `apps/desktop` を **Vite + React** で新設し、UI は `@workspace/ui`、認証・データは `@workspace/client-supabase` / `@workspace/query` を共有（FSD / monorepo 境界に沿う。**実装量最小**）
2. `apps/web` を SSG 可能な範囲に切り出した別アプリを作る（分岐が増え保守コストが上がる）

**推奨は 1。** ただしこれは TS 7 調査の範囲外の設計判断であり、別タスクとして扱うべき。

---

## 8. 移行計画（案）

### Phase 0: 前提を整える（TS 7 とは独立・低リスク）

1. 既存型エラー 6 件を修正（`packages/api-client` 1 件 / `drizzle` 5 件）
2. **CI の穴を塞ぐ**: `@workspace/api-client` に `type-check` script を追加、`devenv.nix` に `type-check:drizzle` task を追加して `ci:check` に載せる
3. patch / minor の依存更新（§6.1）+ `expo install --check` が示す `expo-*` の patch 更新（§6.3）
4. `@types/node` のワークスペース間バージョン統一

### Phase 1: TS 7 を型チェックに導入（二本立て）

1. 全ワークスペースを `typescript: 6.0.3`（本物）に固定し、`@typescript/native: npm:typescript@^7.0.2` を追加
2. `devenv.nix` の `type-check:frontend` / `type-check:mobile` と各 package の `type-check` script を **`@typescript/native/bin/tsc` の明示パス**に変更（`.bin/tsc` に依存しない）
3. ESLint は `typescript`（6.0.3）を掴んだまま動く → `lint` / `lint-fsd` は無変更で通る
4. `next build` がどの tsc を使うか実測し、必要なら `experimental.useTypeScriptCli` を設定
5. エディタ設定（VS Code の TS 7 拡張 / LSP）を `.vscode/` に記載

### Phase 2: メジャー跨ぎの依存更新（TS 7 とは分離）

`vite 8` / `@vitejs/plugin-react 6` / `jsdom 30` / `playwright-core` を **Storybook・Vitest の互換を個別調査してから**。TS 7 移行と同じ PR に混ぜない（切り分け不能になる）。

### Phase 3: TypeScript 7.1 で一本化

`typescript-eslint` が TS >=7.1 に対応（[issue #10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)）した時点で、`typescript` を 7 系へ寄せて二本立てを解消。

---

## 9. 判断が必要な点（推測で進めない）

1. **二本立てを受け入れるか**。`typescript` が 6.0.3、型チェックだけ TS 7 という構成は、`package.json` を読んだ人に「TS 6 のプロジェクト」と見える。**boilerplate としての分かりやすさを損なうという見方もある**ため、「TS 7.1 まで待つ」という判断も十分に合理的
2. **`react` / `react-native` を Expo SDK 57 の上限に留めることの合意**。「全て最新」の要望とは衝突する
3. **`vite 8` を今回の範囲に含めるか**（Storybook 互換の調査コストが別途かかる）
4. **Tauri デスクトップを別タスクにするか**（§7 の選択肢 1 を採るなら新規アプリ追加であり、TS 7 移行とは独立）

---

## 参考（一次情報）

- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) — GA 日 / 破壊的変更 / API 不在 / side-by-side 手順
- [Announcing TypeScript 7.0 RC](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/)
- [microsoft/typescript-go](https://github.com/microsoft/typescript-go)
- [typescript-eslint #10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) — TS >=7.1 対応のトラッキング
- [Next.js: useTypeScriptCli](https://nextjs.org/docs/app/api-reference/config/next-config-js/useTypeScriptCli) / [vercel/next.js#95639](https://github.com/vercel/next.js/pull/95639) — TS 7 対応のため tsc CLI を直接呼ぶ設計
- [Tauri: Next.js](https://v2.tauri.app/start/frontend/nextjs/) — SSG のみ対応
- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57) — RN 0.86 / React 19.2
- 実測: `typescript@7.0.2` / `@typescript/typescript6@6.0.2` / `@typescript-eslint/parser@8.65.0` / `bun 1.3.11` / `npm`

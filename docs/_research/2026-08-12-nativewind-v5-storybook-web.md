# NativeWind v5 (react-native-css) を Storybook Web で動かす — 真因と解決

**調査日**: 2026-08-12
**対象**: `frontend/.storybook/`, `frontend/packages/native-ui/`
**前提バージョン**: Storybook 10.5.7 / nativewind 5.0.0-preview.4 / react-native-css 3.0.7 /
react-native-web 0.21.2 / Tailwind CSS 4.3.3 / Expo 57 (RN 0.86)

> このレポートは [`2026-01-03-nativewind-v5-storybook.md`](./2026-01-03-nativewind-v5-storybook.md)
> を **supersede** する。当時の結論「Storybook Web では動かないので Mobile は保留」は誤りだった。

---

## 1. 症状

`packages/native-ui`（gluestack-ui + NativeWind v5）のコンポーネントを Storybook で表示すると
**すべて無スタイル**で描画される。Tailwind 側は `.bg-primary` 等を正しく生成できており、
「CSS ファイルの問題ではない」ところまでは分かっていた。

そのため `.storybook/main.ts` では Mobile のストーリー登録が丸ごとコメントアウトされ、
`packages/native-ui` に既に存在した **9 ファイル / 26 ストーリーが全く使われていない**状態だった。

## 2. 誤っていた前提

コード中のコメントおよび旧調査レポートは、原因を次のように説明していた。

> NativeWind v5 は `className` を Metro のトランスフォーマでスタイルへ変換する設計で、
> react-native-css は「officially only supports Metro as the bundler」と明言している。
> このため Webpack ベースの `@storybook/nextjs` では className が変換されない。

**これは誤読である。** README のその一文は **CSS アセットパイプライン（＝ネイティブ向けに CSS を
JS のスタイルレジストリへコンパイルする処理）** の話で、web 対応の話ではない。
実際 `react-native-css` パッケージには web 専用の実装が同梱されている:

| ファイル | 役割 |
|---|---|
| `src/runtime.ts` → `export * from "./web"` | **既定（web）の解決先** |
| `src/runtime.native.ts` → `export * from "./native"` | Metro が `.native.ts` を優先解決（ネイティブ用） |
| `src/web/api.tsx` | `useCssElement`。className を RNW の `$$css` に載せる |
| `src/babel/react-native-web.ts` | **react-native-web 向けの import 書き換え** |

つまり web は「Metro 不要」で、必要なのは Babel の import 書き換えだけだった。

## 3. 真因（独立した 3 つのバグが重なっていた）

### 真因 A: Babel の import 書き換えが走っていなかった

web での className 解決は次の経路で行われる。

```
import { View } from 'react-native'
  ↓ react-native-css/babel（import-plugin）が書き換え
import { View } from 'react-native-css/components/View'
  ↓ そのラッパーが useCssElement を呼ぶ
style = [..., { $$css: true, className: 'bg-primary' }]
  ↓ react-native-web の StyleSheet が $$css を解釈
<div class="... bg-primary">
```

`@storybook/nextjs` は Next.js の SWC パイプラインで動くためこの Babel プラグインが適用されず、
書き換えが起きない。書き換わらないと className は生の react-native-web の `View` に渡るが、
RNW の `createDOMProps` は className を **自前の StyleSheet 出力で上書き**する:

```js
// react-native-web/dist/modules/createDOMProps/index.js:810-813
var _StyleSheet = StyleSheet([style, ...]), className = _StyleSheet[0]
if (className) { domProps.className = className }   // ← 渡した className は捨てられる
```

→ **props の className は DOM に一切出ない**。これが「全部無スタイル」の正体。

### 真因 B: カスケードレイヤーで Tailwind が react-native-web に負ける

A を直すと className は DOM に出るようになるが、今度は
**`rounded-md` / `h-9` は効くのに `bg-primary` / `flex-row` だけ効かない**という状態になる。

react-native-web は自身のスタイルシートを **`<head>` の先頭**に挿入する:

```js
// react-native-web/dist/exports/StyleSheet/dom/createCSSStyleSheet.js
head.insertBefore(element, head.firstChild)   // アプリ側が上書きできるようにする意図的な設計
```

この `<style id="react-native-stylesheet">` の `.css-view-*` が RN 既定値
（`background-color: rgba(0,0,0,0)` / `flex-direction: column`）を宣言している。
問題は **これがカスケードレイヤーに属していない**こと。

> CSS のカスケードでは **レイヤー無しの宣言が、あらゆる `@layer` より強い**（詳細度・記述順に関係なく）。

`@import "tailwindcss"` はユーティリティを `@layer utilities` に入れるため、
RNW が宣言しているプロパティは**必ず**負ける。RNW が宣言していない
`border-radius` / `height` だけ通るので「一部だけ効く」ように見える。

NativeWind が生成する `@workspace/tokens/native.css` が
`@import "tailwindcss/utilities.css";` を **レイヤー無し**で読んでいるのは、まさにこの回避のため。

```css
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";            /* ← レイヤー無し（意図的） */
```

### 真因 C: react-native-web 内部まで書き換えると本番ビルドが壊れる

`react-native-css` の import 書き換えプラグインは、`react-native-web/dist/...` への
**相対 import まで**書き換える（`parseReactNativeWebSource`）。
その結果 RNW 内部の `./FlatList` が `react-native-css/components/FlatList` を指し、
その FlatList はまた `react-native`（= react-native-web）を import するので**循環参照**になる。

dev（ESM で遅延評価）では表面化しないが、Rollup の本番ビルドでは 2 つの束縛が 1 つに畳まれ、
自己参照になる:

```js
const FlatList$1 = copyComponentProperties(FlatList$1, function(props) {   // TDZ
  return useCssElement(FlatList$1, props, mapping$7)
})
```

→ 全ストーリーが `ReferenceError: Cannot access 'FlatList$1' before initialization` で落ちる。
**`storybook build` 自体は成功する**ので、ブラウザで開くまで気づけない。

## 4. 解決

`@storybook/nextjs`（Webpack）→ **`@storybook/react-native-web-vite`**（Vite）へ移行し、
上記 3 点に対応した。

| 真因 | 対応 | 場所 |
|---|---|---|
| A | `pluginReactOptions.babel.presets = [react-native-css/babel]` | `.storybook/main.ts` |
| B | `@import "tailwindcss/utilities.css"` を **レイヤー無し**で、`globals.css` より**前**に | `.storybook/storybook.css` |
| C | `exclude` で `react-native-web` 本体を Babel 対象外に戻す | `.storybook/main.ts` |
| — | `@source "../packages/native-ui"` でクラス走査対象に追加 | `.storybook/storybook.css` |
| — | `GluestackUIProvider` を Mobile ストーリーの decorator に（SafeAreaProvider が必要） | `.storybook/preview.tsx` |

### B の順序が重要な理由

Tailwind は同一 CSS の import を **最初の 1 回だけ**採用して以降を dedupe する。
`globals.css` は内部で `@import "tailwindcss"`（= `layer(utilities)` 付き）を行うため、
レイヤー無しの import を**後ろに置くと dedupe されて消える**。
先に置くことで「レイヤー無し」の解釈が採用される。

### 副次的な効果

- `@storybook/nextjs` の Webpack builder 向けに書かれていた `@workspace/ui/*` の
  subpath alias ミラー（`exports` の手動再現）が **全部不要**になった。
  Vite は `package.json` の `exports` をそのまま解決する。
- Web / Mobile が同一カタログに並ぶので、`@workspace/tokens/contract` が保証している
  「Web と Native で同じ variant / size API」を**目で比較できる**ようになった。

## 5. 検証結果

`storybook-static` を配信し、Chromium で全ストーリーの computed style を実測。

| 対象 | 結果 |
|---|---|
| Mobile 26 ストーリー（light） | 全て描画成功・スタイル適用あり |
| Mobile 26 ストーリー（dark） | 同上。`.dark` クラスでトークンが切り替わる |
| Web 12 ストーリー | 回帰なし |
| ランタイムエラー | 0 |

Mobile Button と Web Button が**同一のトークン値**を描画することも確認した。

| | Mobile Button | Web Button |
|---|---|---|
| 背景 (light) | `oklch(0.205 0 0)` | `oklch(0.205 0 0)` |
| 文字色 (light) | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` |
| 背景 (dark) | `oklch(0.922 0 0)` | — |

## 6. 既知の差分・残課題

- **ダークモードの切り替え方式がカタログと実機で異なる**（意図的）。
  カタログは `web.css` 由来の `.dark` クラス方式、`apps/mobile` は `native.css` 由来の
  `@media (prefers-color-scheme: dark)`。Storybook のテーマスイッチャーで Web / Native を
  同時に切り替えるための選択。トークンの値自体は `@workspace/tokens` が正本なので色は一致する。
- **ネイティブ専用の挙動は Storybook では検証できない**（`@media ios` / `android:` 等の
  NativeWind 独自バリアント、elevation、ripple、実機の safe-area inset）。
  現状 `packages/native-ui` はこれらを使っていないため実害はないが、
  使い始めたら実機 / Expo Go での確認が必要。
- `apps/mobile/src` 配下のストーリーは未登録（`packages/native-ui` のみ）。
  必要になったら `main.ts` の `stories` に足す。

## 7. 参考

- react-native-css `src/web/api.tsx` / `src/babel/react-native-web.ts` / `src/runtime.ts`（同梱ソース）
- react-native-web `dist/modules/createDOMProps/index.js`（className の上書き）
- react-native-web `dist/exports/StyleSheet/dom/createCSSStyleSheet.js`（head 先頭への挿入）
- [MDN: Cascade layers — レイヤー無しスタイルの優先順位](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [Storybook: React Native Web (Vite)](https://storybook.js.org/docs/get-started/frameworks/react-native-web-vite)
- [vite-plugin-rnw](https://www.npmjs.com/package/vite-plugin-rnw)（`babel` / `exclude` オプション）

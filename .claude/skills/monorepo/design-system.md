# デザインシステムの階層と共有境界

Web / Mobile / Desktop で「同じ見た目・同じ API」を保ちつつ、
各プラットフォームの表現力を犠牲にしないための構造。

## 何を共有し、何を共有しないか

判断の根拠は shadcn/ui 公式の設計思想
「コンポーネントはセマンティックな CSS 変数トークンを参照する。変数を変えれば全コンポーネントが変わる」。
つまり**共有するのはトークンと API であって、クラス文字列ではない**。
React Native 側の正統ポートである react-native-reusables も同じモデル
（同じコンポーネント名・同じトークン、コードはプラットフォーム別）を取る。

| 層 | 共有 | 実体 |
|----|------|------|
| 色（OKLCh 正本） | ✅ | `packages/tokens/src/colors.ts` |
| 角丸 | ✅ | `packages/tokens/src/radius.ts` |
| CSS 変数（Web / Desktop） | ✅ | `packages/tokens/web.css`（`.dark` クラス） |
| CSS 変数（Native） | ✅ | `packages/tokens/native.css`（`@media (prefers-color-scheme: dark)`） |
| hex 解決値 | ✅ | `packages/tokens/src/oklch.ts` の `resolvedColors` |
| **API 契約**（バリアント名 / サイズ名 / 既定値 / 要求トークン） | ✅ | `packages/tokens/src/contract.ts` |
| **Tailwind クラス文字列** | ❌ | `packages/ui/src/components/*` / `packages/native-ui/components/*` |

**クラス文字列を共有しない理由**: Web は `hover:` `focus-visible:` `shadow-xs` `[&_svg]` を
必要とし、React Native はそれらを表現できない。共有すると**最小公倍数まで Web を劣化させる**。

**ダークモードの切り替え方が違う点に注意**。Web は `.dark` クラス（next-themes 方式）、
Native はクラスを付ける DOM が無いので `prefers-color-scheme`。だから CSS を 2 種類生成している。
Native 側で `.dark { ... }` を書いても何も起きない。

## 生成物とビルド

`web.css` / `native.css` は **生成物**。手で編集せず、`colors.ts` / `radius.ts` を直してから:

```bash
cd frontend && bun run tokens:build
```

`packages/tokens` にはクラス文字列が無いので、Tailwind の `@source` に tokens を含める必要はない。
クラス文字列を持つのは `packages/ui` と `packages/native-ui` だけ。

## CSS エントリの持ち方

共有 UI パッケージに**アプリ固有のパスを書かない**。書いた瞬間、そのパッケージは
特定アプリに結合して他アプリ（デスクトップ等）から使えなくなる。

```css
/* packages/ui/src/styles/globals.css — 自分自身だけを走査 */
@import "tailwindcss" source(none);
@import "@workspace/tokens/web.css";
@source "../../";
@custom-variant dark (&:is(.dark *));
```

```css
/* apps/web/src/app/styles/globals.css — アプリは自分のパスだけ足す */
@import "@workspace/ui/styles/globals.css";
@source "../../../app";
@source "../../../src";
```

```css
/* apps/mobile/global.css */
@import "@workspace/tokens/native.css";
@source "./app";
@source "./src";
@source "../../packages/native-ui";
```

Web の CSS エントリを FSD の app レイヤー（`src/app/styles/`）に置くのは、
`app/**` 同士の import を禁じる ESLint 境界ルールを満たすため。

## 逸脱を止める仕組み

規約を文章で書くだけでは守られないので、機構で止める。

| 逸脱 | 検知 | 仕組み |
|------|------|--------|
| 片方だけにバリアント / サイズを足す・消す | **コンパイル時** | 各実装の `satisfies Record<ButtonVariant, string>` |
| 契約が要求するセマンティックトークンを使っていない | テスト | `BUTTON_SEMANTICS` との照合 |
| 生パレット（`bg-zinc-900` / `text-white`）を使う | テスト | `RAW_COLOR_PATTERN` |

テストは各プラットフォームのパッケージが自分で持つ（依存の向きを一方向に保つため）:

- `packages/ui/src/components/__tests__/button.test.tsx`
- `packages/native-ui/components/button/__tests__/variants.test.ts`

## 両プラットフォームにコンポーネントを足す手順

1. `packages/tokens/src/contract.ts` に名前・既定値・要求セマンティックトークンを追加
2. Web: `packages/ui/src/components/<name>.tsx`
   （shadcn の canonical なクラスを保ちつつ variants マップに `satisfies` を付ける）
3. Mobile: `packages/native-ui/components/<name>/variants.ts` + `index.tsx`
   （クラス定義を RN 非依存の別ファイルに分けると、テストと Storybook から読める）
4. 双方に適合テスト
5. 双方に Storybook（UI は単体テストでなく Storybook で担保する）

## shadcn コンポーネントを編集してよいか

**よい。** shadcn 公式の customization ガイドは「variant を足したいときは
コンポーネントソースを編集する」を推奨手順として明記しており、
upstream の更新はローカル改変を保ったままマージできる:

```bash
bunx shadcn@latest add button --dry-run        # 影響ファイルを確認
bunx shadcn@latest add button --diff button.tsx # 差分を確認してから取り込む
```

`--overwrite` はローカル改変を捨てるので、ユーザーの明示的な承認なしに使わない。

## デスクトップアプリを足すとき

Electron / Tauri など Web 技術ベースのホストは `@workspace/ui` をそのまま使える。
必要なのは CSS エントリ 3 行（上の `apps/web` の例と同じ形）だけで、
`packages/ui` 側には一切手を入れない。手を入れる必要が出たなら、
それは共有パッケージがアプリ固有の何かを抱え込んでいるサイン。

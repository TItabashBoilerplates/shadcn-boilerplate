---
name: gluestack
description: 本リポジトリで gluestack-ui + NativeWind v5 のモバイル UI を書く / 直す / 追加するときの規約。packages/native-ui の構成、@workspace/tokens/contract によるバリアント契約、v5 の正しい import パス（@gluestack-ui/core の creator・@gluestack-ui/utils/nativewind-utils）、tva の書き方、Provider の役割、新規コンポーネント追加手順（適合テスト + Storybook 必須）を提供。Mobile のボタン・カード・モーダル・トースト等の UI 実装、className が効かない、tva/variant の追加、gluestack のバージョン差異でハマったとき、apps/mobile や packages/native-ui のファイルを触るときは必ず最初に起動すること。gluestack 一般の設計原則は公式スキル gluestack-ui-v5 に委譲する。
---

# gluestack-ui（本リポジトリ規約）

Mobile の UI ライブラリは **gluestack-ui v5 + NativeWind v5**。このスキルは
**本リポジトリ固有の配置・契約・落とし穴**だけを扱う。

## 先に読むもの（公式スキル）

一般的な設計原則・コンポーネントカタログ・パフォーマンスは**公式スキルが正本**なので、
そちらを先に起動すること。ここに同じ内容を写経しない（drift の元になる）。

| 目的 | 起動するスキル | 出典 |
|------|---------------|------|
| gluestack の設計原則・コンポーネント・variants・検証 | **`gluestack-ui-v5`** | `gluestack/agent-skills`（公式） |
| NativeWind v5 / react-native-css のセットアップと制約 | `expo-tailwind-setup` | `expo/skills`（公式） |
| モノレポ全体の責務分担・デザインシステム階層 | `monorepo` | 本リポジトリ |

> **v4 系のスキル（`gluestack-ui-v4`）は意図的に入れていない。** このリポジトリは v5
> （`@gluestack-ui/core@^5` / `@gluestack-ui/utils@^5`）で、v4 スキルは
> 「v4.gluestack.io のドキュメントのみ使え」「`@gluestack-ui/core@alpha` を入れろ」と
> 指示するため、この構成では誤誘導になる。v4 の情報が必要になったときだけ
> `npx skills add gluestack/agent-skills` で入れ直すこと。

## 配置

```
frontend/packages/native-ui/          # @workspace/native-ui（Mobile 専用 UI）
├── components/
│   ├── button/
│   │   ├── index.tsx                 # コンポーネント本体（RN に依存）
│   │   ├── variants.ts               # クラス定義（RN 非依存＝テスト・Storybook から読める）
│   │   ├── button.stories.tsx        # Storybook（UI は単体テストでなく Storybook で担保）
│   │   └── __tests__/variants.test.ts # 契約への適合テスト
│   ├── gluestack-ui-provider/        # OverlayProvider + ToastProvider だけ
│   └── index.ts                      # Public API
├── constants/                        # JS 側テーマ値（hex 解決済み）
├── hooks/
└── layout/
```

**`variants.ts` を本体から分離するのは意図的**。`index.tsx` は `react-native` を import するため
Vitest（jsdom）から読めない。クラス定義を純粋モジュールに切り出すことで、適合テストと
Storybook がコンポーネントを起動せずに検証できる。新規コンポーネントもこの形に倣うこと。

## import パスは v5 のものを使う

v1 時代の単体パッケージや、更新の止まった `@gluestack-ui/nativewind-utils` を掴まないよう注意。

```ts
// ✅ v5 の正しい import
import { createButton } from '@gluestack-ui/core/button/creator'
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator'
import { ToastProvider } from '@gluestack-ui/core/toast/creator'
import { tva, useStyleContext, withStyleContext } from '@gluestack-ui/utils/nativewind-utils'

// ❌ v1 時代の単体パッケージ（core に統合済み）
import { createButton } from '@gluestack-ui/button'

// ❌ 2025-09 以降更新が止まった standalone（@gluestack-ui/utils に統合済み）
import { tva } from '@gluestack-ui/nativewind-utils/tva'
```

依存は `@gluestack-ui/core` と `@gluestack-ui/utils` の 2 つに寄せる。

## バリアントは `@workspace/tokens/contract` が正本

Web (`@workspace/ui`) と Mobile で**同じコンポーネント API** を保つため、
バリアント名・サイズ名・既定値は共有契約から取る。クラス文字列だけがプラットフォーム別。

```ts
// packages/native-ui/components/button/variants.ts
import { tva } from '@gluestack-ui/utils/nativewind-utils'
import { BUTTON_DEFAULTS, type ButtonSize, type ButtonVariant } from '@workspace/tokens/contract'

export const buttonStyle = tva({
  base: 'flex-row items-center justify-center gap-2',
  variants: {
    variant: {
      default: 'bg-primary',
      // ... 全バリアントを網羅
    } satisfies Record<ButtonVariant, string>,   // ← 片側だけ増減すると型エラー
    size: {
      /* ... */
    } satisfies Record<ButtonSize, string>,
  },
  defaultVariants: BUTTON_DEFAULTS,
})
```

`satisfies` を付けるのが肝。これが Web との API 一致を**コンパイル時に**強制する。
外すと静かに drift する。

## スタイリングのルール

- **セマンティックトークンのみ**: `bg-primary` / `text-foreground` / `border-input`。
  `bg-zinc-900` `text-white` のような生パレットは適合テストが弾く。
- **`hover:` / `focus-visible:` / `shadow-*` / `[&_svg]` は使えない**（RN に無い）。
  Web 側の Button がそれらを持っているのは正しく、共有してはいけない。
- **アイコンサイズは直接当てる**。RN に子孫セレクタが無いので Web の `[&_svg]:size-4` 相当は
  `buttonIconStyle` でアイコン自身に付ける。
- 色は `@workspace/tokens` が正本。`constants/theme.ts` は
  react-navigation など **hex しか受け取れない API** 専用の出口で、ここで新しい色を定義しない。

## Provider の役割は限定的

`GluestackUIProvider` は **overlay / toast のポータルを張るだけ**。
デザイントークンは `apps/mobile/global.css`（→ `@workspace/tokens/native.css`）から供給されるので、
Provider で色を注入したり color scheme を制御したりしない。
`apps/mobile/src/app/providers/AppProvider.tsx` で `ThemeProvider` の内側に配置済み。

## 新規コンポーネントを足す手順

1. **公式スキル `gluestack-ui-v5` を起動**して、そのコンポーネントの正しい構造を確認する
2. 両プラットフォームに置くなら、まず `packages/tokens/src/contract.ts` に
   バリアント名・サイズ名・既定値・要求セマンティックトークンを追加
3. `components/<name>/variants.ts` にクラス定義（`satisfies Record<...>` を付ける）
4. `components/<name>/index.tsx` に本体（`createButton` 相当の creator を使う）
5. `components/<name>/__tests__/variants.test.ts` に適合テスト
   （`BUTTON_SEMANTICS` 相当の照合 + `RAW_COLOR_PATTERN` チェック。Button のテストをコピーするのが早い）
6. `components/<name>/<name>.stories.tsx` に Storybook
   （UI は単体テストでなく Storybook で担保する。`.claude/rules/ui-testing.md`）
7. `components/index.ts` に Public API を追加

CLI で雛形を取る場合は `bun run ui:add:mobile <component>`（= `bunx gluestack-ui@latest add`）。
生成物は v4 前提のことがあるので、**上記の import パスとトークン規約に必ず直す**。

## よくある詰まり

| 症状 | 原因 |
|------|------|
| `className` が効かない | NativeWind v5 は既定で RN プリミティブに `className` を生やさない。`metro.config.js` の `globalClassNamePolyfill: true` が要る（設定済み） |
| 新しいクラスだけスタイルが当たらない | Tailwind の走査対象外。`apps/mobile/global.css` の `@source` にそのパッケージが含まれているか確認 |
| `tailwind.config.ts` を探しても無い | v5 / Tailwind v4 は CSS-first。設定は `global.css` にある |
| ダークモードが効かない | native は `.dark` クラスでなく `@media (prefers-color-scheme: dark)`。`.dark` を書いても無意味 |
| native バンドルが lightningcss で落ちる | `lightningcss` はルートの `overrides` で 1.30.1 に固定している。外さない |

## 検証

```bash
type-check-mobile     # 契約との型一致（satisfies）
test-frontend         # 適合テスト（トークン規律・命名一致）
lint-fsd              # FSD 境界
```

ネイティブのバンドルまで確認したいときは
`cd frontend/apps/mobile && bunx expo export --platform ios --clear`。

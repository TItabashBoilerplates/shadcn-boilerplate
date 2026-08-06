# Web モバイル — Next.js 16 + Tailwind CSS v4 + shadcn/ui

対象: `frontend/apps/web`, `frontend/packages/ui`。

> **前提**: このリポジトリの `apps/web` には現時点で **`viewport` export が存在しない**
> （`app/[locale]/layout.tsx` は `generateMetadata` のみ）。§1 が最初の作業になる。

---

## 1. viewport 設定（すべての土台）

Next.js 16 では `viewport` export で meta viewport を制御する。**`app/[locale]/layout.tsx`
に追加する。**

```tsx
// apps/web/app/[locale]/layout.tsx
import type { Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // ノッチ／ホームインジケータ領域まで描画を広げる。
  // これが無いと env(safe-area-inset-*) は常に 0px になる。
  viewportFit: 'cover',
  // 仮想キーボード表示時に「レイアウトビューポートごと」縮める。
  // position: fixed の下部 CTA がキーボードの上に押し上げられる（§4）。
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}
```

> **型の裏取り済み**: `viewportFit?: 'auto' | 'cover' | 'contain'` と
> `interactiveWidget?: 'resizes-visual' | 'resizes-content' | 'overlays-content'` は
> インストール済み Next.js 16.3 の `next/dist/lib/metadata/types/extra-types.d.ts`
> （`ViewportLayout`）に定義されている。公式ドキュメントのフィールド一覧には `viewportFit` の
> 記載が漏れているが、型・出力ともにサポートされている。

### `interactiveWidget` の選び方

| 値 | 挙動 | 使いどころ |
|---|---|---|
| `resizes-visual`（ブラウザ既定） | ビジュアルビューポートのみ縮む。`position: fixed` はキーボードの**裏に隠れる** | 既定。何もしないとこれ |
| **`resizes-content`** | レイアウトビューポートごと縮む。**固定要素がキーボードの上に来る** | **下部固定 CTA / チャット入力がある画面（本リポの推奨）** |
| `overlays-content` | 一切縮まない。自力で `env(keyboard-inset-*)` を扱う | 特殊なケースのみ（Chromium 限定・§4 参照） |

### 禁止事項

```tsx
// ❌ 絶対に書かない
export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false,
}
```

**WCAG 1.4.4 (Resize Text) 違反**。「iOS のオートズームを止めたいから」という理由で
これをやってはならない。正解は**フォーム要素を 16px 以上にすること**
（`.claude/rules/form-controls.md` の強制ルール）。

---

## 2. safe-area（ノッチ / ホームインジケータ）

`viewportFit: 'cover'` を入れた瞬間、**コンテンツがノッチやホームバーの下に潜り込む**ように
なる。必ず inset とセットで入れること。

### Tailwind v4 でのユーティリティ定義

Tailwind CSS **v4.3 に safe-area ユーティリティは組み込まれていない**（v4.3 の新機能は
スクロールバー・`@container-size`・`zoom-*` / `tab-*` など）。プラグインも未導入なので、
**`@utility` で自前定義する**のが最小構成。

```css
/* frontend/packages/ui/src/styles/globals.css — 共有 UI パッケージ側に 1 か所だけ置く */

/* 最低限の余白を確保しつつ inset を足す（inset が 0 の端末でも余白が消えない） */
@utility pb-safe {
  padding-bottom: max(var(--spacing-4, 1rem), env(safe-area-inset-bottom));
}
@utility pt-safe {
  padding-top: max(var(--spacing-4, 1rem), env(safe-area-inset-top));
}
@utility px-safe {
  padding-left: max(var(--spacing-4, 1rem), env(safe-area-inset-left));
  padding-right: max(var(--spacing-4, 1rem), env(safe-area-inset-right));
}
/* 余白を足さず inset のみ（既に padding がある要素に重ねる用） */
@utility mb-safe {
  margin-bottom: env(safe-area-inset-bottom);
}
```

> **クラス文字列を各画面にコピペしないこと。** `.claude/rules/clean-code.md` の
> 「Tailwind のクラス文字列も重複コードである」に該当する。共有は `packages/ui` に 1 か所。
> （textarea のクラスを 6 ファイルにコピペして iOS オートズーム事故を起こした前例がある）

一度きりの用途なら任意値でも書ける: `pb-[env(safe-area-inset-bottom)]`。
ただし**同じものを 2 回書いた時点で `@utility` に昇格させる**。

### 適用箇所

| 要素 | 適用 |
|---|---|
| 画面下部固定の CTA / ボトムバー / タブバー | **`pb-safe` 必須** |
| 固定ヘッダー | `pt-safe` |
| 全画面モーダル・ボトムシート | 上下とも |
| 横向き対応する画面 | `px-safe`（横向き時のノッチは左右に来る） |

```tsx
// 下部固定 CTA の基本形
<div className="fixed inset-x-0 bottom-0 border-t bg-background px-4 pb-safe pt-3">
  <Button className="h-12 w-full">{t('submit')}</Button>
</div>
```

**固定要素を置いたら、スクロールコンテンツ側にも同じ高さの下パディングを足す**
（最後の項目が隠れる）。

---

## 3. 高さ — `100vh` を使わない

`vh` は**ブラウザ UI（アドレスバー）が隠れた状態の最大高**で固定される。そのため
モバイルでは初期表示で下が見切れ、スクロールでアドレスバーが縮むと高さが変わってガタつく。

| 単位 | 意味 | 使いどころ |
|---|---|---|
| `svh` | **Small** — ブラウザ UI が最大表示のときの高さ | **既定の選択**。コンテンツが絶対にはみ出てはいけない場合 |
| `lvh` | **Large** — UI が隠れたときの高さ（`vh` と同等） | ほぼ使わない |
| `dvh` | **Dynamic** — 現在の可視領域に追従 | 常に画面ぴったりにしたい場合。**UI 伸縮に追従して再レイアウトが走るのでカクつくことがある**。実機確認必須 |

```tsx
// ❌ min-h-screen（= 100vh）
<main className="min-h-screen">

// ✅ svh を既定にする
<main className="min-h-[100svh]">

// フルスクリーンのヒーロー等で追従させたい場合のみ dvh
<section className="h-[100dvh]">
```

対応状況: Chrome 108 / Safari 15.4 / Firefox 101 以降。2026 年時点でグローバル 90% 超。

---

## 4. 仮想キーボード

### 基本方針: `interactiveWidget: 'resizes-content'` で足りる

§1 を設定していれば、`position: fixed; bottom: 0` の CTA はキーボードの上に押し上げられ、
**大半のケースで追加実装は不要**。まずこれを試すこと。

### `env(keyboard-inset-*)` は使わない（重要）

`env(keyboard-inset-height)` は **VirtualKeyboard API に依存し、Chromium 系のみの実装**。
**Safari・Firefox は未実装**（Firefox は 2021 年からバグがオープンのまま）。
**iOS Safari が最大のターゲットであるモバイル Web で、これに依存した実装をしてはならない。**
使う場合も `navigator.virtualKeyboard.overlaysContent = true` の明示が必要で、
そこまでする価値はほぼない。

### 追加制御が必要な場合: `visualViewport`（portable な唯一の手段）

チャット入力欄など、キーボード高さを実測したい場合のみ。

```tsx
'use client'
import { useEffect, useState } from 'react'

/** 仮想キーボードが覆っている高さ(px)。非対応環境では常に 0。 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      // レイアウトビューポート下端と可視ビューポート下端の差 = キーボード高
      setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
```

配置は FSD に従い `apps/web/src/shared/hooks/`（複数アプリで使うなら `packages/ui/hooks/`）。

### 入力そのものの体験（見落とされやすい & 効果が大きい）

**適切なキーボードが出るだけで体感品質が大きく上がる。** 属性を必ず指定すること。

| 用途 | 属性 |
|---|---|
| メール | `type="email"` `inputMode="email"` `autoComplete="email"` `autoCapitalize="none"` |
| 電話 | `type="tel"` `inputMode="tel"` `autoComplete="tel"` |
| 数値（数量・年齢） | `inputMode="numeric"` `pattern="[0-9]*"` |
| 金額・小数 | `inputMode="decimal"` |
| 検索 | `type="search"` `inputMode="search"` `enterKeyHint="search"` |
| URL | `type="url"` `inputMode="url"` `autoCapitalize="none"` |
| ワンタイムコード | `autoComplete="one-time-code"` `inputMode="numeric"`（iOS の SMS 自動入力が効く） |
| パスワード | `autoComplete="current-password"` / `new-password` |
| 複数入力の最後 | `enterKeyHint="done"` / 途中は `"next"` |

```tsx
<Input
  type="email"
  inputMode="email"
  autoComplete="email"
  autoCapitalize="none"
  autoCorrect="off"
  enterKeyHint="next"
/>
```

> これらの属性は **`packages/ui` の共有コンポーネント側で受け渡せるようにする**。
> 画面ごとに `<input>` を直書きしない（`.claude/rules/form-controls.md`）。

---

## 5. hover / タップ挙動

### sticky hover（タップ後も hover が残る）

タッチデバイスではタップで `:hover` が適用され、「マウスが離れた」イベントが無いため
**hover スタイルが残り続ける**。

```css
/* Tailwind v4: hover をポインタデバイスに限定する custom variant */
/* packages/ui/src/styles/globals.css */
@custom-variant hover-device (@media (hover: hover) and (pointer: fine));
```

```tsx
// ❌ タッチで残る
<Card className="hover:bg-accent">

// ✅ ポインタデバイスのみ
<Card className="hover-device:hover:bg-accent active:bg-accent/70">
```

**すべての `hover:` に押下時の代替（`active:`）を用意する。** タッチでは hover が存在しない
ので、hover でしか出ない情報（ツールチップ・アクションボタン）は**モバイルで到達不能**になる。

### その他のタップ関連

```css
@layer base {
  /* iOS の青いタップハイライトを消す（ただし必ず :active で代替を用意すること） */
  html {
    -webkit-tap-highlight-color: transparent;
    /* iOS 横向きで本文が勝手に拡大されるのを防ぐ */
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
}
```

- **`touch-action`**: 自前でスワイプ/ドラッグを実装する要素には `touch-action: none`（Tailwind:
  `touch-none`）を付ける。付けないとブラウザのスクロールと競合してガタつく
- **`user-select`**: 長押しで文字選択されると困る操作系要素には `select-none`。ただし
  **本文テキストには絶対に付けない**（コピーできなくなる）

---

## 6. スクロール

```css
@layer base {
  /* オーバースクロール時に親（ページ）まで連鎖するのを防ぐ。
     モーダル内スクロールで背後のページが動く問題や、Android の pull-to-refresh 誤発火を防ぐ */
  .scroll-area {
    overscroll-behavior: contain;
  }
}
```

| 問題 | 対処 |
|---|---|
| モーダル内をスクロールし切ると背後が動く | スクロールコンテナに `overscroll-behavior: contain`（`overscroll-contain`） |
| 上端で引っ張ると意図せずページが再読込される（Android Chrome） | `overscroll-behavior-y: contain` |
| モーダル表示中に背後がスクロールする | Radix Dialog は既定でスクロールロックする。**自前モーダルを作らず shadcn の Dialog / Drawer を使う** |
| 一覧 → 詳細 → 戻るで先頭に戻る | Next.js の scroll restoration に任せ、`scroll={false}` を安易に付けない |
| 横スクロールが発生する | §8 |

**`position: fixed` + `overflow: hidden` による自前スクロールロックは iOS でスクロール位置が
飛ぶ**ので書かない。Radix（shadcn）に任せる。

---

## 7. モーダル / ボトムシート

**デスクトップの中央ダイアログをモバイルにそのまま出すと、幅いっぱいで窮屈になり、
閉じるボタンが遠く（画面上部）になる。**

| 用途 | モバイルでの正解 |
|---|---|
| 確認・警告（短い） | 中央ダイアログのままでよい（`Dialog`） |
| 入力フォーム・選択肢・詳細 | **ボトムシート**（下から出る。指が届く位置に操作が来る） |
| 一時的な通知 | トースト（**下部**に出す。上部だと通知バーと紛らわしい） |
| 選択肢が多い | 全画面 or ボトムシート。ネイティブ `<select>` は 16px 必須（`form-controls.md`） |

### 実装方針

`packages/ui` には現在 `dialog.tsx`（Radix Dialog）のみで、**Drawer / ボトムシートは未導入**。
必要になった場合の選択肢:

1. **`vaul`（shadcn の Drawer）を追加する** — Radix Dialog 互換 API でドラッグ可能な
   ボトムシートが得られる。追加は `bun run ui:add:web drawer`（未導入なのでユーザーに諮ること）
2. **Dialog をレスポンシブに使い分ける** — 追加依存なしで済ませる場合

```tsx
// 追加依存なしで済ませる場合の考え方（実装は packages/ui に共有化する）
// モバイルでは下端に貼り付け、デスクトップでは中央に置く
<DialogContent
  className="
    fixed bottom-0 top-auto left-0 right-0 translate-x-0 translate-y-0
    max-h-[85svh] w-full rounded-t-2xl rounded-b-none pb-safe
    sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg
    sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl
  "
>
```

**ボトムシートには上部にグラバー（つまみ）を置く**とドラッグできることが伝わる。
**閉じる手段は 2 つ以上**用意する（背景タップ / スワイプダウン / 閉じるボタン）。

---

## 8. レイアウト — 横スクロールを出さない

横スクロールの発生は**モバイルで最も目立つ破綻**。原因はほぼ次のいずれか。

| 原因 | 対処 |
|---|---|
| 固定 `width` / `min-width` | `w-full` + `max-w-*` に変える |
| 長い URL・英単語・ID が折り返さない | `break-words`（`overflow-wrap: anywhere`）を付ける |
| テーブルをそのまま出している | 下記 |
| 画像に `max-w-full` が無い | `packages/ui` 側で `img { max-width: 100% }` を base に入れる |
| flex 子要素が縮まない | `min-w-0` を付ける（flex アイテムの既定 `min-width: auto` が原因） |
| `100vw` を使っている | スクロールバー幅を含むので `w-full` にする |

```css
@layer base {
  /* 横スクロールの発生源を根本で塞ぐ */
  html,
  body {
    overflow-x: hidden;
  }
}
```
> ただし `overflow-x: hidden` は**症状を隠すだけ**。原因側（`min-w-0` など）を必ず直すこと。

### テーブル

```tsx
// ❌ そのまま出す
<Table>...</Table>

// ✅ A: モバイルはカードリスト、デスクトップはテーブル（推奨）
<div className="md:hidden">{rows.map((r) => <RecordCard key={r.id} {...r} />)}</div>
<div className="hidden md:block"><Table>...</Table></div>

// ✅ B: 意図的に横スクロールさせる（列が本質的に多い場合）
<div className="-mx-4 overflow-x-auto px-4">
  <Table className="min-w-[640px]" />
</div>
```

### ブレークポイント規律

- **モバイルファースト**: 素のクラスがモバイル、`sm:` / `md:` で拡張する。
  `md:` を基準に書いて `max-md:` で戻すのは逆流であり、破綻の温床
- 本リポの分岐点は実質 `md`（768px）。**`sm:`(640px) を「モバイル」と誤解しない**
- **375px で必ず確認**（[foundations.md](foundations.md) §9）

---

## 9. 画像・メディア

- `next/image` を使い、**`sizes` を必ず指定**する（未指定だとモバイルにデスクトップ用の
  巨大画像が配られる）

```tsx
<Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" />
```

- **アスペクト比を先に確保**して CLS を防ぐ: `aspect-video` / `aspect-square`
- ファーストビューの画像のみ `priority`、それ以外は遅延（既定）

---

## 10. 検証

- **375px 幅**で全画面を確認
- **実機（最低 iOS Safari 1 台）で確認**。DevTools のデバイスモードは
  **safe-area・キーボード・慣性スクロール・sticky hover を再現しない**
- Storybook にモバイル幅のストーリーを必ず用意する（`.claude/rules/ui-testing.md`）
- `web-design-guidelines` スキル（Vercel）でアクセシビリティ監査を併走させる

---

## 参考

- [MDN: env() / safe-area-inset](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [web.dev: The large, small, and dynamic viewport units](https://web.dev/blog/viewport-units)
- [Tailwind CSS v4.3 release notes](https://tailwindcss.com/blog/tailwindcss-v4-3)
- [Tailwind CSS: Functions and directives (`@utility` / `@custom-variant`)](https://tailwindcss.com/docs/functions-and-directives)
- [Next.js: generateViewport](https://nextjs.org/docs/app/api-reference/functions/generate-viewport)
- [HTMHell: Control the Viewport Resize Behavior with `interactive-widget`](https://www.htmhell.dev/adventcalendar/2024/4/)
- [MDN: VirtualKeyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)（Chromium 限定）
- [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- [CSS-Tricks: Solving Sticky Hover States with `@media (hover: hover)`](https://css-tricks.com/solving-sticky-hover-states-with-media-hover-hover/)
- [MDN: overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior)

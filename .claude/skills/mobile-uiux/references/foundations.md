# Foundations — プラットフォーム共通のモバイル品質基準

Web / Native どちらでも同じく効く基準。**数値は根拠つきで示す**ので、迷ったらここの値を使う。

---

## 1. タップ領域（最重要・違反頻度が最も高い）

### 基準値

| 規格 | 最小サイズ | 位置づけ |
|---|---|---|
| WCAG 2.2 **2.5.8 Target Size (Minimum)** — Level **AA** | **24×24 CSS px** | 法的な最低ライン（下限であって推奨値ではない） |
| WCAG 2.2 **2.5.5 Target Size (Enhanced)** — Level **AAA** | **44×44 CSS px** | 推奨 |
| Apple **Human Interface Guidelines** | **44×44 pt** | iOS の実質標準 |
| Google **Material Design** | **48×48 dp** | Android の実質標準 |

> **本リポジトリの基準: 実効 44×44px 以上（Android 向けの主要操作は 48dp を推奨）。**
> WCAG AA の 24px は「これを下回ると明確な違反」という下限であり、これを目標にしない。

### 「実効」の意味 — 見た目は小さくてよい

視覚的なサイズと**タップ判定領域**は分離できる。アイコンボタンを 44px の四角にすると
デザインが間延びするので、**見た目 24px + 余白/hitSlop で判定を 44px に広げる**のが正解。

```tsx
// Web: 見た目は 20px アイコン、判定は 44px
<button className="inline-flex size-11 items-center justify-center">
  <X className="size-5" />
</button>

// Web: レイアウトを崩さずに判定だけ広げる（疑似要素）
// packages/ui 側で共有ユーティリティ化すること（クラス文字列のコピペ禁止 / clean-code.md）
<button className="relative size-5 after:absolute after:-inset-3 after:content-['']">
  <X className="size-5" />
</button>
```

```tsx
// Native: hitSlop で判定だけ広げる
<Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel={t('close')}>
  <Icon size={20} />
</Pressable>
```

> ⚠️ **Native の落とし穴**: `hitSlop` で広げた領域は **Android の TalkBack のフォーカス矩形には
> 反映されない**（[react-native#32089](https://github.com/facebook/react-native/issues/32089)）。
> レイアウトを変えられるなら **padding で広げるほうが確実**。`hitSlop` は
> 「padding だと崩れる場合の次善策」と位置づける。

### 要素間の間隔

隣接するタップ対象の**中心間距離が 44px 未満**だと、サイズを満たしていても誤タップが起きる。

- リスト行内のアイコンを並べるときは **最低 8px の間隔**（44px 判定同士なら実質接触しない）
- 破壊的操作（削除・退会）は、隣接する安全な操作から**物理的に離す**か、確認を挟む

---

## 2. サムゾーン（親指の到達範囲）— 「押しづらい」の正体

片手持ちの親指は**画面下部中央がもっとも到達しやすく、上部の対角がもっとも遠い**。
画面が大きいほどこの差は深刻になる。

```
┌─────────────┐
│  遠い       │ ← 戻る/閉じる、破壊的操作、補助情報を置く
│             │
│  普通       │ ← コンテンツ本体
│             │
│  近い       │ ← 主要 CTA、タブバー、送信ボタンを置く
└─────────────┘
```

### 具体的な設計ルール

| 置くもの | 位置 |
|---|---|
| 主要 CTA（保存・送信・購入・次へ） | **画面下部固定**（sticky / ボトムバー） |
| 主要ナビゲーション | **ボトムタブ**（3〜5 個。ハンバーガーメニューより優先） |
| 破壊的操作・閉じる | 上部（誤タップさせない意図がある場合） |
| 検索・フィルタ | 下部または到達しやすい位置。ヘッダー右上の虫眼鏡は最も遠い |

> **デスクトップの「右上に保存ボタン」をそのままモバイルに持ってこない。**
> §0 の根本原因 1（デスクトップ設計の縮小）の典型。

**下部固定要素には必ず safe-area inset を入れる**（Web は [web.md](web.md) §2、Native は
[native.md](native.md) §1）。

---

## 3. タイポグラフィと文字サイズ

| 項目 | 基準 |
|---|---|
| 本文 | **16px 以上**（モバイル）。14px は補助テキストまで |
| **フォーム要素**（input / textarea / native select / contenteditable） | **16px 必須**。下回ると **iOS Safari がフォーカス時に自動ズーム**する → **`.claude/rules/form-controls.md`（本リポの強制ルール）** |
| 補助・キャプション | 12〜14px。これ未満は使わない |
| 行長 | 45〜75 文字目安。モバイル幅では自然に収まるが、`max-w-*` の付けすぎで狭くなりすぎないこと |
| 行間 | 本文 1.5 前後（WCAG 1.4.12 は 1.5 倍まで崩れないことを要求） |
| タップ可能なテキストリンク | 単独行なら §1 の 44px を満たすよう `py-*` を付ける |

### 端末のフォントサイズ設定（見落とし多発）

ユーザーは OS 設定でフォントを拡大できる。**固定高さ + 拡大フォント = テキスト切れ**。

- **Web**: `height` 固定を避け `min-height` にする。WCAG 1.4.4 により **200% までのズームで
  情報・機能が失われてはならない**。→ `user-scalable=no` / `maximum-scale=1` は**禁止**
  （[web.md](web.md) §1）
- **Native**: `<Text>` はデフォルトで端末設定に追従する。**`allowFontScaling={false}` で無効化しない**。
  レイアウト崩壊が本当に問題な箇所だけ `maxFontSizeMultiplier`（1.3〜1.5 程度）で上限を設ける

```tsx
// ❌ アクセシビリティを殺す
<Text allowFontScaling={false}>{label}</Text>

// ✅ 上限だけ設ける（崩壊防止と可読性の両立）
<Text maxFontSizeMultiplier={1.4}>{label}</Text>
```

---

## 4. モーション

| 用途 | 目安時間 |
|---|---|
| 押下・ホバー等の微小フィードバック | 100〜150ms |
| 要素の出現・消失、展開 | 200〜300ms |
| 画面遷移 | 250〜400ms（OS 標準に合わせるのが最良） |

- **500ms を超えるアニメーションは遅く感じる**。「リッチにする」ために伸ばさない
- **アニメーションするのは `transform` と `opacity` を優先**（レイアウトを動かすとカクつく）
- **入場より退場を速く**すると、キビキビ感が出る
- 位置の移動には ease-out 系、消える要素には ease-in 系

### Reduce Motion の尊重（必須）

前庭障害のあるユーザーにとって大きなモーションは実害がある。

```css
/* Web: 一括で抑制する土台。packages/ui の globals.css に置く */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```tsx
// Native: react-native の AccessibilityInfo で検出
import { AccessibilityInfo } from 'react-native'
const reduce = await AccessibilityInfo.isReduceMotionEnabled()
```

**完全に消すのではなく、移動・拡大を伴うものをフェードに置き換える**のが望ましい。

---

## 5. フィードバックと知覚時間

人間の知覚しきい値（Nielsen の古典的な区分）に沿って設計する。

| 経過時間 | ユーザーの感覚 | 必要な対応 |
|---|---|---|
| **〜100ms** | 「即座」 | 何もしなくてよい。**押下フィードバックはこの範囲で返す** |
| **〜1s** | 「引っかかったが流れは切れない」 | 遷移なら何も出さなくてよい。ボタンは disabled + 状態変化 |
| **〜10s** | 「待たされている」 | **進捗表示が必須**。skeleton / プログレス |
| **10s〜** | 離脱 | 進捗率・キャンセル手段・バックグラウンド化 |

### 押下フィードバックは必須（「チープ」の主因）

タップして何も起きない 300ms が、体感品質を最も損なう。

```tsx
// Web: :active を必ず持たせる。hover はメディアクエリで囲う（web.md §5）
className="transition-[transform,opacity] duration-100 active:scale-[0.98] active:opacity-90"
```

```tsx
// Native: Pressable の pressed を使う
<Pressable className="active:opacity-80">{/* NativeWind の active: が使える */}</Pressable>
// または
<Pressable style={({ pressed }) => [styles.base, pressed && styles.pressed]} />
```

### 楽観的更新

「いいね」「お気に入り」「チェック」のような**失敗が稀で影響が小さい操作**は、
サーバー応答を待たずに UI を先に更新する。失敗時はロールバック + トースト。
実装は `tanstack-query` スキル（`onMutate` / `onError` でのロールバック）に従う。

> ⚠️ ただし**エラーを握りつぶさないこと**。ロールバック時は必ずログ + ユーザーへの通知
> （`.claude/rules/error-handling.md`）。

---

## 6. 状態設計（loading / empty / error / offline）

**「正常系だけ実装されている画面」は必ず微妙になる。** 以下 4 状態はセットで設計する。

| 状態 | やること | やってはいけないこと |
|---|---|---|
| **loading** | **skeleton**（実際のレイアウトと同じ形）で領域を予約する | 画面中央に spinner だけ置く／領域を予約せず後からガタッと押し下げる |
| **empty** | 何が無いのかの説明 + **次に取るべき行動（CTA）** | 「データがありません」だけ／真っ白 |
| **error** | 何が起きたか + **再試行手段**。原因が分かるなら具体的に | 無言で握りつぶす／`null` を返して空表示にする |
| **offline / 部分失敗** | 取得済みデータは残し、失敗部分だけ明示 | 全画面をエラーに差し替える |

- **spinner より skeleton**: 待ち時間の体感が短くなり、レイアウトシフト（CLS）も防げる
- **領域予約**: 画像・非同期コンテンツには必ず高さ/アスペクト比を先に与える
- Storybook では **Default / Loading / Empty / Error の 4 ストーリーが必須**
  （`.claude/rules/ui-testing.md`）

---

## 7. 情報密度とナビゲーション

- **1 画面 = 1 目的**。デスクトップの 3 カラムを縦積みするのではなく、**何を切り捨てるか**を決める
- 主要ナビゲーションは **ボトムタブ 3〜5 個**。それを超えるならグループ化を見直す
  （ハンバーガーメニューは発見率が低いので、副次的な導線に限る）
- **階層は浅く**。3 階層を超えると戻る操作が苦痛になる
- 長いフォームは**ステップ分割**し、進捗を示す
- スクロール位置は**戻ったときに復元**する（一覧 → 詳細 → 戻る で先頭に戻るのは最悪の体験）

---

## 8. コントラストと屋外可読性

- WCAG 1.4.3 (AA): 通常テキスト **4.5:1**、大きいテキスト（24px / 太字 18.66px 以上）**3:1**
- WCAG 1.4.11: UI コンポーネント・グラフィックの境界 **3:1**
- **モバイルは屋外・低輝度・斜めから見られる**ので、AA ぎりぎりは実質不足。主要テキストは
  余裕を持たせる
- 色は `@workspace/tokens` が正本。**画面側でハードコードした色を使わない**（`monorepo` スキル）
- **色だけで情報を伝えない**（WCAG 1.4.1）。エラーは赤 + アイコン + テキスト

---

## 9. 検証方法

| やること | 理由 |
|---|---|
| **375px 幅**で確認（iPhone SE / mini 相当） | 最も狭い実用幅。ここで破綻しなければ大半は通る |
| **実機で確認**（最低 1 台） | ブラウザの DevTools は safe-area・キーボード・慣性スクロール・タップ判定を**再現しない** |
| OS のフォントサイズを最大にして確認 | §3 の崩壊を検出 |
| Reduce Motion をオンにして確認 | §4 |
| 片手で持って親指だけで操作してみる | §2 のサムゾーン検証はこれが最速 |

---

## 参考

- [WCAG 2.2 SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WCAG 2.2 SC 2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Material Design — Accessibility](https://m3.material.io/foundations/designing/structure)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

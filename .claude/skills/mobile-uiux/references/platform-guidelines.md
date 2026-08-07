# Apple HIG / Google Material・Android 公式規約 — 原典の数値

**このファイルは「公式が実際に何と言っているか」の原典。** 本リポジトリ向けの運用基準は
[foundations.md](foundations.md) にあるが、**根拠を確認したい / 数値で議論したい / 端末側の
仕様変更を追いたいときはここを見る。**

> ⚠️ **推測で「Apple はこう言っている」と書かないこと。** ここに載っている値はすべて
> 一次情報（Apple HIG の DocC データ / developer.android.com / androidx の
> Material 3 トークン実装）から取得している。載っていない主張をしたくなったら、
> 先に出典を取ること（`.claude/rules/research.md`）。

---

## 0. 単位の対応（読み違えないための前提）

| 単位 | 定義 | 実務上の対応 |
|---|---|---|
| **pt**（Apple） | 論理ピクセル。@2x / @3x で物理ピクセルに展開される | モバイル Web の **CSS px と 1:1** で考えてよい |
| **dp**（Android） | 密度非依存ピクセル（1dp = 1/160 inch） | 同上。**48dp ≒ 48 CSS px** |
| **sp**（Android） | dp にユーザーのフォントスケール設定を掛けたもの | **文字サイズには必ず sp**。dp を使うと端末のフォント設定を無視する |
| **CSS px** | Web の論理ピクセル | Tailwind の `size-11` = 44px、`size-12` = 48px |

**つまり `44pt` / `48dp` / `44px` は同じ土俵で比較してよい。** 本リポジトリは Web も Native も
Tailwind 系のクラスで書くため、以降は **px 換算で併記**する。

---

## 1. タップ領域（最も参照される数値）

### Apple HIG — プラットフォーム別のコントロールサイズ

Apple は **「推奨（default）」と「最小（minimum）」を分けて定義している**。
44×44 は *最小* ではなく *推奨* である点に注意。

| プラットフォーム | Default | Minimum |
|---|---|---|
| **iOS, iPadOS** | **44×44 pt** | **28×28 pt** |
| macOS | 28×28 pt | 20×20 pt |
| tvOS | 66×66 pt | 56×56 pt |
| visionOS | 60×60 pt | 28×28 pt |
| watchOS | 44×44 pt | 28×28 pt |

### Apple HIG — 要素間のパディング（見落とされがち）

> "In general, it works well to add about **12 points of padding** around elements that include a
> bezel. For elements without a bezel, about **24 points of padding** works well around the
> element's visible edges."

**枠のあるボタン → 周囲 12pt / 枠のないアイコン・テキストボタン → 周囲 24pt。**
「アイコンだけのボタンが押しにくい」の原因はほぼこれ（サイズではなく間隔）。

### Google — Material 3 / Android

> "Ensure all touch targets are at least **48 dp**, even if this extends past the UI element visual."

Material 3 のボタングループでは、**ボタンのサイズが変わってもパディング側で調整して 48dp の
ターゲット面積を維持する**設計になっている（見た目のサイズ ≠ ターゲットサイズ）。

### WCAG 2.2

| 達成基準 | 最小 | レベル |
|---|---|---|
| 2.5.8 Target Size (Minimum) | 24×24 CSS px | AA |
| 2.5.5 Target Size (Enhanced) | 44×44 CSS px | AAA |

### → 本リポジトリの運用値

**実効 44×44px 以上**（Android 主体の主要操作は 48px）。Tailwind では `size-11` / `size-12`。
WCAG AA の 24px は「下回ったら明確な違反」の下限であって目標値ではない。
詳細な実装パターンは [foundations.md](foundations.md) §1。

---

## 2. タイポグラフィ

### Apple — iOS / iPadOS の Dynamic Type スケール（Large = 既定サイズ時）

| Text Style | Weight | Size | Leading | 強調時 |
|---|---|---|---|---|
| Large Title | Regular | 34 pt | 41 pt | Bold |
| Title 1 | Regular | 28 pt | 34 pt | Bold |
| Title 2 | Regular | 22 pt | 28 pt | Bold |
| Title 3 | Regular | 20 pt | 25 pt | Semibold |
| Headline | Semibold | 17 pt | 22 pt | Semibold |
| **Body** | Regular | **17 pt** | 22 pt | Semibold |
| Callout | Regular | 16 pt | 21 pt | Semibold |
| Subhead | Regular | 15 pt | 20 pt | Semibold |
| Footnote | Regular | 13 pt | 18 pt | Semibold |
| Caption 1 | Regular | 12 pt | 16 pt | Semibold |
| Caption 2 | Regular | 11 pt | 13 pt | Semibold |

**iOS の本文既定は 17pt。** Web の 16px 基準より 1px 大きい。「モバイルで文字が小さく感じる」
と言われたら、まずこのスケールと比較すること。

### Apple — カスタムフォント使用時の推奨・最小サイズ

| プラットフォーム | Default | Minimum |
|---|---|---|
| **iOS, iPadOS** | **17 pt** | **11 pt** |
| macOS | 13 pt | 10 pt |
| tvOS | 29 pt | 23 pt |
| visionOS | 17 pt | 12 pt |
| watchOS | 16 pt | 12 pt |

### Apple — ウェイトと拡大率

> "In general, **avoid light font weights**. […] prefer Regular, Medium, Semibold, or Bold font
> weights, and avoid Ultralight, Thin, and Light font weights, which can be difficult to see,
> especially when text is small."

> "Ideally, give people the option to **enlarge text by at least 200 percent**
> (or 140 percent in watchOS apps)."

> "Keep text truncation to a minimum as font size increases. In general, aim to display as much
> useful text at the largest accessibility font size as you do at the largest standard font size."

### Google — Material 3 タイプスケール（全 15 ロール）

出典: androidx `compose.material3.tokens.TypeScaleTokens`（実装値）。

| Role | Size | Line height | Tracking |
|---|---|---|---|
| Display Large | 57 sp | 64 sp | −0.2 sp |
| Display Medium | 45 sp | 52 sp | 0 |
| Display Small | 36 sp | 44 sp | 0 |
| Headline Large | 32 sp | 40 sp | 0 |
| Headline Medium | 28 sp | 36 sp | 0 |
| Headline Small | 24 sp | 32 sp | 0 |
| Title Large | 22 sp | 28 sp | 0 |
| Title Medium | 16 sp | 24 sp | 0.2 sp |
| Title Small | 14 sp | 20 sp | 0.1 sp |
| **Body Large** | **16 sp** | 24 sp | 0.5 sp |
| Body Medium | 14 sp | 20 sp | 0.2 sp |
| Body Small | 12 sp | 16 sp | 0.4 sp |
| Label Large | 14 sp | 20 sp | 0.1 sp |
| Label Medium | 12 sp | 16 sp | 0.5 sp |
| Label Small | 11 sp | 16 sp | 0.5 sp |

### Google — 最小サイズと単位

> "**Don't make the body size any smaller than 12 sp.** This guideline aligns with the Material
> typescale as a default."

> "To allow users to adjust the font size, **specify font size in scalable pixels (sp)**"

### → 本リポジトリの運用値

- **本文 16px 以上**（Web）。Apple 17pt / Material Body Large 16sp のどちらから見ても妥当
- **補助テキストは 12px を下限**（Apple min 11pt / Android 「12sp を下回るな」の厳しい側を採用）
- **行間は本文 1.5 前後**（Apple Body 17/22 ≒ 1.29、Material Body Large 16/24 = 1.5）
- **Light / Thin ウェイトを本文に使わない**
- **フォーム要素だけは別枠で 16px 必須**（iOS Safari のオートズーム。`.claude/rules/form-controls.md`）

---

## 3. 色とコントラスト

### Apple — コントラスト比の定義（WCAG AA 準拠だが刻みが違う）

| テキストサイズ | ウェイト | 最小コントラスト比 |
|---|---|---|
| **〜17 pt** | すべて | **4.5:1** |
| 18 pt | すべて | 3:1 |
| すべて | **Bold** | **3:1** |

> "If your app doesn't provide this minimum contrast by default, ensure it at least provides a
> higher contrast color scheme when the system setting **Increase Contrast** is turned on."

> "If your app supports Dark Mode, make sure to **check the minimum contrast in both light and
> dark appearances**."

⚠️ **WCAG の「大きいテキスト」は 18.66px bold / 24px なので、Apple の刻み（18pt / bold）とは
一致しない。Web では WCAG 側の定義を使うこと。**

### Google — Android

> "Ensure the contrast between the background and text is at least **4.5:1**."

> "Use a **3:1 ratio between surfaces and non-text elements**. For example, the ratio of a
> background to an icon would be 3:1."

### セマンティックカラーという共通思想（3 者が同じことを言っている）

**Apple も Google も「見た目ではなく用途で色を定義しろ」と言っている。**
本リポジトリの shadcn / `@workspace/tokens` の `--primary` / `--primary-foreground` 方式は
これと同型なので、**そこにハードコード色を混ぜた時点で 3 者すべてに違反する**。

| | Apple | Material 3 | 本リポジトリ |
|---|---|---|---|
| 前景/背景のペア保証 | `label` / `secondaryLabel` on `systemBackground` | `primary` / **`on-primary`** | `--primary` / **`--primary-foreground`** |
| 階層のある背景 | `systemBackground` の primary / secondary / tertiary | `surface` / `surface-container*` | `--background` / `--card` / `--muted` |
| 境界線 | `separator` / `opaqueSeparator` | `outline` / `outline-variant` | `--border` |

Apple の明言（そのまま本リポにも効く）:

> "**Avoid redefining the semantic meanings of dynamic system colors.** […] don't use the
> separator color as a text color, or secondary label color as a background color."

> "**Avoid hard-coding system color values in your app.** […] The actual color values may
> fluctuate from release to release"

### 色だけで情報を伝えない（Apple / Google / WCAG 1.4.1 で共通）

> "Avoid relying solely on color to differentiate between objects, indicate interactivity, or
> communicate essential information. […] you can use **text labels or glyph shapes** to identify
> objects or states."

---

## 4. モーション

### Google — Material 3 の duration トークン（実装値）

出典: androidx `compose.material3.tokens.MotionTokens`。単位は ms。

| トークン | 値 | 用途の目安 |
|---|---|---|
| Short 1 / 2 / 3 / 4 | **50 / 100 / 150 / 200** | アイコンの状態変化、押下フィードバック、小さな要素の出入り |
| Medium 1 / 2 / 3 / 4 | **250 / 300 / 350 / 400** | カード展開、ダイアログ、画面遷移 |
| Long 1 / 2 / 3 / 4 | **450 / 500 / 550 / 600** | 大きな領域の変形 |
| Extra Long 1〜4 | 700 / 800 / 900 / 1000 | 画面全体規模の演出（通常の UI では使わない） |

### Google — easing カーブ（CSS の `cubic-bezier()` にそのまま使える）

| トークン | 値 | 使いどころ |
|---|---|---|
| Standard | `cubic-bezier(0.2, 0, 0, 1)` | **既定。位置・サイズの変化全般** |
| Standard decelerate | `cubic-bezier(0, 0, 0, 1)` | 画面内に**入ってくる**要素 |
| Standard accelerate | `cubic-bezier(0.3, 0, 1, 1)` | 画面外へ**出ていく**要素 |
| Emphasized | `cubic-bezier(0.2, 0, 0, 1)` | 強調したい遷移 |
| Emphasized decelerate | `cubic-bezier(0.05, 0.7, 0.1, 1)` | 強調しつつ入場 |
| Emphasized accelerate | `cubic-bezier(0.3, 0, 0.8, 0.15)` | 強調しつつ退場 |
| Legacy（M2 の標準カーブ） | `cubic-bezier(0.4, 0, 0.2, 1)` | 旧実装との互換用。新規では使わない |
| Linear | `cubic-bezier(0, 0, 1, 1)` | 進捗インジケータなど等速が正しいもの |

> **入場は decelerate、退場は accelerate。** [foundations.md](foundations.md) §4 の
> 「入場より退場を速く」はこのトークン体系と整合する（退場は Short、入場は Medium）。

### Apple — Reduce Motion への具体的な落とし方

Apple は「アニメーションを消せ」ではなく、**何をどう置き換えるか**を列挙している。

> - "Tightening animation springs to reduce bounce effects"
> - "Tracking animations directly with people's gestures"
> - "**Avoiding animating depth changes in z-axis layers**"
> - "**Replacing transitions in x-, y-, and z-axes with fades** to avoid motion"
> - "Avoiding animating into and out of blurs"

**「移動をフェードに置き換える」が公式の推奨。** 全部止めるのは正解ではない。

---

## 5. レイアウトと適応

### Google — Window Size Class（ブレークポイントの一次情報）

| Width class | 範囲 | 代表 |
|---|---|---|
| **Compact** | **< 600dp** | 携帯（縦）の 99.96% |
| Medium | 600dp 以上 840dp 未満 | タブレット（縦）、折りたたみ内側画面（縦） |
| Expanded | 840dp 以上 1200dp 未満 | タブレット（横） |
| Large | 1200dp 以上 1600dp 未満 | 大型タブレット |
| Extra-large | 1600dp 以上 | デスクトップ |

| Height class | 範囲 |
|---|---|
| Compact | < 480dp |
| Medium | 480dp 以上 900dp 未満 |
| Expanded | 900dp 以上 |

> **本リポの実質的な分岐点 `md`(768px) は Compact(<600) と Medium(600–840) の境界とはズレる。**
> 「タブレット縦（600–840dp）で崩れる」は、この 768px 境界が原因になりやすい。
> タブレット対応が要件に入ったら `sm:`(640px) の使い方を含めて設計し直すこと。

### Apple — iOS のレイアウト規約

> "**Avoid full-width buttons.** Buttons feel at home in iOS when they respect system-defined
> margins and are inset from the edges of the screen. If you need to include a full-width button,
> make sure it harmonizes with the curvature of the hardware and aligns with adjacent safe areas."

⚠️ 本リポジトリの下部固定 CTA の例（`Button className="w-full"`）は、この規約に照らすと
**左右マージンを必ず取り、角丸を持たせる**必要がある。画面幅いっぱいの直角ボタンにしない。

> "**Extend content to fill the screen or window.** Make sure backgrounds and full-screen artwork
> extend to the edges of the display. Also ensure that scrollable layouts continue all the way to
> the bottom and the sides of the device screen."

> "**Hide the status bar only when it adds value** or enhances your experience."

> "**Aim to support both portrait and landscape orientations.**"

> "Preview your app on multiple devices, using different orientations, localizations, and text
> sizes. […] first testing versions of your experience that use the **largest and the smallest
> layouts**."

---

## 6. Liquid Glass（Apple の新デザイン）

### 何であって、何でないか

> "Liquid Glass forms a **distinct functional layer for controls and navigation elements** — like
> tab bars and sidebars — that **floats above the content layer**, establishing a clear visual
> hierarchy between functional elements and content."

### やってはいけないこと（明示された禁止）

> "**Don't use Liquid Glass in the content layer.** […] including it in the content layer can
> result in unnecessary complexity and a confusing visual hierarchy. Instead, **use standard
> materials for elements in the content layer**, such as app backgrounds."

> "**Use Liquid Glass effects sparingly.** […] overusing this material in multiple custom controls
> can provide a subpar user experience by distracting from that content. **Limit these effects to
> the most important functional elements** in your app."

### 2 つのバリアント

| バリアント | 挙動 | 使いどころ |
|---|---|---|
| **Regular** | 背景の輝度を調整してぼかし、前景の可読性を保つ。**システムコンポーネントの大半がこれ** | 既定 |
| **Clear** | 高い透過率。背景を主役にする | **視覚的にリッチな背景の上でのみ**。背景が明るい場合は **35% の暗いディミング層**を足す |

> "Only use clear Liquid Glass for components that appear over visually rich backgrounds."
> "If the underlying content is bright, consider adding a dark dimming layer of **35% opacity**."

### 本リポジトリでの扱い（Expo）

- **`expo-glass-effect` は未導入。** SDK 57 では `npx expo install expo-glass-effect` で入る
- `GlassView` / `GlassContainer` を提供。**`GlassView` は iOS 26 以降のみ**
- `isLiquidGlassAvailable()` で分岐する。**非対応プラットフォームでは通常の `View` にフォールバック**する（iOS / tvOS のみサポート、Android / Web は対象外）
- **導入するかはユーザーに諮ること。** 「ネイティブっぽくしたい」の手段としては、
  まず Native Tabs（[native.md](native.md) §2）のほうが効果が大きく副作用が小さい

> ⚠️ **Web 側（`apps/web`）で「Liquid Glass 風」を CSS で自作しない。** Apple の材質は
> システムが背景を実測して輝度を調整するもので、`backdrop-blur` で再現すると
> **コントラスト不足になり §3 に違反する**。Web には Web の材質設計を使う。

---

## 7. Android のシステム挙動 — 本リポジトリは targetSdk 36（Android 16）

**Expo SDK 57 の既定は `compileSdkVersion` / `targetSdkVersion` ともに 36。**
`apps/mobile/app.json` に上書きが無いため、以下は**すでに本リポジトリに適用されている**。

### edge-to-edge は回避不能

> "For apps targeting Android 16 (API level 36), `R.attr#windowOptOutEdgeToEdgeEnforcement` is
> **deprecated and disabled**, and **your app can't opt-out of going edge-to-edge**."

（Android 15 / targetSdk 35 の時点で強制。16 で opt-out 属性そのものが無効化された。）
→ **inset を入れていない画面は必ずシステム UI に被る。** 対処は [native.md](native.md) §1。

### Predictive Back は既定 ON — ただし本リポは明示的に切っている

> "For apps targeting Android 16 (API level 36) or higher and running on an Android 16 or higher
> device, the **predictive back system animations** (back-to-home, cross-task, and cross-activity)
> **are enabled by default**. Additionally, `onBackPressed` is not called and
> `KeyEvent.KEYCODE_BACK` is not dispatched anymore."

> "[…] or **temporarily opt out** by setting the `android:enableOnBackInvokedCallback` attribute
> to `false`"

**`app.json` の `predictiveBackGestureEnabled: false`（Expo の既定値）は、この
`android:enableOnBackInvokedCallback=false` に対応する** = 公式が「一時的な opt-out」と
呼んでいる状態。つまり本リポジトリは **targetSdk 36 の既定挙動から意図的に外れている**。

> **これを `true` にするのはネイティブ側の戻る処理の見直しを伴うため、勝手に変更しない。**
> ユーザーに諮ること。判断材料として「一時的な opt-out という位置づけである」ことは伝える。

### 大画面で orientation 制限が無視される

> "For apps targeting Android 16 (API level 36), **orientation, resizability, and aspect ratio
> restrictions no longer apply on displays with smallest width >= 600dp.** Apps fill the entire
> display window, regardless of aspect ratio or a user's preferred orientation"

無視されるもの: `screenOrientation` / `resizableActivity` / `minAspectRatio` /
`maxAspectRatio` / `setRequestedOrientation()` / `getRequestedOrientation()`。

→ **「縦固定にしてあるから横向きは考えなくてよい」は 600dp 以上の端末で成立しない。**

---

## 8. アクセシビリティ設定への応答（両 OS 共通のチェック軸）

| 設定 | Apple | Android / 本リポジトリでの対応 |
|---|---|---|
| 文字拡大 | Dynamic Type（**200% まで**） | フォントスケール（sp）| `maxFontSizeMultiplier` で上限のみ（[native.md](native.md) §9） |
| モーション低減 | Reduce Motion（§4 の置換方針） | アニメーション設定 | `prefers-reduced-motion` / `AccessibilityInfo` |
| 透明度低減 | Reduce Transparency | — | Liquid Glass / blur を使うなら必ず考慮（§6） |
| コントラスト強調 | Increase Contrast（**別配色を用意せよ**） | ハイコントラストテキスト | トークン側に高コントラスト variant |
| 色覚 | Differentiate Without Color | — | 色 + アイコン + テキスト（§3） |
| スクリーンリーダー | VoiceOver | TalkBack | `accessibilityRole` / `accessibilityLabel`、装飾要素は `null` |

Apple の補足で実装に効くもの:

> "**Use haptics in addition to audio cues.** If your interface conveys information through audio
> cues […] consider pairing that sound with matching haptics for people who can't perceive the
> audio"

> "**Minimize use of time-boxed interface elements.** Views and controls that auto-dismiss on a
> timer can be problematic for people who need longer to process information […] Prefer
> dismissing views with an explicit action."

→ **自動で消えるトーストだけで重要な情報を伝えない**（明示的に閉じる手段を用意する）。

> "**Always ask for confirmation twice** whenever people perform an action that's difficult to
> recover from, such a deleting a file."

---

## 9. 出典

**Apple**（本文は DocC データ API `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json` から取得）

- [HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [HIG: Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

**Google / Android**

- [Android: Accessibility (mobile design)](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility)
- [Android: Display content edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
- [Android 16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16)
- [Android: Window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)
- [Material Design 3](https://m3.material.io/)
- タイプスケール / モーションの実測値: androidx `compose.material3.tokens.TypeScaleTokens` / `MotionTokens`

**Expo**

- [expo-glass-effect](https://docs.expo.dev/versions/latest/sdk/glass-effect/)
- [Expo app config: `predictiveBackGestureEnabled`](https://docs.expo.dev/versions/latest/config/app/)

**W3C**

- [WCAG 2.2 SC 2.5.8 / 2.5.5 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

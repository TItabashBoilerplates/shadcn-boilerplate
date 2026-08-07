# Native モバイル — Expo SDK 57 / React Native 0.86 / NativeWind v5 / gluestack-ui

対象: `frontend/apps/mobile`, `frontend/packages/native-ui`。

> **役割分担**: gluestack-ui の書き方・`tva`・import パス・**`SafeAreaView` の既知の罠**は
> `gluestack` スキル（本リポ規約）が正本。Expo Router の UI 機構（native tabs / form sheet /
> blur / SF Symbols）は `building-native-ui`（Expo 公式）が正本。
> **このファイルは「実機で微妙にならないための判断基準」だけを扱う。**

---

## 1. edge-to-edge と safe-area inset

### 現状の設定（`apps/mobile/app.json`）

```json
"android": {
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false
}
```

**edge-to-edge が有効 = アプリがステータスバー / ナビゲーションバーの下まで描画される。**
これは選択ではなく前提である。

- Android 15（targetSdk 35）以降、edge-to-edge は**強制**
- **Expo SDK 57 の既定 `targetSdkVersion` は 36**（＝本リポジトリは Android 16 ターゲット）。
  targetSdk 36 では逃げ道の属性 `windowOptOutEdgeToEdgeEnforcement` 自体が
  **deprecated かつ無効化**され、公式に「**can't opt-out of going edge-to-edge**」と明記された

**「無効化して回避する」という選択肢は無い**（→ [platform-guidelines.md](platform-guidelines.md) §7）。
つまり **inset を自分で入れていない画面は、実機で必ずシステム UI に被る。**

### 基本形

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const insets = useSafeAreaInsets()

// 画面下部固定の CTA
<View style={{ paddingBottom: Math.max(insets.bottom, 16) }} className="border-t px-4 pt-3">
  <Button>{t('submit')}</Button>
</View>
```

`Math.max(insets.bottom, 16)` にするのは、**inset が 0 の端末（旧 Android・物理ボタン機）でも
最低限の余白を残す**ため。`insets.bottom` をそのまま使うと端末によって詰まる。

### inset の二重適用に注意（頻出バグ）

**ヘッダー・タブバーを持つナビゲーターは、すでに inset を消費している。**
その内側の画面でさらに `insets.top` を足すと、**不自然な余白が空く**。

| 場所 | inset を足すか |
|---|---|
| `<Stack>` のヘッダーがある画面の上端 | **足さない**（ヘッダーが消費済み） |
| `headerShown: false` の画面の上端 | **足す**（`insets.top`） |
| `<Tabs>` を持つ画面の下端 | **足さない**（タブバーが消費済み） |
| タブの無い画面の下端固定要素 | **足す**（`insets.bottom`） |
| モーダル / フルスクリーンオーバーレイ | **足す**（上下とも） |

**判断できないときは実機で両方の端末（ジェスチャーナビ / 3 ボタンナビ）を見る。**

### `SafeAreaView` の import 先

**`react-native-safe-area-context` から直接 `SafeAreaView` を import しないこと。**
NativeWind v5（`react-native-css`）との相性問題で `className` が効かず、**過去に本番画面が
真っ黒になった実例がある。** 必ず `@workspace/native-ui/components` の `SafeAreaView` を使う。
詳細な原因と回避策は **`gluestack` スキルの「SafeArea の罠」** を参照。

### StatusBar

edge-to-edge 下ではステータスバーは常に透過。**背景の明暗に応じて文字色を切り替える**こと。

```tsx
import { StatusBar } from 'expo-status-bar'
<StatusBar style="auto" />  // テーマに追従。暗い背景の画面では "light" を明示
```

---

## 2. ナビゲーションと「ネイティブっぽさ」

「ネイティブっぽくない」の正体は、ほぼ**遷移と戻るの挙動が OS 慣習と違う**こと。

### 守るべき OS 慣習

| 慣習 | 対応 |
|---|---|
| **iOS: 画面左端からのスワイプで戻る** | `<Stack>` の既定で有効。**`gestureEnabled: false` で安易に殺さない** |
| **Android: システムの戻る（ジェスチャー / ボタン）** | expo-router が処理する。**モーダルや多段フォームで自前の戻る処理が必要な場合は必ず実装する**（無視すると画面ごと閉じてしまう） |
| **タブの再タップで先頭へスクロール / スタックの先頭へ戻る** | ネイティブタブなら自動。JS タブでは自前実装が必要 |
| 遷移アニメーションは OS 標準（iOS: 右からスライド / Android: フェード + せり上がり） | `<Stack>` の既定に任せる。カスタム遷移は目的があるときだけ |

### Predictive Back（Android）— 本リポは既定挙動から意図的に外れている

現在 `app.json` は `predictiveBackGestureEnabled: false`（Expo の既定値）。これは
AndroidManifest の **`android:enableOnBackInvokedCallback="false"`** に対応する。

**一方で targetSdk 36（＝本リポの現状）では、Predictive Back のシステムアニメーションは
本来「既定で有効」**であり、`onBackPressed` は呼ばれず `KEYCODE_BACK` も配送されなくなる。
公式は `enableOnBackInvokedCallback=false` を「**temporarily opt out**（一時的な回避）」と
位置づけている。

つまり本リポジトリは **OS の既定挙動を明示的に切っている状態**。

> **勝手に `true` にしない。** 有効化すると戻る処理の実装（`onBackPressed` 依存のコード）を
> 見直す必要がある。**「一時的な opt-out という位置づけである」ことを伝えたうえで、
> 移行するかはユーザーに諮ること。** → [platform-guidelines.md](platform-guidelines.md) §7

### 大画面では画面向き固定が効かない（targetSdk 36）

`screenOrientation` / `minAspectRatio` / `setRequestedOrientation()` などは、
**smallest width 600dp 以上の端末では無視される**。「縦固定だから横向きは考慮不要」は
タブレット・折りたたみで成立しない。

### Native Tabs（検討する価値あり）

現在は JS 実装の `<Tabs>`（`expo-router`）+ `HapticTab`。
Expo SDK 54 以降、**OS 標準のタブバーをそのまま使う Native Tabs** が使える。

```tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs'
```

| | Native Tabs | JS Tabs（現状） |
|---|---|---|
| 見た目・挙動 | **OS 標準そのもの**（iOS 26 の液体ガラス等も追従） | React で完全に自由 |
| カスタマイズ | プラットフォームの制約内のみ | 自由 |
| Android のタブ数上限 | **最大 5** | 制限なし |
| API 安定性 | **`unstable_` 接頭辞（alpha、API 変更あり）** | 安定 |

**「ネイティブっぽくしたい」なら Native Tabs が最短。** ただし alpha なので、
移行するかはユーザーに諮ること。詳細は `building-native-ui` スキルの `references/tabs.md`。

### Liquid Glass（iOS 26+）— 手を出す前に Native Tabs

`expo-glass-effect`（`GlassView` / `GlassContainer`）で iOS 26 以降の Liquid Glass を使えるが、
**本リポジトリには未導入**。加えて Apple の HIG は **「コンテンツ層に使うな」「控えめに使え」**と
明示している。

- **効果対コストが最も良いのは Native Tabs**（システムコンポーネントは新デザインを自動で拾う）
- 自前の `GlassView` を並べるのは HIG の "use sparingly" に反する
- iOS / tvOS 限定。Android・Web では通常の `View` にフォールバックする
- **Web 側で `backdrop-blur` による「Liquid Glass 風」を自作しない**（コントラスト不足になる）

導入判断・禁止事項の原文は [platform-guidelines.md](platform-guidelines.md) §6。

---

## 3. キーボード

### 現状: `react-native-keyboard-controller` は未導入

まずは RN 標準の `KeyboardAvoidingView` で組む。**iOS と Android で `behavior` が異なる**
（Expo 公式の指定）。

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native'

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  style={{ flex: 1 }}
>
```

### 標準で足りない場合の判断

| 状況 | 対応 |
|---|---|
| 画面に収まる短いフォーム | `KeyboardAvoidingView` で十分 |
| **スクロールが必要な長いフォーム（入力欄が複数）** | `KeyboardAvoidingView` では**フォーカス中の入力欄が隠れる**。→ `react-native-keyboard-controller` の `KeyboardAwareScrollView`（**未導入。導入はユーザーに諮る**） |
| キーボード上に固定ツールバーを出したい | 同ライブラリの `KeyboardStickyView` / `KeyboardToolbar` |
| Android でタブバーがキーボードに押し上げられる | `app.json` に `"softwareKeyboardLayoutMode": "pan"`、または Tabs の `tabBarHideOnKeyboard` |

> `KeyboardAvoidingView` と `KeyboardAwareScrollView` を**混在させない**（互いに打ち消し合う）。
> `react-native-keyboard-controller` は **development build が必要**（Expo Go では動かない）で、
> `react-native-reanimated` に依存する（本リポは導入済み）。

### 入力属性（Web の §4 と同様に重要）

```tsx
<TextInput
  keyboardType="email-address"     // email-address / numeric / decimal-pad / phone-pad / url
  textContentType="emailAddress"   // iOS: 自動入力
  autoComplete="email"             // Android: 自動入力
  autoCapitalize="none"
  autoCorrect={false}
  returnKeyType="next"             // 最後の入力欄は "done"
/>
```

ワンタイムコードは `textContentType="oneTimeCode"`（iOS）/ `autoComplete="sms-otp"`（Android）
を付けると自動入力が効く。**これだけで OTP 画面の体験が劇的に変わる。**

---

## 4. 押下フィードバックとタップ領域

```tsx
// NativeWind v5 では Pressable に active: 変種が使える
// （:hover / :focus / :active は対応する RN のイベント props にマッピングされる。
//  Pressable / TextInput は対応、素の View / Text は非対応）
<Pressable className="rounded-xl bg-primary px-4 py-3 active:opacity-80">

// style 関数形式（ripple や複雑な条件が要る場合）
<Pressable
  android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false }}
  style={({ pressed }) => [styles.base, pressed && styles.pressed]}
/>
```

| 項目 | 基準 |
|---|---|
| タップ領域 | **44×44 以上**（Android の主要操作は 48dp 推奨）。→ [foundations.md](foundations.md) §1 |
| 小さいアイコンボタン | **padding で広げるのを優先**。無理なら `hitSlop`（TalkBack のフォーカス矩形には反映されない点に注意） |
| カスタムの押せる要素 | **`accessibilityRole="button"` + `accessibilityLabel` 必須**（アイコンのみのボタンは特に） |
| Android のフィードバック | `android_ripple` を付けると OS 標準の質感になる |

---

## 5. ハプティクス（`expo-haptics`。導入済み）

タブ切替には既に `HapticTab` で `ImpactFeedbackStyle.Light` が入っている。**この粒度を守る。**

| 使う場面 | API |
|---|---|
| 選択の切替（タブ・セグメント・ピッカー） | `selectionAsync()` |
| 軽い操作の確定（ボタン・トグル） | `impactAsync(ImpactFeedbackStyle.Light)` |
| 重要な確定（購入・送信完了） | `notificationAsync(NotificationFeedbackType.Success)` |
| エラー・失敗 | `notificationAsync(NotificationFeedbackType.Error)` |

### 禁止事項

- **すべてのタップに振動を付けない**（うるさく、バッテリーも食い、逆に安っぽくなる）
- スクロールやアニメーションの最中に連続発火させない
- **Android では体験が iOS ほど良くない**ことが多い。`process.env.EXPO_OS === 'ios'` で
  絞る既存実装（`HapticTab`）の判断は妥当なので踏襲する
- OS の触覚フィードバック設定が無効なユーザーもいる。**ハプティクスだけで情報を伝えない**

---

## 6. リストとスクロール性能（カクつき = UX 問題）

### まず `FlatList` を正しく使う

```tsx
<FlatList
  data={items}
  keyExtractor={(item) => item.id}          // index を使わない（再利用が壊れる）
  renderItem={renderItem}                    // useCallback で安定させる
  initialNumToRender={10}
  windowSize={5}
  removeClippedSubviews                      // Android で効果大
  // 高さが固定なら必ず指定（レイアウト計算をスキップでき、劇的に速くなる）
  getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
/>
```

- **`renderItem` はコンポーネント外 or `useCallback`**。インライン関数だと毎レンダーで作り直される
- **アイテムコンポーネントを `memo` 化**する
- アイテム内の重い処理（日付整形・ソート）は事前計算しておく
- 画像は `expo-image` を使う（下記）
- `ScrollView` に大量の要素を入れない（全件マウントされる）

### `@shopify/flash-list` v2（未導入）

数百件以上・複雑なアイテムで `FlatList` が持たない場合の選択肢。v2 は New Architecture 前提の
書き直しで、**サイズ推定（`estimatedItemSize`）が不要**になり、ビュー再利用でスクロール中の
空白セルを抑える。**未導入なので、必要になったら理由を示してユーザーに諮ること。**

---

## 7. アニメーション（Reanimated 4.5 導入済み）

`babel.config.js` に `react-native-worklets/plugin` が**最後のプラグインとして**登録されている
（これが無いと `useAnimatedStyle` 等が無言で動かず、画面が真っ黒になる。詳細は `gluestack` スキル）。

### 使い分け

| 種類 | 使うもの |
|---|---|
| **state 変化に伴う宣言的なアニメーション（8 割）** | Reanimated 4 の **CSS Animations / Transitions API**（web と同じ書き味） |
| ジェスチャー駆動・スクロール連動・フレーム単位の制御（2 割） | worklets + `useSharedValue` / `useAnimatedStyle` |
| 要素の出入り・リストの並び替え | `entering` / `exiting` / `layout` props |

- Reanimated **4.x は New Architecture 専用**（Legacy Architecture 非対応）
- v2/v3 の API はそのまま動くので、CSS API は**段階的に導入すればよい**
- 具体的な書き方は `building-native-ui` スキルの `references/animations.md`

### Reduce Motion

```tsx
import { AccessibilityInfo } from 'react-native'
const reduce = await AccessibilityInfo.isReduceMotionEnabled()
```
大きな移動・拡大はフェードに落とす（[foundations.md](foundations.md) §4）。

---

## 8. 画像（`expo-image` 導入済み）

```tsx
import { Image } from 'expo-image'

<Image
  source={uri}
  contentFit="cover"
  transition={200}              // フェードイン。これだけで安っぽさが消える
  placeholder={blurhash}        // 読み込み中の見た目を確保
  style={{ width: '100%', aspectRatio: 16 / 9 }}  // 領域を先に確保（レイアウトシフト防止）
/>
```

**`react-native` の `Image` ではなく `expo-image` を使う**（キャッシュ・placeholder・
transition・SF Symbols 対応）。

---

## 9. フォントスケーリング

`<Text>` は既定で端末のフォントサイズ設定に追従する。

```tsx
// ❌ アクセシビリティを殺す
<Text allowFontScaling={false}>

// ✅ 崩壊が本当に問題な箇所だけ上限を設ける
<Text maxFontSizeMultiplier={1.4}>
```

**固定 `height` を避けて `minHeight` にする。** 端末のフォント設定を最大にして実機確認すること。

---

## 10. 起動体験

- **スプラッシュからの遷移で「白い一瞬」を出さない**。`expo-splash-screen` の
  `preventAutoHideAsync()` → 準備完了後に `hideAsync()`
- スプラッシュの背景色をアプリの初期画面の背景色と一致させる（`app.json` の
  `backgroundColor` / `dark.backgroundColor` は設定済み）
- 起動直後に空リストを一瞬見せない（skeleton で埋める / [foundations.md](foundations.md) §6）

---

## 11. Platform 差分の扱い

```tsx
// ✅ 値の分岐
const shadow = Platform.select({ ios: iosShadow, android: { elevation: 4 }, default: {} })

// ✅ ファイル分離（実装ごと分けたいとき。本リポでも
//    OneSignalInitializer.tsx / .web.tsx で採用済み）
//    Component.ios.tsx / Component.android.tsx / Component.web.tsx
```

- **iOS のデザインをそのまま Android に出さない**。影（iOS は `shadow*` / Android は `elevation`）、
  戻るの慣習、タイポの重みは異なる
- `apps/mobile` は `react-native-web` 経由で web にも出る。**web でしか無い挙動（hover 等）に
  依存しない**

---

## 12. 検証

| やること | 理由 |
|---|---|
| **iOS / Android の両方で実機確認** | シミュレータは触覚・実際の指の大きさ・スクロールの慣性を再現しない |
| Android は**ジェスチャーナビと 3 ボタンナビの両方**で確認 | inset が変わる（§1） |
| ノッチあり / なしの両方 | §1 |
| OS のフォントサイズ最大 | §9 |
| Reduce Motion オン | §7 |
| 低速回線・オフライン | [foundations.md](foundations.md) §6 |

Storybook（`@storybook/addon-react-native-web`）でのカタログ化は必須
（`.claude/rules/ui-testing.md`）だが、**Storybook は実機検証の代わりにはならない。**

---

## 参考

- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)
- [Expo: Keyboard handling](https://docs.expo.dev/guides/keyboard-handling/)
- [Expo Router: Native Tabs](https://docs.expo.dev/router/advanced/native-tabs/)
- [react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context)
- [react-native-edge-to-edge](https://github.com/zoontek/react-native-edge-to-edge)
- [Android: Display content edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
- [react-native-keyboard-controller](https://kirillzyusko.github.io/react-native-keyboard-controller/)
- [Reanimated 4 stable release](https://blog.swmansion.com/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713)
- [FlashList v2 (Shopify Engineering)](https://shopify.engineering/flashlist-v2)
- [NativeWind v5: States & Pseudo-classes](https://www.nativewind.dev/v5)
- [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [React Native: Accessibility](https://reactnative.dev/docs/accessibility)

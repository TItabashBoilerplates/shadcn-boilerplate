# モバイル UI/UX レビュー チェックリスト

既存画面を監査するときの手順と観点。**「UI をよくして」「モバイルが微妙」と言われたら、
まずこのチェックリストで機械的に洗い出す**（作り直しの提案はその後）。

---

## 手順

1. 対象ファイルを特定する（`views/` / `widgets/` / `features/*/ui/` / `packages/ui` / `packages/native-ui`）
2. 下の観点表で該当項目を確認する
3. **重大度つきで `file:line` 形式で報告**する
4. 修正は重大度順に適用する（アーキテクチャ配置は変えない）

### 出力フォーマット

```
[CRITICAL] apps/web/src/views/checkout/ui/CheckoutView.tsx:42
  下部固定の CTA に safe-area inset が無い → iPhone のホームバーに重なる
  → pb-safe を適用（web.md §2）

[HIGH] apps/web/src/features/search/ui/SearchField.tsx:18
  <input> が text-sm (14px) — iOS Safari がフォーカス時に自動ズームする
  → 共有 Input（packages/ui）を使う。直書きするなら text-base md:text-sm
    （.claude/rules/form-controls.md）

[MEDIUM] apps/mobile/src/widgets/demo-section/ui/DemoSection.tsx:29
  Pressable に押下フィードバックが無い
  → active:opacity-80（native.md §4）
```

### 重大度の基準

| 重大度 | 定義 |
|---|---|
| **CRITICAL** | 実機で**操作できない / 見えない**。CTA がシステム UI やキーボードに隠れる、横スクロールでコンテンツに到達できない、タップできない |
| **HIGH** | 明確な体験の毀損。オートズーム、タップ領域不足、hover 依存でモバイルから到達不能、エラー/空状態が無い |
| **MEDIUM** | 品質低下。押下フィードバック無し、spinner のみ、レイアウトシフト、モーション過剰 |
| **LOW** | 磨き込み。間隔の不揃い、遷移の粗さ |

---

## A. 共通（Web / Native 両方）

| # | 観点 | NG の例 | 参照 |
|---|---|---|---|
| A1 | 操作可能要素の実効サイズが 44×44 以上 | `size-6` のアイコンボタンが素で置かれている | [foundations.md](foundations.md) §1 |
| A2 | 隣接するタップ対象が近すぎない（枠あり 12px / 枠なし 24px の余白） | リスト行に 3 つのアイコンが密着 | foundations §1 |
| A3 | 主要 CTA が下部（サムゾーン内）にある | 「保存」がヘッダー右上のみ | foundations §2 |
| A4 | 本文 16px 以上 / 補助 12px 以上 | 本文が `text-sm` | foundations §3 |
| A5 | 固定高さでテキストが切れない | `h-10` に長いラベル | foundations §3 |
| A6 | 押下フィードバックがある | `:active` / `pressed` なし | foundations §5 |
| A7 | loading / empty / error の 3 状態がある | 正常系のみ実装 | foundations §6 |
| A8 | ローディングが skeleton（領域予約あり） | 中央に spinner のみ | foundations §6 |
| A9 | エラーを握りつぶしていない | `catch {}` / `?? []` | `.claude/rules/error-handling.md` |
| A10 | Reduce Motion を尊重 | 無条件のアニメーション | foundations §4 |
| A11 | アニメーションが 500ms 以内 | 演出目的の長い遷移 | foundations §4 |
| A12 | 色だけで情報を伝えていない | 赤文字だけのエラー | foundations §8 |
| A12b | 色をハードコードせずトークン経由 | `text-[#ff0000]` / 生の hex | foundations §8 / [platform-guidelines.md](platform-guidelines.md) §3 |
| A12c | **ダーク**でもコントラストを満たす | ライトのみ確認 | platform-guidelines §3 |
| A12d | 自動で消える表示だけで重要情報を伝えていない | トーストのみでエラー通知 | platform-guidelines §8 |
| A13 | ユーザー向けテキストが i18n 化されている | 文字列直書き | `.claude/rules/i18n.md` |
| A14 | Storybook にモバイル幅のストーリーがある | ストーリー無し | `.claude/rules/ui-testing.md` |
| A15 | クラス文字列をコピペしていない | 各画面に同じ `const xxxClass` | `.claude/rules/clean-code.md` |

---

## B. Web（`apps/web` / `packages/ui`）

| # | 観点 | NG の例 | 参照 |
|---|---|---|---|
| B1 | `viewport` export があり `viewportFit: 'cover'` | export 自体が無い（**現状の本リポはこれ**） | [web.md](web.md) §1 |
| B2 | `userScalable: false` / `maximumScale: 1` を使っていない | ズーム禁止（WCAG 1.4.4 違反） | web.md §1 |
| B3 | フォーム要素が 16px 以上 | `text-sm` の input / textarea / select | **`.claude/rules/form-controls.md`** |
| B4 | 下部固定要素に safe-area inset | `fixed bottom-0` に `pb-safe` 無し | web.md §2 |
| B5 | 固定要素の分だけコンテンツ側に余白がある | 最後の項目が隠れる | web.md §2 |
| B6 | `100vh` / `min-h-screen` を使っていない | `min-h-screen` | web.md §3 |
| B7 | キーボード表示時に送信ボタンへ到達できる | `interactiveWidget` 未設定 | web.md §4 |
| B8 | `env(keyboard-inset-*)` に依存していない | Chromium 限定 API を前提 | web.md §4 |
| B9 | 入力属性が適切（`inputMode` / `autoComplete` / `enterKeyHint`） | 素の `<input type="text">` でメール入力 | web.md §4 |
| B10 | `hover:` がポインタデバイスに限定されている | `hover:` 素置き（sticky hover） | web.md §5 |
| B11 | hover でしか出ない操作・情報が無い | hover で現れる編集ボタン | web.md §5 |
| B12 | 横スクロールが発生しない（375px） | 固定 `min-width`、`min-w-0` 欠落 | web.md §8 |
| B13 | テーブルがモバイルで破綻しない | `<Table>` 素置き | web.md §8 |
| B14 | モバイルファーストで書かれている | `md:` 基準 + `max-md:` で打ち消し | web.md §8 |
| B15 | モーダルがモバイルに適した形（入力系はボトムシート） | 中央 Dialog に長いフォーム | web.md §7 |
| B16 | モーダル内スクロールが背後に連鎖しない | `overscroll-behavior` 無し | web.md §6 |
| B17 | `next/image` に `sizes` がある / 比率が確保されている | `sizes` 未指定 | web.md §9 |
| B18 | 下部 CTA が画面端に密着した直角ボタンでない | `w-full` 直角でバー全幅 | web.md §2 / [platform-guidelines.md](platform-guidelines.md) §5 |

---

## C. Native（`apps/mobile` / `packages/native-ui`）

| # | 観点 | NG の例 | 参照 |
|---|---|---|---|
| C1 | 下部固定要素に `insets.bottom`（`Math.max` で下限つき） | inset 無しでナビバーに被る | [native.md](native.md) §1 |
| C2 | inset を二重に適用していない | ヘッダーありの画面で `insets.top` を追加 | native.md §1 |
| C3 | `SafeAreaView` を `@workspace/native-ui` から import | `react-native-safe-area-context` から直 import | native.md §1 / `gluestack` スキル |
| C4 | 暗い/明るい背景に応じた StatusBar | 常に `style="dark"` | native.md §1 |
| C5 | iOS のスワイプバックを殺していない | `gestureEnabled: false` | native.md §2 |
| C6 | Android のシステム戻るを処理している | 多段フォームで画面ごと閉じる | native.md §2 |
| C7 | `KeyboardAvoidingView` の `behavior` が Platform 分岐 | iOS/Android 共通指定 | native.md §3 |
| C8 | 長いフォームで入力欄がキーボードに隠れない | `KeyboardAvoidingView` のみ | native.md §3 |
| C9 | `TextInput` に `keyboardType` / `textContentType` / `autoComplete` | 素の `TextInput` | native.md §3 |
| C10 | 押下フィードバック（`active:` / `pressed` / `android_ripple`） | 素の `Pressable` | native.md §4 |
| C11 | アイコンのみのボタンに `accessibilityRole` / `accessibilityLabel` | 未設定 | native.md §4 |
| C12 | ハプティクスが過剰でない | 全タップで振動 | native.md §5 |
| C13 | リストが `FlatList` で `keyExtractor` / `memo` / `getItemLayout` を使う | `ScrollView` に全件、`key={index}` | native.md §6 |
| C14 | `renderItem` がインライン関数でない | 毎レンダー再生成 | native.md §6 |
| C15 | `allowFontScaling={false}` を使っていない | 端末設定を無視 | native.md §9 |
| C16 | 画像が `expo-image`（`transition` / `placeholder` / 比率指定） | `react-native` の `Image` | native.md §8 |
| C17 | スプラッシュから初期画面への白フラッシュが無い | `hideAsync()` のタイミング不備 | native.md §10 |
| C18 | 影が Platform 分岐（iOS `shadow*` / Android `elevation`） | iOS 用の影のみ | native.md §11 |
| C19 | 画面向き固定に依存していない（600dp 以上では無視される） | 縦固定前提のレイアウト | native.md §2 / [platform-guidelines.md](platform-guidelines.md) §7 |
| C20 | `GlassView` をコンテンツ層や多数の要素に使っていない | 装飾目的で多用 | platform-guidelines §6 |

---

## D. 実機確認（自動チェックで代替できない）

これらは**コードを読むだけでは判定できない**。実施していなければ「未検証」と報告する。

- [ ] 375px 幅（Web）/ 小型端末（Native）でレイアウトが破綻しない
- [ ] iOS 実機でフォーカス時にオートズームしない
- [ ] キーボード表示中に送信ボタンへ到達できる
- [ ] ノッチ端末で上下が被らない
- [ ] Android のジェスチャーナビ / 3 ボタンナビ双方で inset が正しい
- [ ] OS のフォントサイズ最大で崩れない
- [ ] Reduce Motion オンで支障がない
- [ ] 片手・親指のみで主要フローを完遂できる
- [ ] 低速回線で loading 状態が適切に見える

---

## 報告時の姿勢

- **推測で「デザインがダサい」と言わない。** 上表の具体的な違反として指摘する
- 見つからなければ「該当なし」と正直に書く（無理に項目を作らない）
- **アーキテクチャ（モノレポ構成 / FSD のレイヤー配置）の変更は提案しない。**
  必要と感じた場合も UI/UX の指摘とは分けて、別件として提示する

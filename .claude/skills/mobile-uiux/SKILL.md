---
name: mobile-uiux
description: モバイルの UI/UX 品質基準（クオリティバー）。Web のモバイル幅（Next.js 16 + Tailwind v4 + shadcn/ui）と Expo/React Native（Expo SDK 57 + RN 0.86 + NativeWind v5 + gluestack-ui）の両方で、「動くけど微妙」を潰すための具体的な判断基準・実装パターン・レビュー観点を提供する。safe-area / ノッチ / ホームインジケータ、100vh・dvh・svh、キーボードで CTA が隠れる、sticky hover が残る、タップ領域が小さい、ボトムシート、サムゾーン、edge-to-edge、Android 戻る、押下フィードバック、ハプティクス、リストのカクつき、ローディング・空・エラー状態、フォントスケーリング、モーション設計などを扱う。Apple Human Interface Guidelines（HIG）と Google Material Design 3 / Android 公式ガイドラインの一次情報（タップ領域 44pt・48dp、要素間パディング 12pt / 24pt、iOS の Dynamic Type 型スケール、Material の型スケール・モーショントークン、コントラスト比、セマンティックカラー、Window Size Class、Liquid Glass、targetSdk 由来の挙動変更）を数値つきで収録しており、「Apple のガイドラインではどうなっている？」「Material の規約に合わせて」「視認性の基準は？」といった規約・根拠の照会にも答える。「モバイルで見づらい / 崩れる / 使いにくい / チープ / 微妙」「スマホ対応」「レスポンシブ」「モバイルファースト」「ネイティブっぽくない」「UI をよくして」「UX 改善」「デザインを整えて」といった依頼、および画面・ページ・フォーム・モーダル・ナビゲーションを新規実装 / 修正 / レビューするときは、ユーザーが「モバイル」と明示していなくても必ず最初に起動すること。mobile UI, mobile UX, responsive, viewport, safe area, touch target, bottom sheet, keyboard, edge-to-edge, native feel, Apple HIG, Human Interface Guidelines, Material Design 3, accessibility, contrast, Dynamic Type, Liquid Glass。
---

# モバイル UI/UX 品質基準

このスキルは **「なぜモバイルの UI/UX が微妙になるのか」を構造的に潰す**ためのもの。

コンポーネントの作り方（`shadcn` / `gluestack` / `building-native-ui`）や、デザイン言語の選び方
（`ui-ux-pro-max` / `frontend-design`）は別スキルの担当。**このスキルが担当するのは、
それらを使って作ったものが実機で微妙になる原因**である。

> ⚠️ **このスキルはアーキテクチャを変更しない。** モノレポ（Bun workspace + Turborepo）と
> FSD のレイヤー構造は既存のまま。扱うのは UI/UX・デザイン・スタイルのみ。配置に迷ったら
> `monorepo` / `fsd` スキルに従うこと。

---

## 0. まず理解すべきこと: 微妙になる 3 つの根本原因

モバイルの UI が「微妙」になるのは、センスの問題ではなく**ほぼ必ず次の 3 つのどれか**である。
デザインを作り直す前に、まずここを疑うこと。

| # | 根本原因 | 具体的に何が起きるか | 対処の入口 |
|---|---|---|---|
| **1** | **デスクトップ設計の縮小** | 幅だけ縮めてある。情報密度が高すぎ、タップ領域が小さく、主要アクションが画面上部（指が届かない）にある。テーブルが横スクロールする | [foundations.md](references/foundations.md) |
| **2** | **物理的な画面の無視** | ノッチ・ホームインジケータ・ステータスバー・ソフトキー・キーボードを考慮していない。`100vh` でコンテンツが切れる、CTA がキーボードに隠れる、ボタンがホームバーに重なる | [web.md](references/web.md) / [native.md](references/native.md) |
| **3** | **状態とフィードバックの欠落** | 押した感触がない、ローディングが spinner だけ、空状態が真っ白、エラーが出ない、遷移がガタつく。個々は動いているのに全体が「チープ」に感じる | [foundations.md](references/foundations.md) |

**「UI をよくして」と言われたら、まず 1→2→3 の順に監査する。**
配色やフォントをいじるのは、この 3 つを潰した後でよい（それ以前だと効果がない）。

---

## 1. ルーティング（どの reference を読むか）

| 状況 | 読むファイル |
|---|---|
| プラットフォーム共通の基準（タップ領域・サムゾーン・タイポ・モーション・状態設計） | [references/foundations.md](references/foundations.md) |
| `apps/web` / `packages/ui` — Next.js 16 + Tailwind v4 + shadcn/ui のモバイル幅 | [references/web.md](references/web.md) |
| `apps/mobile` / `packages/native-ui` — Expo SDK 57 + RN 0.86 + NativeWind v5 + gluestack | [references/native.md](references/native.md) |
| **Apple / Google の公式規約の原典が要るとき**（数値の根拠、型スケール、モーショントークン、Liquid Glass、Android の targetSdk 由来の挙動） | [references/platform-guidelines.md](references/platform-guidelines.md) |
| 既存画面の UI/UX レビュー・監査をする | [references/review-checklist.md](references/review-checklist.md) |

**Web と Native の両方を触るタスクなら、foundations + 該当プラットフォームの両方を読む。**

> **`platform-guidelines.md` を読むべき場面**: 「なぜ 44px なのか」を説明する必要があるとき、
> デザイナー / レビュアーと数値で議論するとき、iOS の型スケールや Material のモーション
> トークンに合わせたいとき、OS バージョン由来の挙動変更（edge-to-edge 強制・Predictive Back）
> を確認したいとき。**日常の実装では foundations + 各プラットフォームだけで足りる。**

---

## 2. 本リポジトリの前提（バージョンを推測しないこと）

実装前にこの表を確認する。ここに無いライブラリは**未導入**なので、勝手に前提にしない
（導入が必要なら理由を示してユーザーに諮る）。

| レイヤー | 実際に入っているもの |
|---|---|
| Web | Next.js 16.3 / React 19.2 / Tailwind CSS **v4.3** / shadcn 4 / Radix UI / motion 13 / next-intl |
| Native | Expo SDK **57** / React Native **0.86** / expo-router 57 / NativeWind **5.0.0-preview.4**（実体は `react-native-css` 3） / gluestack-ui / Reanimated **4.5** + react-native-worklets / react-native-gesture-handler 2.32 / react-native-safe-area-context 5.7 / expo-haptics / expo-image |
| デザイントークン | `@workspace/tokens`（**single source of truth**。`web.css` / `native.css` を生成） |
| **未導入**（使うなら要相談） | `react-native-keyboard-controller` / `@shopify/flash-list` / `vaul`（Drawer） / `expo-glass-effect`（Liquid Glass） / safe-area 用 Tailwind プラグイン |

### 既存の設定状況（実装時の注意）

- `apps/web` には **`viewport` export が無い**（`app/[locale]/layout.tsx` は `generateMetadata` のみ）。
  → ノッチ対応・safe-area を使うには **`viewport` export の追加が必須**（[web.md](references/web.md) §1）。
- `apps/mobile/app.json` は **`edgeToEdgeEnabled: true`** かつ **`predictiveBackGestureEnabled: false`**。
  → 画面いっぱいに描画されるので、**inset を自分で入れないとステータスバー/ナビバーに被る**
  （[native.md](references/native.md) §1）。
- **Expo SDK 57 の既定 `targetSdkVersion` は 36（Android 16）** で、`app.json` に上書きが無い。
  → edge-to-edge は **opt-out 不能**。Predictive Back は本来「既定 ON」だが
  `predictiveBackGestureEnabled: false` で**明示的に切っている**状態。
  → 画面向き固定は **600dp 以上の端末で無視される**
  （[platform-guidelines.md](references/platform-guidelines.md) §7）。

---

## 3. 最頻出の失敗モード（実装前に一読）

詳細と修正コードは各 reference に。ここは「自分が今これをやっていないか」の自己点検用。

| # | 症状 | 典型的な原因 | 詳細 |
|---|---|---|---|
| 1 | フォーム入力時に iOS が勝手にズームする | フォーム要素の font-size が 16px 未満 | **`.claude/rules/form-controls.md`（既存ルール・必読）** |
| 2 | 画面下部のボタンがホームバー/ナビバーに重なる | safe-area inset 未適用 | [web.md](references/web.md) §2 / [native.md](references/native.md) §1 |
| 3 | `100vh` で下が見切れる・スクロールでガタつく | `vh` はブラウザ UI を含む最大高 | [web.md](references/web.md) §3 |
| 4 | キーボードを出すと CTA / 入力欄が隠れる | 仮想キーボードの扱い未設計 | [web.md](references/web.md) §4 / [native.md](references/native.md) §3 |
| 5 | タップした要素に hover が残り続ける | `hover:` をメディアクエリで囲っていない | [web.md](references/web.md) §5 |
| 6 | 押しても反応したように見えない | 押下フィードバック（`:active` / `pressed`）が無い | [foundations.md](references/foundations.md) §5 |
| 7 | ボタン/アイコンが押しにくい・誤タップする | タップ領域 < 44px、要素間の間隔不足 | [foundations.md](references/foundations.md) §1 |
| 8 | 主要アクションが押しづらい位置にある | サムゾーン無視（重要操作が画面上部） | [foundations.md](references/foundations.md) §2 |
| 9 | モーダルの背後がスクロールする / 全画面を覆って窮屈 | デスクトップの Dialog をそのまま使っている | [web.md](references/web.md) §7 |
| 10 | 横スクロールが発生する / テーブルが崩れる | `min-width` 固定・テーブルをそのまま出している | [web.md](references/web.md) §8 |
| 11 | スクロールがカクつく・空白セルが出る | リストの仮想化不足、重いアイテム | [native.md](references/native.md) §6 |
| 12 | 全体的に「ネイティブっぽくない」 | 遷移・戻る・ハプティクス・慣性が OS 慣習と違う | [native.md](references/native.md) §2, §5 |
| 13 | ローディングが spinner だけ / 表示後にガタッと動く | skeleton 不使用、領域予約なし | [foundations.md](references/foundations.md) §6 |
| 14 | 端末の文字サイズを上げると崩壊する | 固定高さ + フォントスケーリング未考慮 | [foundations.md](references/foundations.md) §3 |
| 15 | タブレット縦 / 横向きで中途半端に崩れる | `md`(768px) が Window Size Class の境界(600/840dp)とズレている。targetSdk 36 では画面向き固定も無視される | [web.md](references/web.md) §8 / [platform-guidelines.md](references/platform-guidelines.md) §5, §7 |
| 16 | 「Apple / Google の規約に沿っているか」を聞かれて答えられない | 数値の根拠を持っていない | [platform-guidelines.md](references/platform-guidelines.md) |

---

## 4. 実装フロー（必ずこの順で）

```
1. このスキル + 該当 reference を読む
2. .claude/rules/form-controls.md を確認（入力要素を含む画面なら必須）
3. コンポーネントの実装方法は担当スキルへ
     Web    → shadcn / shadcn-ui / monorepo
     Native → gluestack / building-native-ui / gluestack-ui-v5
4. 実装する（配置は fsd / monorepo に従う。アーキテクチャは変えない）
5. Storybook にストーリーを追加（.claude/rules/ui-testing.md により UI は Storybook が必須。
   モバイル幅の viewport を持つストーリーを必ず 1 つ含める）
6. review-checklist.md で自己レビュー
7. ci-check（.claude/rules/commands.md）
```

### 出荷前の最低ライン（これを満たさないものは未完成）

- [ ] **375px 幅**（iPhone SE / mini 相当）でレイアウトが破綻せず、**横スクロールが発生しない**
- [ ] すべての操作可能要素が **実効 44×44px 以上**（見た目は小さくてよい／[foundations.md](references/foundations.md) §1）
- [ ] テキスト入力を含む画面で、**キーボード表示中も送信ボタンに到達できる**
- [ ] 画面下端の固定要素に **safe-area inset が入っている**
- [ ] 押下時の視覚フィードバックがある
- [ ] loading / empty / error の 3 状態が実装されている
- [ ] `prefers-reduced-motion`（Web）/ Reduce Motion（Native）を尊重している
- [ ] ユーザー向けテキストが i18n 化されている（`.claude/rules/i18n.md`）

---

## 5. 他スキル・ルールとの責務分担

**このスキルは「品質基準」だけを持ち、実装方法は既存スキルに委譲する。** 内容を重複させないこと。

| 担当 | 委譲先 |
|---|---|
| フォーム要素の font-size / 共有コンポーネント強制 | **`.claude/rules/form-controls.md`（ルール。このスキルより優先）** |
| **Apple HIG / Material 3 の原典の数値・条文** | **[references/platform-guidelines.md](references/platform-guidelines.md)（本スキル内。数値の根拠はすべてここ）** |
| shadcn/ui コンポーネントの追加・構成 | `shadcn`（公式） / `shadcn-ui`（本リポ規約） |
| gluestack-ui の書き方・`tva`・import パス・SafeAreaView の罠 | `gluestack`（本リポ規約） / `gluestack-ui-v5`（公式） |
| Expo Router の UI 機構（native tabs / form sheet / blur / SF Symbols） | `building-native-ui`（Expo 公式） |
| デザイン言語・配色・フォントペアリング・スタイル選定 | `ui-ux-pro-max` / `frontend-design` / `pencil-design` |
| Web 全般のアクセシビリティ監査 | `web-design-guidelines`（Vercel） |
| トークン・パッケージ配置・共有境界 | `monorepo` / `fsd` |
| 再描画の最小化 | `.claude/rules/render-optimization.md` |
| Storybook | `storybook` / `.claude/rules/ui-testing.md` |

**衝突したときの優先順位**: `.claude/rules/*`（ルール） > 本スキル > 一般論スキル。

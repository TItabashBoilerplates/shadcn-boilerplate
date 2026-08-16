import { SafeAreaView, Text, VStack } from '@workspace/native-ui/components'
import type { ReactNode } from 'react'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

/**
 * 認証系画面の共通レイアウト
 *
 * ログイン / サインアップ / パスワード再設定で同じ枠を使うため、枠だけを共有する
 * （各 View に同じ入れ子をコピペしない）。
 *
 * ## キーボード対策を枠側に持たせている理由
 *
 * 認証フォームは入力欄が 2〜4 個あり、小さい端末では**キーボードが下側の入力欄と
 * 送信ボタンを覆う**。各画面で個別に対処すると必ず抜けが出るので、共通枠で担保する。
 *
 * ## なぜ `react-native` の `KeyboardAvoidingView` を使わないのか
 *
 * Android 15（targetSdk 35）以降 **edge-to-edge が強制**され（Android 16 は opt-out 不可。
 * 本アプリも `app.json` で `edgeToEdgeEnabled: true`）、`adjustResize` は
 * **ウィンドウをリサイズしなくなった**。OS は代わりに IME inset をアプリへ渡す。
 * RN 標準の `KeyboardAvoidingView` は IME inset を見ず、アニメーション完了後に発火する
 * `keyboardDidShow` に依存しているため、**この構成では構造的に壊れている**
 * （Expo 公式も edge-to-edge の案内で "ideally react-native-keyboard-controller" と明記）。
 *
 * `KeyboardAwareScrollView` はフォーカスされた入力の位置を追い、**必要な分だけ**
 * スクロールする。`behavior` のプラットフォーム分岐は不要（両 OS で同じ挙動を再現する）。
 *
 * ## 各 prop の意味（外すと壊れる）
 *
 * - `keyboardShouldPersistTaps="handled"` — 無いとキーボード表示中の 1 タップ目が
 *   「キーボードを閉じる」で消費され、**ボタンが「1 回目は反応しない」**ように見える
 * - `bottomOffset` — 入力欄とキーボードの間の余白。0 だと欄がキーボードに接して読みづらい
 * - `edges={['top']}` — 下辺の inset は**キーボード回避と二重に足さない**
 *
 * @see .claude/rules/mobile-uiux.md
 * @see .claude/skills/mobile-uiux/references/keyboard-native.md
 */
export function AuthScreen({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={24}
      >
        <VStack className="gap-6">
          <VStack className="gap-1">
            <Text className="text-2xl font-bold text-foreground">{title}</Text>
            <Text className="text-sm text-muted-foreground">{description}</Text>
          </VStack>
          {children}
        </VStack>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}

import { SafeAreaView, Text, VStack } from '@workspace/native-ui/components'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'

/**
 * 認証系画面の共通レイアウト
 *
 * ログイン / サインアップ / パスワード再設定で同じ枠を使うため、枠だけを共有する
 * （各 View に同じ入れ子をコピペしない）。
 *
 * ## キーボード対策を枠側に持たせている理由
 *
 * 認証フォームは入力欄が 2〜4 個あり、小さい端末では**キーボードが下側の入力欄と
 * 送信ボタンを覆う**。各画面で個別に対処すると必ず抜けが出るので、共通枠で
 * `KeyboardAvoidingView` + スクロールを担保する。
 *
 * `keyboardShouldPersistTaps="handled"` が無いと、キーボード表示中の 1 タップ目が
 * キーボードを閉じるだけで消費され、**ボタンが「反応しない」ように見える**。
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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <VStack className="gap-6">
            <VStack className="gap-1">
              <Text className="text-2xl font-bold text-foreground">{title}</Text>
              <Text className="text-sm text-muted-foreground">{description}</Text>
            </VStack>
            {children}
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

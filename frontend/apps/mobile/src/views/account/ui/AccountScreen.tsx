import {
  Box,
  Button,
  ButtonText,
  SafeAreaView,
  Text,
  VStack,
} from '@workspace/native-ui/components'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import type { AuthResult } from '@/features/auth'
import { ChangeEmailForm, ChangePasswordForm, DeleteAccountForm } from '@/features/auth'
import { useI18n } from '@/shared/hooks'

/**
 * アカウント設定画面
 *
 * `.claude/rules/auth.md` §2 が要求する「設定画面に置く導線」をまとめる:
 * メールアドレス再設定 / パスワード変更 / アカウント削除。
 *
 * **モバイルではアカウント削除がストア要件**（App Store 5.1.1(v)。
 * 「サポートへ連絡」では不可）。実装はデータ保持方針に依存するため
 * boilerplate では意図的に未実装にしてある。
 *
 * ## キーボード
 *
 * 入力欄が 3 セクションに分かれており、下のセクションほどキーボードに隠れやすい。
 * `KeyboardAwareScrollView` がフォーカスされた欄まで**必要な分だけ**スクロールする。
 * `keyboardShouldPersistTaps="handled"` が無いとキーボード表示中の 1 タップ目が
 * 吸われ、「保存ボタンが 1 回目は効かない」ように見える
 * （`.claude/rules/mobile-uiux.md` / `mobile-uiux.policy.test.ts`）。
 */
export function AccountScreen({
  loadEmail,
  changeEmail,
  changePassword,
  deleteAccount,
  deleteConfirmationWord,
  signOut,
}: {
  /** 現在のメールアドレスを取得する。認可判断は getUser() 側で行う */
  loadEmail: () => Promise<string>
  changeEmail: (newEmail: string) => Promise<AuthResult>
  changePassword: (
    currentPassword: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<AuthResult>
  deleteAccount: (confirmation: string) => Promise<AuthResult>
  /** 削除確認のために打たせる語句 */
  deleteConfirmationWord: string
  signOut: () => Promise<void>
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [email, setEmail] = useState('')

  useEffect(() => {
    let active = true
    loadEmail()
      .then((value) => {
        if (active) {
          setEmail(value)
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load current user:', error)
      })
    return () => {
      active = false
    }
  }, [loadEmail])

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={24}
      >
        <VStack className="gap-8">
          <VStack className="gap-1">
            <Text className="text-2xl font-bold text-foreground">{t('account.title')}</Text>
            <Text className="text-sm text-muted-foreground">{t('account.description')}</Text>
          </VStack>

          <VStack className="gap-3">
            <Text className="text-lg font-semibold text-foreground">
              {t('account.emailSectionTitle')}
            </Text>
            <ChangeEmailForm currentEmail={email} submit={changeEmail} />
          </VStack>

          <VStack className="gap-3">
            <Text className="text-lg font-semibold text-foreground">
              {t('account.passwordSectionTitle')}
            </Text>
            <ChangePasswordForm submit={changePassword} />
          </VStack>

          <VStack className="gap-3">
            <Text className="text-lg font-semibold text-destructive">
              {t('account.dangerSectionTitle')}
            </Text>
            <Box className="rounded-md border border-destructive/40 p-3">
              <DeleteAccountForm
                submit={deleteAccount}
                confirmationWord={deleteConfirmationWord}
                onDeleted={() => router.replace('/sign-in')}
              />
            </Box>
          </VStack>

          <Button
            variant="outline"
            onPress={async () => {
              await signOut()
              router.replace('/sign-in')
            }}
          >
            <ButtonText>{t('account.signOut')}</ButtonText>
          </Button>
        </VStack>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}

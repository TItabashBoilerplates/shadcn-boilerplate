import { Button, ButtonText, Pressable, Text, VStack } from '@workspace/native-ui/components'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useI18n } from '@/shared/hooks'
import type { AuthResult } from '../model/types'
import { AuthField } from './AuthField'
import { AuthMessage } from './AuthMessage'
import { PasswordRequirements } from './PasswordRequirements'

/**
 * サインアップフォーム
 *
 * 本番は確認メールが挟まる（`enable_confirmations = true`）ので、成功しても
 * その場ではログインしない。送信後はフォームを畳んで案内だけを出す。
 *
 * 送信処理を **props で受け取る**のは、`../api` が Supabase クライアント
 * （`EXPO_PUBLIC_SUPABASE_*` を要求する）に依存していて Storybook で読めないため。
 * 副作用と UI を分けることで、各状態の見た目をそのまま確認できる。
 */
export function SignUpForm({
  signUp,
}: {
  signUp: (
    email: string,
    password: string,
    passwordConfirmation: string,
    locale: string
  ) => Promise<AuthResult>
}) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)

  const toggleLabels = { show: t('auth.showPassword'), hide: t('auth.hidePassword') }

  const handleSubmit = async () => {
    setPending(true)
    setResult(null)
    setResult(await signUp(email, password, confirmation, locale))
    setPending(false)
  }

  if (result?.ok) {
    return (
      <VStack className="gap-4">
        <AuthMessage tone="success" message={t(`auth.success.${result.messageKey}`)} />
        <Pressable onPress={() => router.replace('/sign-in')} accessibilityRole="link">
          <Text className="text-center text-sm text-primary">{t('auth.backToSignIn')}</Text>
        </Pressable>
      </VStack>
    )
  }

  return (
    <VStack className="gap-4">
      <AuthField
        testID="email"
        label={t('auth.emailLabel')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.emailPlaceholder')}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        isDisabled={pending}
      />

      <VStack className="gap-2">
        <AuthField
          testID="password"
          label={t('auth.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          isDisabled={pending}
          toggleLabels={toggleLabels}
        />
        <PasswordRequirements password={password} />
      </VStack>

      <AuthField
        testID="passwordConfirmation"
        label={t('auth.passwordConfirmationLabel')}
        value={confirmation}
        onChangeText={setConfirmation}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        isDisabled={pending}
        toggleLabels={toggleLabels}
      />

      {result && !result.ok ? (
        <AuthMessage tone="error" message={t(`auth.errors.${result.messageKey}`)} />
      ) : null}

      <Button testID="sign-up-submit" onPress={handleSubmit} isDisabled={pending}>
        <ButtonText>{pending ? t('auth.signingUp') : t('auth.signUp')}</ButtonText>
      </Button>

      <Pressable onPress={() => router.replace('/sign-in')} accessibilityRole="link">
        <Text className="text-center text-sm text-muted-foreground">{t('auth.haveAccount')}</Text>
      </Pressable>
    </VStack>
  )
}

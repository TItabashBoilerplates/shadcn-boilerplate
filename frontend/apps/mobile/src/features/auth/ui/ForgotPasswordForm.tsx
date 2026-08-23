import { Button, ButtonText, Pressable, Text, VStack } from '@workspace/native-ui/components'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useI18n } from '@/shared/hooks'
import type { AuthResult } from '../model/types'
import { AuthField } from './AuthField'
import { AuthMessage } from './AuthMessage'
import { PasswordRequirements } from './PasswordRequirements'

/**
 * パスワード再設定（**6 桁コード方式**）
 *
 * ## なぜディープリンクではなくコードか
 *
 * スパム対策がメールのリンクを先に開いてしまう「リンクの事前消費」は、Supabase が
 * 公式に Limitations として挙げている既知の問題で、`{{ .ConfirmationURL }}` が
 * 即座に消費されて "Token has expired or is invalid" になる。
 * **公式の回避策の 1 つ目が「`{{ .Token }}` の OTP 方式にする」**こと。
 * 加えてディープリンクはスキーム登録などの環境要因でも無言に壊れる。
 *
 * ## 2 段階
 *
 * 1. メールアドレスを入力 → コード送信（**アカウントの有無は返さない**）
 * 2. コード + 新パスワードを入力 → `verifyOtp` → `updateUser`
 *
 * 送信処理を **props で受け取る**のは、`../api` が Supabase クライアント
 * （`EXPO_PUBLIC_SUPABASE_*` を要求する）に依存していて Storybook で読めないため。
 * 副作用と UI を分けることで、各状態の見た目をそのまま確認できる。
 */
export function ForgotPasswordForm({
  requestCode,
  resetPassword,
}: {
  requestCode: (email: string) => Promise<AuthResult>
  resetPassword: (
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<AuthResult>
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)

  const toggleLabels = { show: t('auth.showPassword'), hide: t('auth.hidePassword') }

  const handleRequest = async () => {
    setPending(true)
    setResult(null)
    const next = await requestCode(email)
    setResult(next)
    setPending(false)
    if (next.ok) {
      setStep('verify')
    }
  }

  const handleReset = async () => {
    setPending(true)
    setResult(null)
    const next = await resetPassword(email, code, password, confirmation)
    setResult(next)
    setPending(false)
    if (next.ok) {
      router.replace('/sign-in')
    }
  }

  if (step === 'request') {
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

        {result && !result.ok ? (
          <AuthMessage tone="error" message={t(`auth.errors.${result.messageKey}`)} />
        ) : null}

        <Button testID="send-reset-code-submit" onPress={handleRequest} isDisabled={pending}>
          <ButtonText>{pending ? t('auth.sending') : t('auth.sendResetCode')}</ButtonText>
        </Button>

        <Pressable onPress={() => router.back()} accessibilityRole="link">
          <Text className="text-center text-sm text-muted-foreground">
            {t('auth.backToSignIn')}
          </Text>
        </Pressable>
      </VStack>
    )
  }

  return (
    <VStack className="gap-4">
      <AuthMessage tone="success" message={t('auth.success.passwordResetCodeSent')} />

      <AuthField
        testID="code"
        label={t('auth.codeLabel')}
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        isDisabled={pending}
      />

      <VStack className="gap-2">
        <AuthField
          testID="password"
          label={t('auth.newPasswordLabel')}
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

      <Button testID="update-password-submit" onPress={handleReset} isDisabled={pending}>
        <ButtonText>{pending ? t('auth.saving') : t('auth.updatePassword')}</ButtonText>
      </Button>

      <Pressable onPress={() => setStep('request')} accessibilityRole="link">
        <Text className="text-center text-sm text-muted-foreground">{t('auth.resendCode')}</Text>
      </Pressable>
    </VStack>
  )
}

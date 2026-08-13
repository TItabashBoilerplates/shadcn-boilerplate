import { Button, ButtonText, Text, VStack } from '@workspace/native-ui/components'
import { useState } from 'react'
import { useI18n } from '@/shared/hooks'
import type { AuthResult } from '../model/types'
import { AuthField } from './AuthField'
import { AuthMessage } from './AuthMessage'

/**
 * メールアドレスの再設定（設定画面）
 *
 * **認証方式が OTP でもメール + パスワードでも必須の導線。**
 * これが無いと、メールアドレスを変えたユーザーは自力でアカウントに戻れない。
 *
 * `double_confirm_changes = true`（既定）では旧・新の両方で確認するまで
 * 変わらないので、その旨を画面に明示する（説明が無いと問い合わせになる）。
 *
 * 送信処理を **props で受け取る**のは、`../api` が Supabase クライアント
 * （`EXPO_PUBLIC_SUPABASE_*` を要求する）に依存していて Storybook で読めないため。
 * 副作用と UI を分けることで、各状態の見た目をそのまま確認できる。
 */
export function ChangeEmailForm({
  currentEmail,
  submit,
}: {
  currentEmail: string
  submit: (newEmail: string) => Promise<AuthResult>
}) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)

  const handleSubmit = async () => {
    setPending(true)
    setResult(null)
    const next = await submit(email)
    setResult(next)
    setPending(false)
    if (next.ok) {
      setEmail('')
    }
  }

  return (
    <VStack className="gap-4">
      <Text className="text-sm text-muted-foreground">
        {t('auth.currentEmail')}: {currentEmail}
      </Text>

      <AuthField
        label={t('auth.newEmailLabel')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.emailPlaceholder')}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        isDisabled={pending}
      />

      <Text className="text-xs text-muted-foreground">
        {t('auth.emailChangeDoubleConfirmNotice')}
      </Text>

      {result ? (
        <AuthMessage
          tone={result.ok ? 'success' : 'error'}
          message={
            result.ok
              ? t(`auth.success.${result.messageKey}`)
              : t(`auth.errors.${result.messageKey}`)
          }
        />
      ) : null}

      <Button onPress={handleSubmit} isDisabled={pending}>
        <ButtonText>{pending ? t('auth.sending') : t('auth.changeEmail')}</ButtonText>
      </Button>
    </VStack>
  )
}

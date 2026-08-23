import { Button, ButtonText, VStack } from '@workspace/native-ui/components'
import { useState } from 'react'
import { useI18n } from '@/shared/hooks'
import type { AuthResult } from '../model/types'
import { AuthField } from './AuthField'
import { AuthMessage } from './AuthMessage'
import { PasswordRequirements } from './PasswordRequirements'

/**
 * パスワード変更（設定画面）
 *
 * 現在のパスワードは `updateUser({ current_password, password })` で
 * **Supabase 側に検証させる**（`signInWithPassword` での代用は新セッションが
 * 発行される副作用があり誤り）。`secure_password_change = true` が前提。
 *
 * 送信処理を **props で受け取る**のは、`../api` が Supabase クライアント
 * （`EXPO_PUBLIC_SUPABASE_*` を要求する）に依存していて Storybook で読めないため。
 * 副作用と UI を分けることで、各状態の見た目をそのまま確認できる。
 */
export function ChangePasswordForm({
  submit,
}: {
  submit: (
    currentPassword: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<AuthResult>
}) {
  const { t } = useI18n()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)

  const toggleLabels = { show: t('auth.showPassword'), hide: t('auth.hidePassword') }

  const handleSubmit = async () => {
    setPending(true)
    setResult(null)
    const next = await submit(currentPassword, password, confirmation)
    setResult(next)
    setPending(false)
    if (next.ok) {
      setCurrentPassword('')
      setPassword('')
      setConfirmation('')
    }
  }

  return (
    <VStack className="gap-4">
      <AuthField
        testID="currentPassword"
        label={t('auth.currentPasswordLabel')}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secure
        autoComplete="password"
        textContentType="password"
        isDisabled={pending}
        toggleLabels={toggleLabels}
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

      <Button testID="change-password-submit" onPress={handleSubmit} isDisabled={pending}>
        <ButtonText>{pending ? t('auth.saving') : t('auth.updatePassword')}</ButtonText>
      </Button>
    </VStack>
  )
}

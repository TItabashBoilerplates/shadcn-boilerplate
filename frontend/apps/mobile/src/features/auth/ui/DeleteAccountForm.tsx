import { Button, ButtonText, HStack, Text, VStack } from '@workspace/native-ui/components'
import { useState } from 'react'
import { useI18n } from '@/shared/hooks'
import type { AuthResult } from '../model/types'
import { AuthField } from './AuthField'
import { AuthMessage } from './AuthMessage'

/**
 * アカウント削除フォーム（Mobile）
 *
 * **App Store 5.1.1(v) により必須**。「サポートへ連絡してください」では要件を満たさない。
 *
 * 削除は取り消せないため二段階にしている: 削除ボタン → 確認語句の入力 → 実行。
 * OS の alert より**打鍵を要求するほうが誤操作に強い**。
 */
export function DeleteAccountForm({
  submit,
  confirmationWord,
  onDeleted,
}: {
  submit: (confirmation: string) => Promise<AuthResult>
  confirmationWord: string
  onDeleted: () => void
}) {
  const { t } = useI18n()
  const [armed, setArmed] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)

  const handleSubmit = async () => {
    setPending(true)
    setResult(null)
    const next = await submit(confirmation)
    setResult(next)
    setPending(false)
    if (next.ok) {
      onDeleted()
    }
  }

  if (!armed) {
    return (
      <VStack className="gap-3">
        <Text className="text-sm text-muted-foreground">
          {t('account.deleteAccountDescription')}
        </Text>
        <Button variant="destructive" onPress={() => setArmed(true)}>
          <ButtonText>{t('account.deleteAccount')}</ButtonText>
        </Button>
      </VStack>
    )
  }

  return (
    <VStack className="gap-4">
      <Text className="text-sm text-muted-foreground">{t('account.deleteAccountWarning')}</Text>

      <AuthField
        label={t('account.deleteConfirmationLabel', { word: confirmationWord })}
        value={confirmation}
        onChangeText={setConfirmation}
        placeholder={confirmationWord}
        // 保存済みの値がオートフィルされると誤って削除が通りかねないので明示的に切る
        purpose="confirmation"
        isDisabled={pending}
      />

      {result && !result.ok ? (
        <AuthMessage
          tone="error"
          message={
            result.messageKey === 'deleteConfirmationMismatch'
              ? t('account.deleteConfirmationMismatch', { word: confirmationWord })
              : t(`auth.errors.${result.messageKey}`)
          }
        />
      ) : null}

      <HStack className="gap-2">
        <Button variant="destructive" onPress={handleSubmit} isDisabled={pending}>
          <ButtonText>
            {pending ? t('account.deletingAccount') : t('account.deleteAccountConfirm')}
          </ButtonText>
        </Button>
        <Button variant="ghost" onPress={() => setArmed(false)} isDisabled={pending}>
          <ButtonText>{t('account.cancel')}</ButtonText>
        </Button>
      </HStack>
    </VStack>
  )
}

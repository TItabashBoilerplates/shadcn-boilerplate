'use client'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useState } from 'react'
import { useRouter } from '@/shared/lib/i18n'
import { AUTH_IDLE_STATE, type AuthActionState } from '../model/types'
import { AuthMessage } from './AuthMessage'

/**
 * アカウント削除フォーム
 *
 * **App Store 5.1.1(v) によりモバイル配布時は必須**（「サポートへ連絡」では不可）。
 * Web にも同じ導線を置いておくことで、どちらから登録したユーザーも自分で消せる。
 *
 * ## 二段階にしている理由
 *
 * 削除は**取り消せない**。ボタン 1 つで消えると誤操作が致命傷になるので、
 * (1) 削除ボタンを押す → (2) 確認語句を打ってもう一度押す、の二段階にする。
 * 「本当によろしいですか？」の alert より、**打鍵を要求するほうが誤操作に強い**。
 *
 * @param action - 削除を行う Server Action（実処理は service_role が要るため Edge Function）
 * @param confirmationWord - 入力を要求する語句
 */
export function DeleteAccountForm({
  action,
  confirmationWord,
  className,
}: {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>
  confirmationWord: string
  className?: string
}) {
  const t = useTranslations('Account')
  // エラー文言は Auth namespace 側に集約してあるので、翻訳関数を分ける
  const tAuth = useTranslations('Auth')
  const router = useRouter()
  const [armed, setArmed] = useState(false)

  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    action,
    AUTH_IDLE_STATE
  )

  useEffect(() => {
    if (state.status === 'success') {
      router.refresh()
      router.push('/login')
    }
  }, [state, router])

  if (!armed) {
    return (
      <div className={className ? `space-y-3 ${className}` : 'space-y-3'}>
        <p className="text-sm text-muted-foreground">{t('deleteAccountDescription')}</p>
        <Button
          id="delete-account-open"
          type="button"
          variant="destructive"
          onClick={() => setArmed(true)}
        >
          {t('deleteAccount')}
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} className={className ? `space-y-4 ${className}` : 'space-y-4'}>
      <p className="text-sm text-muted-foreground">{t('deleteAccountWarning')}</p>

      <div className="space-y-2">
        <Label htmlFor="confirmation">
          {t('deleteConfirmationLabel', { word: confirmationWord })}
        </Label>
        <Input
          id="confirmation"
          name="confirmation"
          type="text"
          autoComplete="off"
          required
          disabled={pending}
          placeholder={confirmationWord}
        />
      </div>

      {state.status === 'error' && (
        <AuthMessage tone="error">
          {state.messageKey === 'deleteConfirmationMismatch'
            ? t('deleteConfirmationMismatch', { word: confirmationWord })
            : tAuth(`errors.${state.messageKey}`)}
        </AuthMessage>
      )}

      <div className="flex gap-2">
        <Button id="delete-account-confirm" type="submit" variant="destructive" disabled={pending}>
          {pending ? t('deletingAccount') : t('deleteAccountConfirm')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setArmed(false)} disabled={pending}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}

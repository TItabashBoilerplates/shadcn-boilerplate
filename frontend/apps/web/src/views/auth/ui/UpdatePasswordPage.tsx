import { ShieldCheck } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { UpdatePasswordForm, updatePassword } from '@/features/auth'
import { AuthCard } from './AuthCard'

/**
 * 新しいパスワードの設定画面（再設定リンクの着地点）
 *
 * `/auth/confirm` が token_hash を検証してセッションを張った直後に来る。
 * 現在のパスワードは尋ねない（忘れた人が来る画面なので）。
 */
export async function UpdatePasswordPage() {
  const t = await getTranslations('Auth')

  return (
    <AuthCard
      icon={ShieldCheck}
      title={t('updatePasswordTitle')}
      description={t('updatePasswordDescription')}
    >
      <UpdatePasswordForm action={updatePassword} />
    </AuthCard>
  )
}

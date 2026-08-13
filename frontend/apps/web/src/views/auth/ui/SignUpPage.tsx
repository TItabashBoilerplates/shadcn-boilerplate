import { UserPlus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { SignUpForm, signUpWithPassword } from '@/features/auth'
import { AuthCard } from './AuthCard'

/**
 * サインアップ画面
 *
 * 本番は確認メールが挟まる（`enable_confirmations = true`）ので、
 * 送信後は「確認メールを送りました」の表示に切り替わる。
 */
export async function SignUpPage() {
  const t = await getTranslations('Auth')

  return (
    <AuthCard icon={UserPlus} title={t('signUpTitle')} description={t('signUpDescription')}>
      <SignUpForm action={signUpWithPassword} />
    </AuthCard>
  )
}

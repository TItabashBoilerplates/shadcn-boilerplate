import { LogIn } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { PasswordLoginForm } from '@/features/auth'
import { AuthCard } from './AuthCard'

/**
 * ログイン画面
 *
 * **メールアドレス + パスワード**が主たるログイン手段（`.claude/rules/auth.md`）。
 * OTP のみのログインはストア審査 2.1(a) で落ちるため、モバイルアプリを持つ
 * プロダクトではこの構成が必須になる。
 *
 * 「パスワードをお忘れですか？」はフォーム内（パスワード欄の直下）にある。
 */
export async function LoginPage() {
  const t = await getTranslations('Auth')

  return (
    <AuthCard icon={LogIn} title={t('signInTitle')} description={t('signInDescription')}>
      <PasswordLoginForm />
    </AuthCard>
  )
}

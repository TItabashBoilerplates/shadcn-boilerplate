import { ForgotPasswordPage } from '@/views/auth'
import { Header } from '@/widgets/header'

/**
 * パスワード再設定の申請ページ
 *
 * ログイン画面から到達できること（忘れた人はログイン後の画面に行けない）。
 *
 * @example
 * URL: /forgot-password
 */
export default function Page() {
  return (
    <div className="min-h-dvh pt-16">
      <Header />
      <ForgotPasswordPage />
    </div>
  )
}

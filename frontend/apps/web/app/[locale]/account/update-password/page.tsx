import { UpdatePasswordPage } from '@/views/auth'
import { Header } from '@/widgets/header'

/**
 * 新しいパスワードの設定ページ（再設定リンクの着地点）
 *
 * `/auth/confirm` が token_hash を検証してから、ここへリダイレクトしてくる。
 *
 * @example
 * URL: /account/update-password
 */
export default function Page() {
  return (
    <div className="min-h-dvh pt-16">
      <Header />
      <UpdatePasswordPage />
    </div>
  )
}

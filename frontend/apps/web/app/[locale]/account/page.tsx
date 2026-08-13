import { AccountPage } from '@/views/account'
import { Header } from '@/widgets/header'

/**
 * アカウント設定ページ
 *
 * メールアドレス再設定 / パスワード変更 / アカウント削除をまとめる。
 *
 * @example
 * URL: /account
 */
export default function Page() {
  return (
    <div className="min-h-screen pt-16">
      <Header />
      <AccountPage />
    </div>
  )
}

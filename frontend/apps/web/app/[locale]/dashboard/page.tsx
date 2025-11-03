import { createClient } from '@workspace/client-supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { BackendApiClient } from '@/shared/api'
import { DashboardPage } from '@/views/dashboard'
import { Header } from '@/widgets/header'

/**
 * ダッシュボードページ（Server Component - 認証必須）
 *
 * Supabaseで認証チェック後、バックエンドAPIからデータを取得して表示
 * shadcn/uiヘッダーを含む統一的なレイアウト
 *
 * @example
 * - 認証済み: バックエンドからユーザー情報を取得して表示
 * - 未認証: /loginにリダイレクト
 */
export default async function Page() {
  // キャッシュを無効化（ユーザー固有データのため）
  await cookies()

  // Supabase認証チェック
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // 未認証の場合はログインページへリダイレクト
  if (error || !user) {
    redirect('/login')
  }

  // アクセストークンを取得
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const accessToken = session?.access_token || null

  // バックエンドAPIクライアントを初期化
  const backendClient = new BackendApiClient(accessToken)

  // バックエンドからユーザー情報を取得
  const { data: backendData, error: backendError } = await backendClient.getUserInfo()

  return (
    <div className="min-h-screen pt-16">
      <Header />
      <DashboardPage
        userEmail={user.email || 'Unknown'}
        backendMessage={backendData?.message || null}
        backendError={backendError}
      />
    </div>
  )
}

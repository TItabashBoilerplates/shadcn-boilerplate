import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { AuthStatus } from '@/widgets/auth-status'

/**
 * ダッシュボードページ（View Component）
 *
 * バックエンドから取得したデータを表示
 */

interface DashboardPageProps {
  userEmail: string
  backendMessage: string | null
  backendError: string | null
}

export default function DashboardPage({
  userEmail,
  backendMessage,
  backendError,
}: DashboardPageProps) {
  return (
    <main className="container mx-auto space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* ページヘッダー */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your dashboard</p>
      </div>

      {/* カードグリッド */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:gap-8">
        {/* ユーザー情報カード */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Your authenticated user details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Email:</span>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* バックエンドレスポンスカード */}
        <Card>
          <CardHeader>
            <CardTitle>Backend Response</CardTitle>
            <CardDescription>Message from FastAPI backend</CardDescription>
          </CardHeader>
          <CardContent>
            {backendError ? (
              <div className="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">
                <p className="font-medium">Error</p>
                <p className="mt-1 text-xs">{backendError}</p>
              </div>
            ) : (
              <div className="rounded-lg bg-primary/10 p-4 text-sm">
                <p className="font-medium text-primary">Success</p>
                <p className="mt-1 text-muted-foreground">{backendMessage || 'No message'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Zustand認証状態デバッグ */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Zustand Auth Store (Debug)</h2>
        <AuthStatus />
      </div>
    </main>
  )
}

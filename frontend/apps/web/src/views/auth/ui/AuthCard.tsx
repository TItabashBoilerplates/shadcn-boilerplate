import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import type { LucideIcon } from 'lucide-react'

/**
 * 認証系画面の共通レイアウト
 *
 * ログイン / サインアップ / パスワード再設定 / 新パスワード設定の 4 画面で
 * まったく同じカード枠を使うため、枠だけを共有部品にしている
 * （各 View に同じ Card の入れ子をコピペしない。`.claude/rules/clean-code.md`）。
 */
export function AuthCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <CardTitle className="text-2xl">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Separator } from '@workspace/ui/components/separator'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ChangeEmailForm, ChangePasswordForm, changeEmail, changePassword } from '@/features/auth'
import { createServerClient as createClient } from '@/shared/lib/supabase'

/**
 * アカウント設定画面
 *
 * `.claude/rules/auth.md` §2 が要求する導線のうち、**設定画面に置くもの**をまとめる:
 *
 * | 導線 | 必須条件 |
 * |---|---|
 * | メールアドレスの再設定 | 認証方式を問わず必須 |
 * | パスワードの変更 | メール + パスワード認証なら必須 |
 * | アカウント削除 | モバイル配布があるなら必須（App Store 5.1.1(v)） |
 *
 * ユーザーは「自分の情報を変えたい」ときに設定画面を探すので、これらを機能ごとに
 * 別の場所へ散らさず 1 画面にまとめている。
 *
 * **認可判断は `getUser()` で行う。** `getSession()` は cookie 由来の値をそのまま
 * 返すため真正性が保証されず、公式も「サーバー側では getUser を使え」としている。
 */
export async function AccountPage() {
  const t = await getTranslations('Account')

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('emailSectionTitle')}</CardTitle>
          <CardDescription>{t('emailSectionDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangeEmailForm action={changeEmail} currentEmail={user.email ?? ''} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('passwordSectionTitle')}</CardTitle>
          <CardDescription>{t('passwordSectionDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm action={changePassword} />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">{t('dangerSectionTitle')}</CardTitle>
          <CardDescription>{t('dangerSectionDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          {/*
            アカウント削除はモバイル配布時に必須（App Store 5.1.1(v)。
            「サポートへ連絡してください」では要件を満たさない）。

            削除の実装はプロダクトのデータ保持方針に強く依存する
            （即時削除 / 猶予期間 / 関連データの扱い / 課金の解約）ため、
            boilerplate では意図的に未実装にしてある。派生プロジェクトで
            方針を決めてから実装すること。
          */}
          <p className="text-sm text-muted-foreground">{t('deleteAccountPlaceholder')}</p>
        </CardContent>
      </Card>
    </div>
  )
}

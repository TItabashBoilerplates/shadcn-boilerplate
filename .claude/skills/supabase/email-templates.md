# Supabase Auth Email Templates

このドキュメントは Supabase Auth のEmailテンプレートを管理・カスタマイズする方法を記述しています。

## 重要な制約

**`supabase config push` はEmailテンプレートをリモートにプッシュできません。**

| 環境 | 設定方法 |
|------|----------|
| ローカル開発 | `config.toml` + HTMLファイル |
| 本番環境 | ダッシュボードで手動設定 |

---

## ディレクトリ構成

```
supabase/
├── config.toml                  # テンプレート設定
└── templates/
    └── email/
        ├── confirmation.html    # サインアップ確認
        ├── invite.html          # 招待
        ├── magic_link.html      # マジックリンク
        ├── recovery.html        # パスワードリセット
        └── email_change.html    # メールアドレス変更
```

---

## config.toml 設定

```toml
[auth.email.template.confirmation]
subject = "Confirm Your Signup / サインアップ確認"
content_path = "./supabase/templates/email/confirmation.html"

[auth.email.template.invite]
subject = "You have been invited / 招待されました"
content_path = "./supabase/templates/email/invite.html"

[auth.email.template.magic_link]
subject = "Your Magic Link / マジックリンク"
content_path = "./supabase/templates/email/magic_link.html"

[auth.email.template.recovery]
subject = "Reset Your Password / パスワードリセット"
content_path = "./supabase/templates/email/recovery.html"

[auth.email.template.email_change]
subject = "Confirm Email Change / メールアドレス変更確認"
content_path = "./supabase/templates/email/email_change.html"
```

---

## 多言語対応（日本語・英語）

### 仕組み

Go Template の条件分岐で `user_metadata.locale` を参照：

```html
{{ if eq .Data.locale "ja" }}
  <!-- 日本語コンテンツ -->
  <h2>サインアップ確認</h2>
  <p>以下のボタンをクリックしてメールアドレスを確認してください：</p>
{{ else }}
  <!-- 英語コンテンツ（デフォルト） -->
  <h2>Confirm Your Signup</h2>
  <p>Please click the button below to confirm your email address:</p>
{{ end }}
```

### 前提条件

フロントエンドで認証時に `options.data.locale` を設定する必要があります：

```typescript
// features/auth/api/signInWithOtp.ts
export async function signInWithOtp(email: string, locale: string = 'en') {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        locale,  // 'en' or 'ja'
      },
    },
  })
}
```

```typescript
// features/auth/ui/LoginForm.tsx
'use client'

import { useLocale } from 'next-intl'

export function LoginForm() {
  const locale = useLocale()  // next-intl から現在のロケールを取得

  const handleSubmit = async (email: string) => {
    await signInWithOtp(email, locale)
  }
}
```

---

## テンプレート変数

| 変数 | 説明 | 利用可能なテンプレート |
|------|------|----------------------|
| `{{ .ConfirmationURL }}` | 確認URL | 全て |
| `{{ .Token }}` | 6桁OTPコード | 全て |
| `{{ .TokenHash }}` | トークンハッシュ | 全て |
| `{{ .SiteURL }}` | サイトURL | 全て |
| `{{ .Email }}` | ユーザーのメールアドレス | 全て |
| `{{ .NewEmail }}` | 新しいメールアドレス | email_change のみ |
| `{{ .Data }}` | `user_metadata` の内容 | 全て |
| `{{ .Data.locale }}` | ユーザーの言語設定 | 全て |
| `{{ .RedirectTo }}` | リダイレクトURL | 全て |

---

## テンプレート例（多言語対応）

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
    {{ if eq .Data.locale "ja" }}
    <!-- 日本語 -->
    <h2 style="color: #1a1a1a; margin-top: 0;">ログイン</h2>
    <p>以下のボタンをクリックしてログインしてください：</p>
    <p style="text-align: center;">
      <a href="{{ .ConfirmationURL }}" style="background-color: #0070f3; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px;">ログイン</a>
    </p>
    <p style="color: #666; font-size: 14px;">または、以下のワンタイムコードを入力：</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center;">{{ .Token }}</p>
    {{ else }}
    <!-- English (default) -->
    <h2 style="color: #1a1a1a; margin-top: 0;">Log In</h2>
    <p>Click the button below to log in:</p>
    <p style="text-align: center;">
      <a href="{{ .ConfirmationURL }}" style="background-color: #0070f3; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px;">Log In</a>
    </p>
    <p style="color: #666; font-size: 14px;">Or enter this one-time code:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center;">{{ .Token }}</p>
    {{ end }}
  </div>
</body>
</html>
```

---

## ローカル開発でのテスト

### 1. Supabase 再起動

テンプレート変更後は再起動が必要：

```bash
supabase stop && supabase start
```

### 2. Inbucket でメール確認

http://localhost:54324 でテストメールを確認できます。

### 3. 言語切り替えテスト

1. フロントエンドの言語を日本語に切り替え
2. ログインフォームからOTPリクエスト
3. Inbucket で日本語メールが届くことを確認
4. 英語に切り替えて同様にテスト

---

## 本番環境への反映

### ダッシュボードで手動設定

1. [Supabase Dashboard - Email Templates](https://supabase.com/dashboard/project/_/auth/templates) にアクセス
2. 各テンプレートタブで Subject と Body を設定
3. `supabase/templates/email/{template}.html` の内容をコピー&ペースト
4. **Save** をクリック

→ 詳細手順: `docs/deployment/email-templates.md`

---

## トラブルシューティング

### テンプレートが反映されない（ローカル）

```bash
supabase stop && supabase start
```

### テンプレートにエラーがある場合

Go Template の構文エラーがあると、**エラーメッセージなしでデフォルトテンプレートにフォールバック**します。
構文を注意深く確認してください。

### locale が反映されない

1. フロントエンドで `signInWithOtp(email, locale)` が呼ばれているか確認
2. `options.data.locale` が正しく設定されているか確認
3. 新規ユーザーでテスト（既存ユーザーの `user_metadata` は更新されない場合あり）

### 既存ユーザーの locale を更新

```typescript
await supabase.auth.updateUser({
  data: { locale: 'ja' }
})
```

---

## 代替案: Send Email Hook + React Email

より高度なカスタマイズが必要な場合は、Send Email Hook を使用できます。

**メリット**:
- React Email によるモダンなテンプレート開発
- 完全な TypeScript 型安全性
- プログラマティックな言語判定

**デメリット**:
- Edge Function の追加が必要
- Resend 等の外部メールサービス契約が必要
- 複雑度が大幅に増加

**参照**: [Send Email Hook | Supabase Docs](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)

---

## 公式リファレンス

| ドキュメント | URL |
|-------------|-----|
| Customizing email templates | https://supabase.com/docs/guides/local-development/customizing-email-templates |
| Email Templates | https://supabase.com/docs/guides/auth/auth-email-templates |
| Send Email Hook | https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook |

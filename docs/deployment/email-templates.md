# Supabase Auth Email Templates - 本番反映手順書

## 概要

Supabase Auth のEmailテンプレートは `supabase config push` で本番環境に反映**できません**。
本番環境へはダッシュボードで手動設定が必要です。

## ローカル開発

ローカル環境では `supabase/config.toml` と `supabase/templates/email/` で管理されます。

テンプレート変更後は再起動が必要：

```bash
supabase stop && supabase start
```

Inbucket（http://localhost:54324）でメール確認可能。

## 本番反映手順

### 1. ダッシュボードにアクセス

[Supabase Dashboard - Email Templates](https://supabase.com/dashboard/project/_/auth/templates)

### 2. 各テンプレートを設定

| テンプレート | ローカルファイル | Subject（日英併記） |
|-------------|-----------------|---------------------|
| Confirm signup | `confirmation.html` | Confirm Your Signup / サインアップ確認 |
| Invite user | `invite.html` | You have been invited / 招待されました |
| Magic Link | `magic_link.html` | Your Magic Link / マジックリンク |
| Reset Password | `recovery.html` | Reset Your Password / パスワードリセット |
| Change Email Address | `email_change.html` | Confirm Email Change / メールアドレス変更確認 |

### 3. 設定手順（各テンプレート）

1. **Subject** 欄にSubjectを入力
2. **Body** 欄に `supabase/templates/email/{template}.html` の内容をコピー&ペースト
3. **Save** をクリック

### 4. テスト

1. テストユーザーでサインアップ/ログイン
2. メールが正しい言語で届くことを確認
3. リンクが正しく動作することを確認

## 多言語対応の仕組み

テンプレート内で Go Template の条件分岐を使用：

```html
{{ if eq .Data.locale "ja" }}
  <!-- 日本語コンテンツ -->
{{ else }}
  <!-- 英語コンテンツ（デフォルト） -->
{{ end }}
```

### 前提条件

フロントエンドで認証時に `user_metadata.locale` を設定する必要があります：

```typescript
await supabase.auth.signInWithOtp({
  email,
  options: {
    data: {
      locale: 'ja', // or 'en'
    },
  },
})
```

## ファイル一覧

```
supabase/
├── config.toml                          # テンプレート設定
└── templates/
    └── email/
        ├── confirmation.html            # サインアップ確認
        ├── invite.html                  # 招待
        ├── magic_link.html              # マジックリンク
        ├── recovery.html                # パスワードリセット
        └── email_change.html            # メールアドレス変更
```

## 注意事項

- **locale未設定時**: 英語がデフォルト表示
- **既存ユーザー**: `user_metadata.locale` がない場合は英語表示
- **テンプレート更新後**: 本番ダッシュボードへの反映を忘れずに

## トラブルシューティング

### テンプレートが反映されない（ローカル）

```bash
supabase stop && supabase start
```

### テンプレートにエラーがある場合

Go Template の構文エラーがあると、デフォルトテンプレートにフォールバックします。
エラーメッセージは表示されないため、構文を注意深く確認してください。

### localeが反映されない

1. フロントエンドで `signInWithOtp` に `locale` が渡されているか確認
2. `options.data.locale` が正しく設定されているか確認

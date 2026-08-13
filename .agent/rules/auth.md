# Authentication Method Policy（認証方式と再設定導線）

**MANDATORY**: **モバイルアプリ（Expo / RN。ストア配布）を実装する場合、主たるログイン手段は必ず
「メールアドレス + パスワード」。OTP / Magic Link を唯一のログイン手段にしてはならない。**
Web だけで完結する（モバイルを出さない）プロダクトなら OTP / Magic Link を主手段にしてよい。

正典: `/.claude/rules/auth.md`

## なぜモバイルで OTP のみが禁止か

App Store Review Guideline **2.1(a)** は審査担当者への「**an active demo account** ...
**login credentials**」提供を求める。**OTP しか無いと担当者はコードが届く受信箱に触れられず、
ログインできないまま 2.1 リジェクト**になる。審査用のバックドアや固定コードでの回避は別の指摘対象。
Google Play も同様にテスト用アカウントの資格情報を求める。

OAuth / パスキー / OTP の**併用は可**。禁止しているのは「OTP しか無い」状態。

## 決定表

| プロダクトの形 | 主たるログイン手段 |
|---|---|
| モバイルアプリがある（出す予定を含む） | **メール + パスワード（必須）** |
| Web のみで完結 | OTP / Magic Link で可 |
| Web + モバイル両方 | **両方をメール + パスワードに揃える**（同一資格情報。Web は OTP 併用可） |

将来モバイルを出すかが不明なとき、OAuth を主手段にしたいときは**推測せずユーザーに確認**する
（OTP のみで作った既存ユーザーはパスワードを持たないため、後からの移行は高くつく）。

## 必須の導線（指示を待たずに実装する）

| 導線 | OTP（Web 完結） | メール + パスワード | 置き場所 |
|---|---|---|---|
| メールアドレスの再設定 | **必須** | **必須** | 設定 / アカウント画面 |
| パスワードを忘れた方 | — | **必須** | **ログイン画面**（忘れた人はログイン後の画面に到達できない） |
| パスワードの変更 | — | **必須** | 設定 / アカウント画面（現在のパスワードを検証してから） |
| アカウント削除 | モバイルは必須 | モバイルは必須 | 設定 / アカウント画面 |

文言は en / ja 両方（i18n 必須）。設定画面から 1 タップで到達できること。

## 実装（Supabase Auth。認証は自作しない）

```ts
await supabase.auth.signUp({ email, password, options: { data: { locale } } })
await supabase.auth.signInWithPassword({ email, password })

// パスワード再設定（Mobile はディープリンクより 6 桁コード方式を既定に）
await supabase.auth.resetPasswordForEmail(email)                    // recovery テンプレートに {{ .Token }}
await supabase.auth.verifyOtp({ email, token, type: 'recovery' })
await supabase.auth.updateUser({ password: newPassword })

// メールアドレス変更（double_confirm_changes = true 既定 → 旧・新の両方で確認）
await supabase.auth.updateUser({ email: newEmail })
```

- Web の再設定は PKCE（`/auth/confirm` の Route Handler で `verifyOtp({ type, token_hash })`）
- パスワード変更前に `signInWithPassword` で現在のパスワードを検証する
- `[auth.email.notification.password_changed]` / `email_changed` を有効化して通知を出す
- 「パスワードを忘れた」の応答でメールアドレスの登録有無を漏らさない

## 禁止

- モバイルのログインを OTP / Magic Link のみで実装する
- 審査用のバックドア・固定コードを仕込む
- メールアドレス再設定の導線が無い
- 「パスワードを忘れた方」をログイン後の画面にだけ置く
- `double_confirm_changes = false` にして旧アドレスの確認を省く
- 現在のパスワードを検証せずに `updateUser({ password })` する

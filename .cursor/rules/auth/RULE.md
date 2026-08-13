---
description: "Authentication policy - mobile apps must use email + password (never OTP-only), and email/password reset flows are mandatory"
alwaysApply: true
globs: ["frontend/**/*.ts", "frontend/**/*.tsx", "supabase/**/*.toml", "supabase/templates/**/*.html"]
---
# Authentication Method Policy

**MANDATORY**: **モバイルアプリ（Expo / RN。ストア配布）を実装する場合、主たるログイン手段は必ず
「メールアドレス + パスワード」。OTP / Magic Link を唯一のログイン手段にしてはならない。**
Web だけで完結する（モバイルを出さない）プロダクトなら OTP / Magic Link を主手段にしてよい。

正典: `/.claude/rules/auth.md`

## 理由（好みではなく審査要件）

App Store Review Guideline **2.1(a)** は審査担当者への「**an active demo account** ...
**login credentials**」提供を求める。**OTP しか無いと担当者はコードが届く受信箱に触れられず、
ログインできないまま 2.1 リジェクト**になる。バックドアや固定コードでの回避は別の指摘対象。
Google Play も同様にテスト用資格情報を求める。OAuth / パスキー / OTP の**併用は可**。

| プロダクトの形 | 主たるログイン手段 |
|---|---|
| モバイルアプリがある（出す予定を含む） | **メール + パスワード（必須）** |
| Web のみで完結 | OTP / Magic Link で可 |
| Web + モバイル両方 | **両方をメール + パスワードに揃える**（Web は OTP 併用可） |

## 必須の導線（開発者の指示を待たずに実装する）

| 導線 | OTP（Web 完結） | メール + パスワード | 置き場所 |
|---|---|---|---|
| メールアドレスの再設定 | **必須** | **必須** | 設定 / アカウント画面 |
| パスワードを忘れた方 | — | **必須** | **ログイン画面**（忘れた人はログイン後の画面に到達できない） |
| パスワードの変更 | — | **必須** | 設定 / アカウント画面（現在のパスワードを検証してから） |
| アカウント削除 | モバイルは必須 | モバイルは必須 | 設定 / アカウント画面 |

文言は en / ja 両方（i18n 必須）。

## 実装（Supabase Auth。認証は自作しない）

```ts
await supabase.auth.signInWithPassword({ email, password })

// パスワード再設定（Mobile はディープリンクより 6 桁コード方式を既定に）
await supabase.auth.resetPasswordForEmail(email)                    // recovery テンプレートに {{ .Token }}
await supabase.auth.verifyOtp({ email, token, type: 'recovery' })
await supabase.auth.updateUser({ password: newPassword })

// メールアドレス変更（double_confirm_changes = true 既定 → 旧・新の両方で確認。UI にも明示）
await supabase.auth.updateUser({ email: newEmail })
```

## 禁止

- モバイルのログインを OTP / Magic Link のみで実装する
- 審査用のバックドア・固定コードを仕込む
- メールアドレス再設定の導線が無い / 「パスワードを忘れた方」をログイン画面に置かない
- `double_confirm_changes = false` にする
- 現在のパスワードを検証せずに `updateUser({ password })` する
- パスワード再設定の応答でメールアドレスの登録有無を漏らす

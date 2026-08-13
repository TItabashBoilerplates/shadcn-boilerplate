# 認証方式ポリシー（Mobile はメール + パスワード必須 / 再設定導線は必須実装）

**CRITICAL / NON-NEGOTIABLE**: **モバイルアプリ（Expo / React Native。ストアに配布するもの）を実装する場合、
主たるログイン手段は必ず「メールアドレス + パスワード」にする。OTP / Magic Link を唯一のログイン手段に
してはならない。** Web だけで完結するプロダクト（モバイルアプリを出さない）であれば OTP / Magic Link を
主手段にしてよい。

加えて、**認証方式が OTP であってもメール + パスワードであっても、アプリ内に「メールアドレスの再設定」
導線を必ず用意する**。メール + パスワードの場合は、さらに **ログイン画面の「パスワードを忘れた方」導線**と
**設定画面の「パスワード変更」導線**を必ず用意する。

これらは「あとで足せばいい機能」ではない。**認証はアカウントの入口であり、入口を失ったユーザーは
自力で復帰できない**（メールアドレスが変わった / パスワードを忘れた ＝ サポート問い合わせ以外に手段が無い）。
さらにモバイルでは**ストア審査で実際に落ちる**。

---

## 0. なぜモバイルで OTP を主手段にしてはいけないか（ファクト）

**App Store Review Guideline 2.1(a) — App Completeness**:

> Provide App Review with full access to your app. If your app includes account-based features,
> provide either **an active demo account** or fully-featured demo mode, plus any other hardware or
> resources that might be needed to review your app (e.g. **login credentials** or a sample QR code)

App Store Connect の「App Review Information」に渡せるのは **ユーザー名とパスワードの組**である。
ログインが OTP / Magic Link しか無いと、**審査担当者は 6 桁コードやリンクが届く受信箱にアクセスできない**
（毎回こちらが受信箱を見て口頭で伝えるわけにもいかない）。結果として

- 「アプリにログインできず審査できない」で **2.1 リジェクト**
- 回避のためにテスト用の固定コードや審査用バックドアを入れると、**それ自体が新たな指摘対象**になる

という詰みが発生する。Google Play も同様に、レビュー用のテストアカウント資格情報の提出を求める。

> **要するに**: 「レビュー担当者が、こちらの受信箱に触れずに、渡された資格情報だけでログインし切れるか」。
> メール + パスワードならこれが常に成立する。OTP は成立しない。

補助的な手段としての OTP / OAuth / パスキーは**併用してよい**（メール + パスワードで必ずログインできる
状態が保たれている限り）。禁止しているのは「OTP しか無い」状態である。

---

## 1. 認証方式の決定表（実装前に必ずここを見る）

| プロダクトの形 | 主たるログイン手段 | 備考 |
|---|---|---|
| **モバイルアプリがある**（Expo / RN。ストア配布する / する予定がある） | **メール + パスワード（必須）** | OTP / OAuth / パスキーは**併用可**。ただしメール + パスワードだけで完結できること |
| **Web のみで完結**（モバイルアプリを出さない） | OTP / Magic Link で可 | メール + パスワードにしてもよい |
| **Web + モバイルの両方**（同一 Supabase project でアカウント共有） | **両方をメール + パスワードに揃える** | 同じ資格情報で両方に入れること。Web 側は OTP を**併用**してよいが、パスワードログインを必ず持たせる |
| PWA だけ（ストアに出さない） | OTP で可 | ストアに出す判断が出た時点で本ポリシーの対象になる |

**判断に迷う点（＝ユーザーに確認すべき点）**:

- 「将来モバイルを出す可能性があるか」が不明なとき。**後からの移行は高くつく**
  （OTP のみで作った既存ユーザーはパスワードを持っていないため、全員にパスワード設定を促す移行導線が要る）。
  不明なら**メール + パスワードで作っておくほうが安全**だが、プロダクト方針に関わるので**推測で決めない**。
- OAuth（Google / Apple）を主にしたい場合。**Apple でサインインの提供義務**（他のソーシャルログインを
  出すなら Apple も出す）等の別要件が絡むので、実装前に確認する。

---

## 2. 必ず実装する導線（MANDATORY）

| # | 導線 | OTP（Web 完結） | メール + パスワード | 置き場所 |
|---|---|---|---|---|
| 1 | **メールアドレスの再設定** | **必須** | **必須** | 設定 / アカウント画面 |
| 2 | **パスワードを忘れた方**（未ログインからの復旧） | — | **必須** | **ログイン画面から到達できること** |
| 3 | **パスワードの変更**（ログイン中） | — | **必須** | 設定 / アカウント画面 |
| 4 | **アカウント削除** | モバイルは必須 | モバイルは必須 | 設定 / アカウント画面（`.claude/rules/store-review.md` §4） |

**「適切な場所」の解釈**（迷ったらこれに従う）:

- **1 / 3 / 4 は同じ「アカウント設定」画面にまとめる**。ユーザーは「自分の情報を変えたい」ときに
  設定画面を探すのであって、機能ごとに別の場所を探しはしない。
- **2 はログイン画面に置く**。パスワードを忘れた人は**ログインできない**のだから、
  ログイン後の画面に置いても意味が無い（実際にやりがちな設計ミス）。パスワード入力欄の直下に
  「パスワードをお忘れですか？」を置くのが標準形。
- モバイルではタブや Drawer の階層に埋めすぎない。**設定画面から 1 タップで到達**できること。

**すべての文言は i18n 必須**（`en` / `ja` 両方。`.claude/rules/i18n.md`）。

---

## 3. 実装（Supabase Auth。API は推測せず下記に従う）

**認証は絶対に自作しない**（`.claude/rules/minimal-implementation.md`）。Supabase Auth の標準 API を使う。
`{ error }` は必ずチェックする（`.claude/rules/error-handling.md`）。

### 3.1 サインアップ / ログイン

```ts
// サインアップ（本番は enable_confirmations = true なのでメール確認が挟まる）
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { locale } },   // メールテンプレートの多言語切替に使う
})

// ログイン
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
```

### 3.2 パスワードを忘れた（未ログインからの復旧）

**Web（PKCE / `@supabase/ssr`）** — リンク方式:

```ts
// 1. ログイン画面 →「パスワードを忘れた方」→ メール送信
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/auth/confirm?next=/account/update-password`,
})
// 2. recovery テンプレートは token_hash 形式のリンクを送る
//    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=...">
// 3. /auth/confirm の Route Handler で verifyOtp({ type, token_hash }) → セッション確立
// 4. /account/update-password で新パスワードを入力
await supabase.auth.updateUser({ password: newPassword })
```

**Mobile（Expo / RN）** — **6 桁コード方式を既定にする**:

```ts
// 1. resetPasswordForEmail でコードを送る（recovery テンプレートに {{ .Token }} を含める）
await supabase.auth.resetPasswordForEmail(email)
// 2. ユーザーがアプリ内でコードを入力 → セッションを得る
const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' })
// 3. 新パスワードを設定
await supabase.auth.updateUser({ password: newPassword })
```

> **なぜモバイルはコード方式を既定にするか**: ディープリンク（`redirectTo` にアプリスキーム）方式は、
> スキーム登録・`additional_redirect_urls`・メールクライアントのリンクプレビューによる**リンクの
> 事前消費**など、環境要因で無言に壊れる箇所が多い。コード方式は経路が 1 本で、審査担当者も追える。
> ディープリンクを採用する場合は `expo-linking` の設定と `additional_redirect_urls` への登録を
> セットで行い、実機で必ず往復を確認すること。

**「パスワードを忘れた」の応答はメールの存在を漏らさない**。送信できてもできなくても
「登録があればメールを送りました」と表示する（ユーザー列挙攻撃の防止）。

### 3.3 パスワードの変更（ログイン中）

```ts
// 変更前に必ず現在のパスワードを検証する（本人以外が端末を触っている場合の防御）
const { error: verifyError } = await supabase.auth.signInWithPassword({
  email: currentUser.email,
  password: currentPassword,
})
if (verifyError) { /* ログ出力のうえエラーとして扱う */ }

const { error } = await supabase.auth.updateUser({ password: newPassword })
```

- 変更成功後は**他端末のセッションを落とすか**を設計として決める（`signOut({ scope: 'others' })` 等）。
  黙って全端末を維持するのも全端末を落とすのも、どちらも「決めていない」状態にしない。
- `[auth.email.notification.password_changed]` を有効化して**変更通知メール**を出す（§4）。

### 3.4 メールアドレスの再設定

```ts
const { error } = await supabase.auth.updateUser({ email: newEmail })
// → email_change テンプレートのメールが送られる
// → 確定は confirm リンク（Web）/ verifyOtp({ email, token, type: 'email_change' })（Mobile）
```

- **`double_confirm_changes = true`（既定）を落とさない**。有効時は**旧アドレスと新アドレスの
  両方**で確認が必要になり、**両方の確認が完了するまでメールアドレスは変わらない**。
  これは「アカウントを乗っ取られてメールアドレスごと奪われる」経路を塞ぐための設定であり、
  「確認が 2 通来て面倒」を理由に無効化してはならない。
- UI 上「確認メールを送りました。**旧アドレス・新アドレスの両方**を確認してください」と明示する
  （説明しないと、片方だけ確認して「変わらない」という問い合わせになる）。
- `users` テーブル等にメールアドレスを複製している場合、**`auth.users` の確定と同期させる**
  （確定前に自前テーブルを書き換えない）。

---

## 4. `config.toml` 側の要件（派生プロジェクトで `config.toml` を作る時点から適用）

> boilerplate 本体には `config.toml` を置かない（`.claude/rules/supabase-config.md` §0）。
> 以下は派生プロジェクトで作成するときの必須項目。

```toml
[auth]
minimum_password_length = 12
password_requirements   = "letters_digits_symbols"

[auth.email]
enable_signup        = true
enable_confirmations = true    # 本番は必ず true（ローカルのみ false 可）
double_confirm_changes = true  # 既定 true。落とさない
max_frequency        = "1m"

# パスワード + メール変更の導線に必要なテンプレート（パスは repo root 基準）
[auth.email.template.recovery]
subject = "Reset Your Password / パスワードリセット"
content_path = "./supabase/templates/email/recovery.html"

[auth.email.template.email_change]
subject = "Confirm Email Change / メールアドレス変更確認"
content_path = "./supabase/templates/email/email_change.html"

# セキュリティ通知（乗っ取りにユーザー自身が気づける唯一の手段）
[auth.email.notification.password_changed]
enabled = true
[auth.email.notification.email_changed]
enabled = true
```

- **モバイルでコード方式を使うなら、`recovery` テンプレートに `{{ .Token }}` を必ず含める**
  （リンクだけのテンプレートだとアプリ側でコードを入力させられない）。
  Web のリンク方式と両立させるなら、1 つのテンプレートに**リンクとコードの両方**を載せる。
- ディープリンクを使う場合は `additional_redirect_urls` にアプリスキームを登録する。
- 本ファイルの設定は `supabase config push` で反映する。`[remotes.<name>]` の宣言が無いと
  **無言でスキップされる**（`.claude/rules/supabase-config.md` §1.5）。

---

## 5. 配置（FSD）

```
features/auth/
├── ui/          # LoginForm / SignUpForm / ForgotPasswordForm /
│                # UpdatePasswordForm / ChangeEmailForm      → Storybook 必須・単体テスト不要
├── model/       # バリデーション・フォーム状態                → 単体テスト必須（TDD）
└── api/         # signUpWithPassword / signInWithPassword /
                 # requestPasswordReset / updatePassword /
                 # changeEmail                                → 単体テスト必須（TDD）

views/auth/          # ログイン / パスワード再設定の画面
views/account/       # 設定画面（メール変更・パスワード変更・アカウント削除）
```

- **Web と Mobile で同じ関数をコピペしない**。共有できるロジック（バリデーション、エラーメッセージの
  マッピング）は `frontend/packages/*` に置く（`.claude/rules/clean-code.md` / `minimal-implementation.md` §2.2）。
- パスワード入力欄も**フォーム要素の 16px 規約**の対象（`.claude/rules/form-controls.md`）。

---

## 6. テスト

| 対象 | 要求 |
|---|---|
| `features/auth/api/*` / `model/*` | **単体テスト必須（TDD）**。成功・失敗・エラーメッセージの分岐 |
| `features/auth/ui/*` | **Storybook 必須**（初期 / 送信中 / エラー / 送信完了の各状態）。単体テストは不要 |
| E2E | Maestro でログイン〜パスワード再設定〜メール変更の往復を通す。メールは Mailpit（`.claude/skills/maestro/`） |

**「送信できた」で終わらせない**。パスワード再設定もメール変更も、**メールを受け取って確定するまでが
1 本のフロー**であり、そこを踏まないテストは壊れていることに気づけない。

---

## 7. ストア提出時（モバイル）

- **審査メモに、失効しないレビュー用アカウントのメールアドレスとパスワードを書く**
  （`docs/store/submission-checklist.md`）。毎回作り直して失効させない。
- レビュー用アカウントで**アプリの主要導線がすべて通る**こと（有料機能があるならエンタイトルメントを付与）。
- **アプリ内アカウント削除**は必須（`.claude/rules/store-review.md` §4）。

---

## 8. 禁止パターン

```ts
// ❌ モバイルアプリのログインを OTP / Magic Link のみで実装する（審査で詰む）
await supabase.auth.signInWithOtp({ email })   // ← これしか無い状態

// ❌ 審査を通すために、特定アカウントだけ固定コードで入れるバックドアを仕込む
if (email === 'review@example.com' && code === '000000') { /* ... */ }

// ❌ メールアドレス変更の導線が無い（ユーザーがアカウントを失う）
// ❌「パスワードを忘れた方」をログイン後の画面にだけ置く（忘れた人は到達できない）
// ❌ 設定画面にパスワード変更が無い（漏洩時に自力で変えられない）

// ❌ double_confirm_changes = false にして旧アドレスの確認を省く（乗っ取り経路）
// ❌ 現在のパスワードを検証せずに updateUser({ password }) する
// ❌ パスワード再設定で「そのメールアドレスは登録されていません」と返す（ユーザー列挙）
// ❌ 認証・セッション・パスワードハッシュを自作する
// ❌ 確定前に自前の users テーブルのメールアドレスを書き換える
```

---

## 9. チェックリスト（認証を実装・変更したら必ず）

| # | 確認 |
|---|---|
| 1 | モバイルがある（出す予定がある）なら、メール + パスワードだけでログインし切れるか |
| 2 | メールアドレス再設定が設定画面にあるか（OTP / パスワード どちらでも） |
| 3 | 「パスワードを忘れた方」が**ログイン画面**から到達できるか |
| 4 | 設定画面にパスワード変更があり、現在のパスワードを検証しているか |
| 5 | メール変更が旧・新の両方確認（`double_confirm_changes`）で、UI にもそう書いてあるか |
| 6 | `recovery` / `email_change` テンプレートが配線され、モバイルなら `{{ .Token }}` が入っているか |
| 7 | パスワード変更・メール変更のセキュリティ通知が有効か |
| 8 | 5 状態（初期 / 送信中 / 成功 / 失敗 / レート制限）の UI があるか |
| 9 | 文言が en / ja 両方あるか |
| 10 | api / model に単体テスト、ui に Storybook、E2E にメール往復があるか |
| 11 | モバイルならアカウント削除導線があるか、審査メモの資格情報が有効か |

---

## 10. 強制事項

このポリシーは**交渉の余地なし**。

- **モバイルアプリのログインを OTP / Magic Link のみで実装した PR はレビューで却下**する。
- **メールアドレス再設定の導線が無い実装は却下**する（認証方式を問わない）。
- **メール + パスワードでログイン画面の「パスワードを忘れた方」または設定画面のパスワード変更が
  欠けている実装は却下**する。
- 「開発者から指示が無かった」は理由にならない。**これらは指示を待たずに最初から入れる**。
- 将来モバイルを出すかが不明で認証方式が決められない場合、および OAuth を主手段にしたい場合は、
  **推測で進めずユーザーに確認**する。

## 参考

- [App Store Review Guidelines 2.1 App Completeness](https://developer.apple.com/app-store/review/guidelines/#app-completeness) — demo account / login credentials
- [App Store Review Guidelines 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) — アプリ内アカウント削除
- [Supabase: Password-based Auth](https://supabase.com/docs/guides/auth/passwords) — `signUp` / `signInWithPassword` / `resetPasswordForEmail` / `updateUser`
- [Supabase: Auth email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates) — `recovery` / `email_change` / 通知テンプレート・`{{ .Token }}`
- [Supabase CLI config: `auth.email.double_confirm_changes`](https://supabase.com/docs/guides/local-development/cli/config) — 既定 `true`（旧・新の両方で確認）
- `.claude/rules/store-review.md` / `.claude/rules/supabase-config.md` / `.claude/rules/supabase-first.md` / `.claude/skills/supabase/`

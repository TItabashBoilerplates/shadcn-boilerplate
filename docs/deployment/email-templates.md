# Supabase Auth Email Templates - 運用手順書

## 概要

認証メール（サインアップ確認 / パスワードリセット等）のテンプレートは **Config-as-Code** で管理する。

- **HTML 本文**: `supabase/templates/email/*.html`（Git 管理）
- **配線（subject + content_path）**: `supabase/config.toml` の `[auth.email.template.*]`
- **本番反映**: **GitHub Actions からの `supabase config push --project-ref <ref>`**（`infra-deploy`）

> Dashboard へ手動でコピペする運用はしない。設定は必ず `config.toml` → PR → `config push` で反映する。
> ルールの正本は [`.claude/rules/supabase-config.md`](../../.claude/rules/supabase-config.md)。

## config.toml への配線

`supabase/config.toml` に以下を記載してテンプレートを配線する（HTML は既に `supabase/templates/email/` に存在）。

```toml
[auth.email.template.confirmation]
subject = "Confirm Your Signup / サインアップ確認"
content_path = "./supabase/templates/email/confirmation.html"

[auth.email.template.recovery]
subject = "Reset Your Password / パスワードリセット"
content_path = "./supabase/templates/email/recovery.html"

[auth.email.template.magic_link]
subject = "Your Magic Link / マジックリンク"
content_path = "./supabase/templates/email/magic_link.html"

[auth.email.template.invite]
subject = "You have been invited / 招待されました"
content_path = "./supabase/templates/email/invite.html"

[auth.email.template.email_change]
subject = "Confirm Email Change / メールアドレス変更確認"
content_path = "./supabase/templates/email/email_change.html"
```

対応テンプレート種別: `invite` / `confirmation` / `recovery` / `magic_link` / `email_change` / `reauthentication`。
セキュリティ通知を使う場合は `[auth.email.notification.<type>]`（`enabled = true` + `subject` + `content_path`）。

## ローカル開発

ローカル / セルフホストでは `config.toml` の `content_path` がそのまま適用される。
**`config.toml` またはテンプレート変更後は再起動が必要**：

```bash
stop && supabase-start
# または
supabase stop && supabase start
```

Inbucket（http://localhost:54324）で送信メールを確認できる。

## 本番反映（hosted）

本番への反映は **`supabase config push --project-ref <production の ref>`** で行う（`infra-deploy <app>` に含まれる）。

> ⚠️ **GitHub 連携では届かない。** 公式は production への適用対象を
> 「New migrations are applied, Edge Functions declared in `config.toml` are deployed,
> Storage buckets declared in `config.toml` are deployed」とし、
> 「**All other configurations, including API, Auth, and seed files, are ignored by default.**」
> と明記している（[GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)）。
> メールテンプレートは Auth 設定なので **production では連携の対象外**。
> 「本番だけテンプレートが古いまま」の症状はこれで説明できる（`[remotes.*]` を正しく書いても直らない）。
> persistent branch（staging / develop）には連携でも適用される。

> ⚠️ **公式仕様の注意**: hosted プロジェクトでは、メールテンプレートの**本文**が `supabase config push` 単体では反映されないケースがあると公式ドキュメントに記載がある（[customizing-email-templates](https://supabase.com/docs/guides/local-development/customizing-email-templates)）。
> `config push` で本文が同期されない場合のフォールバックは以下のいずれか。**必要になったらユーザーに判断をあおぐこと**（勝手に実装しない）。
> - Management API: `PATCH https://api.supabase.com/v1/projects/{ref}/config/auth`（`mailer_subjects_*` / `mailer_templates_*_content`）
> - Dashboard: [Email Templates](https://supabase.com/dashboard/project/_/auth/templates) に貼り付け

## 多言語対応の仕組み

テンプレート内で Go Template の条件分岐を使用：

```html
{{ if eq .Data.locale "ja" }}
  <!-- 日本語コンテンツ -->
{{ else }}
  <!-- 英語コンテンツ（デフォルト） -->
{{ end }}
```

利用可能な変数: `{{ .ConfirmationURL }}` / `{{ .Token }}` / `{{ .TokenHash }}` / `{{ .SiteURL }}` / `{{ .Email }}` / `{{ .Data }}`（`user_metadata`）。

### 前提条件

フロントエンドで認証時に `user_metadata.locale` を設定する必要がある：

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
├── config.toml                          # [auth.email.template.*] でテンプレートを配線
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
- **設定変更後**: ローカルは再起動（`stop && supabase-start`）、本番は `infra-deploy <app> production` で反映を確認

## トラブルシューティング

### テンプレートが反映されない（ローカル）

```bash
stop && supabase-start
```

`config.toml` は CLI 起動時にのみ読み込まれるため、変更後は必ず再起動する。

### テンプレートにエラーがある場合

Go Template の構文エラーがあると、デフォルトテンプレートにフォールバックする（エラーは表示されない）。構文を注意深く確認すること。

### localeが反映されない

1. フロントエンドで `signInWithOtp` 等に `options.data.locale` が渡されているか確認
2. `user_metadata.locale` が正しく設定されているか確認

## 参照

- ルール（正本）: [`.claude/rules/supabase-config.md`](../../.claude/rules/supabase-config.md)
- Skill: `.claude/skills/supabase-config/`（全キー一覧・CI/CD・マルチ環境）
- 公式: [Customizing email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates) / [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)

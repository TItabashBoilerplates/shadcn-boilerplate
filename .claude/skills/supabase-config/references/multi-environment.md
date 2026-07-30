# マルチ環境: `[remotes.*]` の正しい書き方

**この 1 ページが「メールテンプレート等の設定がリモートに反映されない」事故の原因と対処。**
`config.toml` を新規生成・更新するときは必ず読むこと。

---

## 0. 結論（最初に読む）

> **`[remotes.<name>]` の宣言が無い、または `project_id` が間違っていると、
> その環境への設定適用ステップは丸ごとスキップされる。**
>
> 公式（[Branching: Configuration](https://supabase.com/docs/guides/deployment/branching/configuration)）:
> 「**If no remote is declared or the project ID is incorrect, the configuration step is skipped.**」

**スキップは静かに起きる**。エラーも警告も出ないので、「`config.toml` に書いたのに反映されない」
「メールテンプレートだけ古いまま」という形でしか気づけない。**これが本リポジトリで繰り返し
起きていた不具合の根因**であり、AI エージェントが `config.toml` を生成するときに
`[remotes.*]` を埋め忘れることが直接の引き金になる。

したがって:

- **`config.toml` を作る／触るときは、`[remotes.*]` を必ずセットで書く。**
- **`project_id` は「その環境の Supabase project ref」でなければならない**（後述。親 project の
  ref を貼ると `project id is incorrect` 扱いでスキップされる）。

---

## 1. 構文と「どのブロックが選ばれるか」

```toml
[remotes.<name>]
project_id = "<その環境の project ref>"
```

| 項目 | 仕様 |
|---|---|
| `<name>` | **任意のラベル**。マッチングには使われない（人間が読むための名前） |
| `project_id` | **必須**。CLI / Branching runner は**この値**で「今適用しようとしている環境」と突き合わせる |
| ブロック内に書けるもの | 「**All other configuration options available in the root config are also supported in the remotes block.**」＝ root と同じ全セクションが書ける |

**マッチングはブロック名ではなく `project_id` で行われる。** ラベルは自由だが、混乱を避けるため
**git branch 名に揃える**（本リポジトリの規約）。

### `project_id` に何を入れるか（最頻出の間違い）

Supabase Branching を使う場合、`project_id` は **branch ごとに払い出される project ref**であって、
親プロジェクトの ref ではない。公式 discussion での maintainer 回答:

> 「The `project_id` field for your `[remotes.<branch>]` section must match the reference of the
> **actual branch** you are pointing toward.」
> （[supabase#37794](https://github.com/orgs/supabase/discussions/37794)）

取得方法:

```bash
supabase --experimental branches list
# BRANCH PROJECT ID 列の値を project_id に使う
```

- **各 `[remotes.*]` の `project_id` はすべて異なる値**になる（同じ値の使い回しは誤り）。
- **persistent branch を先に作ってから** config を書く。公式:「Since the `project_id` field must
  reference an existing branch, you need to **create the persistent branch before adding its
  configuration**.」

---

## 2. root と `[remotes.*]` のマージ規則

```
root（[auth] / [storage] / [functions.*] ...）      ← ベース。全環境に適用される
  └─ [remotes.<name>.<section>]                     ← その環境だけ上書き
```

| ケース | 挙動 |
|---|---|
| `[remotes.X]` を宣言し、セクションを書かない | **root の値がそのまま適用される**（＝上書き不要なら書かなくてよい） |
| `[remotes.X.auth] jwt_expiry = 1800` | その環境だけ 1800。他は root の値 |
| 配列値（`additional_redirect_urls` 等） | **置換**であってマージではない |
| `[remotes.X]` 自体が無い | **その環境には何も適用されない**（§0） |

> **重要**: メールテンプレートのような「全環境で同じ内容」の設定は、**root に 1 回書けばよい**。
> ただし **`[remotes.X]` ブロックの宣言自体は必要**（無いと適用ステップごとスキップされるため）。
> 「テンプレートを remotes 側にコピーする」必要は無い。**必要なのはブロックの存在と正しい `project_id`**。

---

## 3. 本リポジトリの環境マッピング

`docs/deployment/README.md` のとおり **Supabase は 1 project + persistent branch** 構成:

| git branch | 環境 | Supabase 実体 | config.toml での扱い |
|---|---|---|---|
| `main` | production | **project 本体**（default branch） | **root の設定がそのまま適用**（`project_id` は最上部のもの） |
| `staging` | staging | persistent branch `staging` | **`[remotes.staging]` が必須** |
| `develop` | dev | persistent branch `develop` | **`[remotes.develop]` が必須** |

```toml
# ───── ベース（= production に適用される）─────
project_id = "<production の project ref>"

[auth]
site_url = "env(SUPABASE_AUTH_SITE_URL)"

# メールテンプレートは全環境共通なので root に 1 回だけ書く
[auth.email.template.confirmation]
subject = "Confirm Your Signup / サインアップ確認"
content_path = "./supabase/templates/email/confirmation.html"
# recovery / magic_link / invite / email_change も同様

# ───── persistent branch: staging ─────
# ⚠️ このブロックが無いと staging には config が一切適用されない（テンプレートも含めて）
[remotes.staging]
project_id = "<staging branch の BRANCH PROJECT ID>"

[remotes.staging.auth]
site_url = "https://staging.example.com"

# ───── persistent branch: develop ─────
[remotes.develop]
project_id = "<develop branch の BRANCH PROJECT ID>"

[remotes.develop.auth]
site_url = "https://dev.example.com"
```

> `[remotes.staging]` の中に `[remotes.staging.auth.email.template.*]` を**書く必要は無い**。
> root のテンプレート定義がベースとして適用される。ブロックの存在が本質。

---

## 4. メールテンプレートは `config push` で本当に反映されるのか

**される。** ただし公式ドキュメントの記述が紛らわしいので整理する。

| 出典 | 記述 | 解釈 |
|---|---|---|
| [Customizing email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates) | 「For hosted projects managed by Supabase, copy the templates into the Email Templates section of the Dashboard.」 | このページは冒頭に「**This guide covers local development and CLI workflows**」とある**ローカル開発向けガイド**。「CLI で config push する運用」を前提にしていない読者向けの案内 |
| CLI 実装（`supabase/cli` の `pkg/config/auth.go`） | `body.MailerSubjectsInvite` / `body.MailerTemplatesInviteContent` 等に **subject と本文を詰めて Management API の auth config に送っている** | **`config push` はテンプレート本文をリモートに反映する** |

つまり **Dashboard へ手でコピーする必要は無い**。反映されないときは、まず
**`[remotes.*]` の有無と `project_id` の正しさ**（§0/§1）を疑うこと。

### テンプレート記述の制約（実装由来・必ず守る）

```toml
[auth.email.template.confirmation]
subject      = "..."
content_path = "./supabase/templates/email/confirmation.html"
```

- **`content_path` のみ受け付ける。** CLI のフィールド定義に
  `// Only content path is accepted in config.toml` とあり、インラインの `content = "<html>..."`
  は config.toml では使えない。
- **`content_path` は「`supabase/` の親ディレクトリ（＝リポジトリルート）」基準**の相対パス。
  CLI 実装が `cwd := filepath.Dir(SupabaseDirPath)` を基点に解決している
  （他のパス設定と基準が違う。実装にも `// FIXME: only email template is relative to repo
  directory` と明記されている）。だから `./supabase/templates/...` と書くのが正しく、
  `./templates/...` ではない。
- 対応する種別: `invite` / `confirmation` / `recovery` / `magic_link` / `email_change` /
  `reauthentication`。セキュリティ通知は `[auth.email.notification.<type>]`。

---

## 5. Secret の扱い（本リポジトリの現行方式）

環境ごとに違う **秘密値・生成値**は `[remotes.*]` に直書きせず **`env()` で外部化**する。

```toml
[auth.external.github]
enabled   = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID)"
secret    = "env(SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET)"
```

- 値の供給は **Doppler**（`.claude/skills/doppler/SKILL.md`）。**dotenvx は廃止済み**。
- ⚠️ **Doppler に `SUPABASE_` prefix のキーを登録してはならない**（sync が予約値違反で落ちる。
  `.claude/rules/env-naming.md`）。`config.toml` の `env()` が参照するのは
  **プロセス環境変数**なので、Doppler 側は非予約名で持ち、実行時に読み替える。
- 静的な差分（rate limit / pool size / feature flag 等）は `env()` ではなく
  **`[remotes.*]` に直接書く**方が可視性が高い。

| 差分の種類 | 置き場所 |
|---|---|
| 環境ごとに違う**秘密値** | `env()` → Doppler |
| 環境ごとに違う**静的設定** | `[remotes.<name>.<section>]` |
| 全環境共通（テンプレート等） | **root に 1 回** |

---

## 6. チェックリスト（`config.toml` を作る／変更したら必ず）

- [ ] リモート環境（persistent branch）の数だけ **`[remotes.<name>]` が存在する**
- [ ] 各 `project_id` が **`supabase branches list` の BRANCH PROJECT ID と一致**している
- [ ] `project_id` が**ブロックごとに異なる**（親 project ref の使い回しをしていない）
- [ ] persistent branch を**先に作ってから** config を書いた
- [ ] メールテンプレートは **root に 1 回**（remotes へのコピーは不要）
- [ ] テンプレートは **`content_path`**（インライン `content` を使っていない）
- [ ] `content_path` が **リポジトリルート基準**（`./supabase/templates/email/*.html`）
- [ ] Secret は `env()`。平文なし。Doppler 側のキー名に `SUPABASE_` prefix なし
- [ ] ローカル反映を確認した（`stop && supabase-start`。config は起動時にのみ読まれる）

---

## 7. 参照

- [Branching: Configuration](https://supabase.com/docs/guides/deployment/branching/configuration) — `[remotes.*]` とスキップ条件（**一次情報**）
- [CLI config reference](https://supabase.com/docs/guides/cli/config) — 全キー・`[remotes.<branch_name>]`
- [supabase#37794](https://github.com/orgs/supabase/discussions/37794) — `project_id` は branch の ref（maintainer 回答）
- [Customizing email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates) — ローカル向けガイド（hosted の案内は §4 の注意つきで読む）
- `supabase/cli` `pkg/config/auth.go` — `MailerSubjectsInvite` / `MailerTemplatesInviteContent`（config push がテンプレートを送る実装）
- 本リポジトリ: `docs/deployment/README.md`（環境マッピング）/ `.claude/rules/supabase-config.md`（強制ルール）

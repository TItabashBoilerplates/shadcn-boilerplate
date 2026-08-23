# Supabase を GitHub Actions で立ち上げる（公式手順の調査）2026-08-23

CI で Supabase をどう起こすかを、公式の一次情報で確認した記録。
きっかけは「E2E ジョブが公式手順を確認せずに `supabase-start` を呼んでいた」という指摘。

インストール済み CLI: **supabase 2.90.0**（devenv / Nix 提供）。

---

## 1. 公式が示している形

[Automated testing using GitHub Actions](https://supabase.com/docs/guides/deployment/ci/testing)
に **2 つ**のワークフローが載っている。

### DB テスト（pgTAP）

```yaml
name: 'database-tests'
on: pull_request
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase db start      # ← Postgres だけ
      - run: supabase test db
```

### Edge Functions テスト

```yaml
name: 'functions-tests'
on: pull_request
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - uses: denoland/setup-deno@v2
        with:
          deno-version: latest
      - run: supabase start          # ← フルスタック
      - run: deno test --allow-all deno-test.ts --env-file .env.local
```

**要点**:

| 事実 | 効き方 |
|---|---|
| **`supabase db start` は Postgres だけを起こす**（`supabase start` はフルスタック） | pgTAP に API / Studio / Storage は要らない。フルスタックを起こすと CI が数分無駄になる |
| CLI の入手は **`supabase/setup-cli`** | ただし後述の理由で本リポジトリでは採らない |
| `supabase status -o env` で env を書き出せる（[setup-cli README](https://github.com/supabase/setup-cli)） | 起動中スタックから鍵を取り出す公式の方法 |
| `supabase start -x <container>` で除外可（CLI `--help` 実出力で確認） | 除外可能: `gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor` |

> ⚠️ **ドキュメントの `setup-cli@v1` は古い。** action 本体の README は **`@v3`** を案内しており、
> v3 では `version` 省略時にリポジトリ直下の lockfile（`bun.lock` 等）から CLI 版を解決する。
> 「公式ドキュメントに書いてあるバージョン」をそのまま貼ると 2 世代古いものを踏む。

---

## 2. 本リポジトリでの採否

| 公式の要素 | 採否 | 理由 |
|---|---|---|
| `supabase db start` + `supabase test db` の**専用ジョブ** | **採用** | `ci.yml` に `db-tests` ジョブを追加。**これまで pgTAP は CI で一度も走っていなかった** |
| Edge Functions の `deno test --allow-all` | **採用** | `test-functions` script を追加し `unit-test` に組み込み。**これも CI で一度も走っていなかった** |
| **`supabase/setup-cli`** で CLI を入れる | **不採用** | 本リポジトリは **devenv（Nix）が supabase CLI を pin して提供**するのを唯一の経路にしている（`.claude/rules/commands.md`）。setup-cli を足すと CLI の出所が 2 つになり、**CI とローカルで別バージョンの CLI を使う**ことになる。`deploy-supabase.yml` も同じ理由で devenv 経由に揃っている |
| E2E ジョブでの `supabase start -x ...` による軽量化 | **不採用** | CI とローカルで**起動しているサービスが変わる**と「ローカルでは通るのに CI で落ちる」を作る。節約できるのは 1〜2 分で、割に合わない |
| `supabase status -o env` で鍵を取り出す | **不採用（現状維持）** | ローカルの鍵は `env/backend/.env.local` に決定的な値として入っており、devenv がシェルに流す。二重の入手経路を作らない |

---

## 3. 走らせて分かったこと（実測）

### `supabase test db` は**最初から落ちていた**

`supabase/tests/` には `000-setup-tests-hooks.sql` しか無く、その中身は
`create extension` とコメントだけ。`pg_prove` は**各ファイルに TAP のプランを要求する**ため、

```
/…/000-setup-tests-hooks.sql .. No subtests run
  Parse errors: No plan found in TAP output
Result: FAIL          ← exit 1
```

となる。**テストが 0 件でもスイート全体が FAIL する**。CI で一度も走らせていなかったので、
誰も気づいていなかった。

対処:

1. `000-setup-tests-hooks.sql` に 1 件だけアサーション（`has_extension`）を持たせて TAP を出す
2. `users_rls.sql` を追加し、`public.users` の RLS 設定を検証する
   （RLS 有効・ポリシー 3 本の過不足・各ポリシーの対象コマンドと対象ロール）

結果: `Files=2, Tests=10, Result: PASS`（exit 0）。

### 各ファイルは自動でトランザクションに包まれてロールバックされる

したがって `000-` で作ったオブジェクトは**後続のファイルに残らない**。
「setup ファイルで共通の下ごしらえをする」という発想はそのままでは成立しない。

### 行レベルの RLS テストはまだ書けない

`tests.authenticate_as` 等を提供する
[supabase-test-helpers](https://github.com/usebasejump/supabase-test-helpers) を
このリポジトリはまだ取り込んでいない。取り込むまでは**スキーマレベル**の検証に留める。
手で `set local request.jwt.claims` を組み立てるのは禁止（`.claude/skills/pgtap/SKILL.md`）。

---

## 参考

- [Automated testing using GitHub Actions](https://supabase.com/docs/guides/deployment/ci/testing)
- [Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview)
- [supabase/setup-cli](https://github.com/supabase/setup-cli)（README は `@v3`）
- [supabase test db (CLI reference)](https://supabase.com/docs/reference/cli/supabase-test-db)
- `.claude/skills/pgtap/SKILL.md` / `.claude/rules/commands.md`

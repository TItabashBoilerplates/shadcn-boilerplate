---
name: pgtap
description: "pgTAP + `supabase test db` による RLS ポリシー・DB 関数・制約の SQL ベーステスト。RLS を足す/直す、`supabase/tests/` にテストを書く、CI で DB テストを回す、といった場面で必ず起動する。配置規約・TDD ワークフロー・代表的アサーション・supabase-test-helpers による認証コンテキスト切替に加え、**このリポジトリで実際に踏んだ罠**を扱う。「`No plan found in TAP output` でテストが 0 件でもスイート全体が FAIL する」「各ファイルは自動ロールバックされるので setup の成果物が後続ファイルに残らない」「`supabase db start` は `supabase/migrations/` しか流さないため Drizzle のマイグレーション適用が別途要る（`relation \"public.users\" does not exist`）」「helpers 未取り込みの間は行レベルではなく設定レベル（policies_are / policy_cmd_is / policy_roles_are）で検証する」。「pgTAP」「supabase test db」「test-db」「RLS のテスト」「DB テストが CI で落ちる」も対象。"
---

# pgTAP スキル

このプロジェクトは **pgTAP** と `supabase test db` で RLS ポリシー・DB 関数・制約・トリガーをテストする。

## なぜ pgTAP か

- RLS の正しさは **DB 層で完結して検証** するのが最短・最堅牢
- マルチテナント/PII 保護が最重要要件（→ DB 層の境界で絶対に漏らさない）
- Supabase 公式が CLI (`supabase test db`) + `pg_prove` で直接サポート
- アプリ経由のテスト（`supabase-js` + Vitest）だと「RLS のバグ」「クエリのバグ」が混ざり切り分け困難

**RLS は pgTAP。ビジネスロジックは Vitest/pytest。E2E は Maestro。** 役割を分ける。

## 基本事項

| 項目 | 値 |
|------|-----|
| 実行コマンド | `test-db`（= `supabase test db --local`） |
| テスト配置先 | `supabase/tests/` フラット構成 |
| ファイル拡張子 | `.sql` または `.pg` |
| 実行順 | アルファベット順（`000-setup-*` で setup を先頭実行） |
| トランザクション | 各ファイルごとに自動ラップ・自動ロールバック |
| 依存 | Docker（`pg_prove` をコンテナで実行）、`supabase start` 起動済み |

## 最初に踏む罠（実測。ここを知らないと必ず 1 回落とす）

| # | 事実 | 症状 |
|---|---|---|
| 1 | **すべてのファイルが TAP のプランを出さなければならない** | `create extension` とコメントだけの setup ファイルがあると `Parse errors: No plan found in TAP output` で **テストが 0 件でもスイート全体が FAIL**（exit 1）する |
| 2 | **各ファイルは自動でトランザクションに包まれ、ロールバックされる** | `000-` で作ったオブジェクトは**後続のファイルに残らない**。「setup ファイルで共通の下ごしらえ」は成立しない |
| 3 | **`supabase db start` が流すのは `supabase/migrations/` だけ** | 本リポジトリはマイグレーションを **Drizzle に集約**しているので、起動しただけの DB は `public` が空。`relation "public.users" does not exist` で落ちる |
| 4 | **supabase-test-helpers はまだ取り込んでいない** | `tests.authenticate_as` 等が無いので、**行レベルの RLS テストは書けない**（後述の代替を使う） |

### 1 の対処: setup ファイルにも 1 件アサーションを持たせる

```sql
-- 拡張はロールバックされうるのでトランザクションの外で
create extension if not exists pgtap with schema extensions;

begin;
select plan(1);
select has_extension('extensions', 'pgtap', 'pgtap がロードされている');
select * from finish();
rollback;
```

### 3 の対処: pgTAP の前に必ずマイグレーションを流す

```bash
supabase db start
devenv tasks run db:migrate-deploy   # ← 既存の適用のみ。generate を含む migrate-dev は使わない
test-db
```

CI も同じ順序（`.github/workflows/ci.yml` の `db-tests` ジョブ）。
**ローカルで先に migrate 済みだと手元では通ってしまう**ので、この差は CI で初めて出る。

### 4 の対処: helpers が無い間は「設定」をテストする

行レベルの挙動（alice は bob の行を見られない）は書けないが、**RLS の設定が正しいか**は
helpers 無しで検証できる。実際に `supabase/tests/users_rls.sql` がこの形で入っている:

```sql
begin;
select plan(4);

-- RLS が有効か（.enableRLS() が外れたら落ちる）
select is(
  (select relrowsecurity from pg_class where oid = 'public.users'::regclass),
  true, 'RLS が有効'
);

-- ポリシーの過不足（増えても減っても落ちる）
select policies_are('public', 'users',
  array['insert_policy_users', 'select_own_user', 'edit_policy_users'], 'ポリシーが 3 本');

-- 対象コマンドと対象ロール（ここが広がるとそのまま権限昇格）
select policy_cmd_is('public', 'users', 'edit_policy_users', 'all', 'ALL に効く');
select policy_roles_are('public', 'users', 'edit_policy_users',
  array['authenticated']::name[], 'anon を含まない');

select * from finish();
rollback;
```

**helpers を取り込んだら、このファイルの隣に行レベルのテストを足すこと。**
手で `set local request.jwt.claims` を組み立てるのは引き続き禁止。

---

## セットアップ

### 1. 共通セットアップファイル

`supabase/tests/000-setup-tests-hooks.sql` で pgtap 拡張と supabase-test-helpers をロードする。
このファイルはアルファベット順で最初に評価される。

```sql
-- supabase/tests/000-setup-tests-hooks.sql
create extension if not exists pgtap with schema extensions;

-- supabase-test-helpers をインストール
-- https://github.com/usebasejump/supabase-test-helpers
-- 最新の SQL を取り込み、tests スキーマに関数群を定義する
```

**supabase-test-helpers の関数**:

| 関数 | 用途 |
|------|------|
| `tests.create_supabase_user(identifier, email?, phone?, metadata?)` | テスト用ユーザー作成 |
| `tests.authenticate_as(identifier)` | 指定ユーザーとして認証（JWT + ROLE 切替） |
| `tests.authenticate_as_service_role()` | service_role で RLS バイパス（フィクスチャ作成用） |
| `tests.clear_authentication()` | 未認証（anon）状態に戻す |
| `tests.get_supabase_uid(identifier)` | identifier から user_id を取得 |

### 2. 実行

```bash
test-db
```

## テストファイルの型

```sql
-- supabase/tests/posts_rls.sql
begin;

select plan(6);

-- ===== フィクスチャ作成（service_role で RLS バイパス） =====
select tests.create_supabase_user('alice', 'alice@example.com');
select tests.create_supabase_user('bob',   'bob@example.com');

select tests.authenticate_as_service_role();

insert into public.posts (id, owner_id, title) values
  ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('alice'), 'Alice post'),
  ('22222222-2222-2222-2222-222222222222', tests.get_supabase_uid('bob'),   'Bob post');

-- ===== SELECT: 認証ユーザーは自分の行のみ見える =====
select tests.authenticate_as('alice');

select is_empty(
  $$ select 1 from public.posts where owner_id = tests.get_supabase_uid('bob') $$,
  'alice は bob の post を取得できない'
);

select results_eq(
  $$ select title from public.posts $$,
  $$ values ('Alice post'::text) $$,
  'alice は自分の post のみ取得できる'
);

-- ===== INSERT: 自分の owner_id でのみ作成可能 =====
select lives_ok(
  $$ insert into public.posts (owner_id, title) values (tests.get_supabase_uid('alice'), 'new') $$,
  'alice は自分の post を作成できる'
);

select throws_ok(
  $$ insert into public.posts (owner_id, title) values (tests.get_supabase_uid('bob'), 'spoof') $$,
  'new row violates row-level security policy for table "posts"',
  '他人の owner_id で作成はブロックされる'
);

-- ===== DELETE: 他人のデータは削除不可 =====
select throws_ok(
  $$ delete from public.posts where owner_id = tests.get_supabase_uid('bob') $$,
  null,
  '他人の post の削除はブロックされる'
);

-- ===== 未認証（anon）は読めない =====
select tests.clear_authentication();

select is_empty(
  $$ select 1 from public.posts $$,
  '未認証ユーザーは post を取得できない'
);

select * from finish();
rollback;
```

**ポイント**:
- `begin; ... rollback;` はファイル単位で書いておくと読み手に意図が伝わる（`supabase test db` 自体も自動ロールバックするため二重だが害はない）
- `plan(N)` の N はアサーション数と一致させる（違うと FAIL）
- フィクスチャは必ず `authenticate_as_service_role()` で作成してから検証ユーザーに切り替える

## テストマトリクス（必須カバレッジ）

RLS を追加したテーブルは以下すべてを検証する:

| ロール | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `anon`（未認証） | ✅ | ✅ | ✅ | ✅ |
| `authenticated`（自テナント/所有者） | ✅ | ✅ | ✅ | ✅ |
| `authenticated`（他テナント/非所有者） | ✅ | ✅ | ✅ | ✅ |
| `service_role`（フィクスチャ専用、テスト対象外） | - | - | - | - |

**許可ケース**は `lives_ok` / `results_eq` で検証。
**拒否ケース**は `throws_ok`（書き込み系）または `is_empty`（読み取り系、RLS は 0 行返却）で検証。

## 代表的アサーション

### 結果検証

- `is(actual, expected, description)` — スカラー比較
- `results_eq(query, expected_values, description)` — クエリ結果と期待値の一致
- `results_ne(query, expected_values, description)` — 不一致
- `is_empty(query, description)` — 0 行を期待（RLS 読み取り拒否の検証に必須）

### 実行可否

- `lives_ok(sql, description)` — SQL が例外なく完了
- `throws_ok(sql, expected_error_message?, description)` — SQL が指定エラーで失敗

### スキーマ・ポリシー

- `policies_are(schema, table, expected_policy_names_array)` — ポリシー名の過不足確認
- `policy_cmd_is(schema, table, policy_name, expected_cmd)` — `SELECT`/`INSERT`/`UPDATE`/`DELETE`/`ALL` の確認
- `policy_roles_are(schema, table, policy_name, expected_roles_array)` — 適用ロール確認

### テーブル・カラム

- `has_table(schema, table)`, `has_column(schema, table, col)`, `col_is_pk(...)`, `col_not_null(...)`

## TDD ワークフロー

1. **Red**: RLS ポリシーをまだ書かない状態で、拒否シナリオのテストを書く。
   `tests.authenticate_as('bob')` で他人の行を SELECT できてしまい `is_empty` が FAIL する。
2. **Green**: 最小のポリシーを `drizzle/schema/` に追加して `devenv tasks run app:migrate-dev` を依頼。
   → 再度 `test-db` で PASS。
3. **Refactor**: ポリシー式を読みやすく整理。テストは触らない。

**重要**: テストを修正して PASS させるのは禁止。必ず実装（RLS ポリシー）側を修正する。

## マルチテナントの例

JWT の `app_metadata.tenant_id` を RLS で参照する場合:

```sql
-- setup
select tests.create_supabase_user(
  'alice',
  'alice@acme.com',
  phone => null,
  metadata => jsonb_build_object('tenant_id', 'acme')
);
select tests.create_supabase_user(
  'carol',
  'carol@contoso.com',
  phone => null,
  metadata => jsonb_build_object('tenant_id', 'contoso')
);

-- テスト
select tests.authenticate_as('alice');
select is_empty(
  $$ select 1 from public.orders where tenant_id = 'contoso' $$,
  'acme の alice は contoso の注文を取得できない'
);
```

※ `tests.create_supabase_user` の metadata 引数は helpers のバージョンにより `raw_user_meta_data` / `raw_app_meta_data` に対応するかが異なるため、使用している helpers のソースを確認する。

## 禁止パターン

- ❌ `SET LOCAL request.jwt.claims = '...'` を手動で組み立てる
  → `tests.authenticate_as(...)` を使う（ROLE 切替も一緒に面倒見てくれる）
- ❌ RLS を `alter table disable row level security` で無効化してテストする
  → service_role で `authenticate_as_service_role()` を使う
- ❌ `plan(N)` の N をアサーション数と合わせずに済ませる
  → 合わないと pgTAP は FAIL 扱い
- ❌ フィクスチャを `authenticated` ロールで作成して RLS で詰まる
  → `authenticate_as_service_role()` で seed

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `function tests.authenticate_as(text) does not exist` | supabase-test-helpers 未ロード | `000-setup-tests-hooks.sql` を確認 |
| `extension "pgtap" is not available` | pgtap extension 未有効化 | `create extension if not exists pgtap with schema extensions;` |
| Docker エラー | Docker 未起動 or `supabase start` 未実行 | `supabase start` → 再実行 |
| `No plan found in TAP output` | そのファイルが `plan()` / `finish()` を出していない | setup ファイルでも 1 件アサーションを出す（上記 罠 1） |
| `relation "public.xxx" does not exist` | Drizzle のマイグレーションが未適用 | `devenv tasks run db:migrate-deploy` を先に流す（上記 罠 3） |
| ローカルで通るのに CI で落ちる | ローカルの DB に前回のマイグレーションが残っている | `supabase stop --no-backup` → `supabase db start` から再現する |
| 期待と違う件数 | `plan(N)` の N 不一致 or フィクスチャが他のテストに混線 | N を数え直す・各ファイルは独立（自動 rollback）である前提 |
| `throws_ok` が PASS しない | エラーメッセージ文字列が Postgres バージョンで違う | 2番目の引数を `null` にしてメッセージ非依存にする |

## 参考

- [Supabase: pgTAP Extension](https://supabase.com/docs/guides/database/extensions/pgtap)
- [Supabase: Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview)
- [Supabase: pgTAP Extended](https://supabase.com/docs/guides/local-development/testing/pgtap-extended)
- [supabase test db CLI](https://supabase.com/docs/reference/cli/supabase-test-db)
- [usebasejump/supabase-test-helpers](https://github.com/usebasejump/supabase-test-helpers)
- [pgTAP 本家ドキュメント](https://pgtap.org/documentation.html)

-- ============================================================================
-- users_rls.sql — public.users の RLS 設定が意図どおりであることを検証する
--
-- ■ 何を守っているか
--   RLS は「有効になっているか」「どのロールに」「どのコマンドで」効くかを
--   間違えると、**アプリからは正常に見えたまま**データが漏れる。
--   Drizzle スキーマ（drizzle/schema/schema.ts）を書き換えたときに、
--   ポリシーが消えた・対象ロールが広がった、をここで落とす。
--
-- ■ 何を守っていないか（正直に書いておく）
--   「alice が bob の行を更新できない」という**行レベルの挙動**は、
--   supabase-test-helpers（tests.authenticate_as 等）が要るのでまだ書けない。
--   取り込み次第、このファイルの隣に行レベルのテストを足すこと。
--   手で JWT クレームを組み立てるのは禁止（.claude/skills/pgtap/SKILL.md）。
-- ============================================================================

begin;

select plan(9);

-- ===== テーブルの存在 =====
select has_table('public', 'users', 'public.users が存在する');

-- ===== RLS が有効であること =====
-- 公開スキーマのテーブルは RLS 必須（.claude/rules/supabase-first.md）。
-- Drizzle 側の .enableRLS() が外れたらここで落ちる。
select is(
  (select relrowsecurity from pg_class where oid = 'public.users'::regclass),
  true,
  'public.users で RLS が有効になっている'
);

-- ===== ポリシーの過不足 =====
-- 増えていても減っていても落ちる（意図しないポリシーの混入も検知する）。
select policies_are(
  'public',
  'users',
  array['insert_policy_users', 'select_own_user', 'edit_policy_users'],
  'public.users のポリシーが 3 本ちょうどである'
);

-- ===== 各ポリシーの対象コマンド =====
select policy_cmd_is(
  'public', 'users', 'insert_policy_users', 'insert',
  'insert_policy_users は INSERT に効く'
);
select policy_cmd_is(
  'public', 'users', 'select_own_user', 'select',
  'select_own_user は SELECT に効く'
);
select policy_cmd_is(
  'public', 'users', 'edit_policy_users', 'all',
  'edit_policy_users は ALL に効く'
);

-- ===== 各ポリシーの対象ロール =====
-- ここが広がる（例: anon が edit に入る）と、そのまま権限昇格になる。
select policy_roles_are(
  'public', 'users', 'insert_policy_users', array['supabase_auth_admin']::name[],
  'insert_policy_users は supabase_auth_admin 専用（Auth Hook 用）'
);
select policy_roles_are(
  'public', 'users', 'select_own_user', array['anon', 'authenticated']::name[],
  'select_own_user は anon と authenticated が対象'
);
select policy_roles_are(
  'public', 'users', 'edit_policy_users', array['authenticated']::name[],
  'edit_policy_users は authenticated のみが対象（anon を含まない）'
);

select * from finish();

rollback;

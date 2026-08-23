-- ============================================================================
-- 000-setup-tests-hooks.sql
--
-- pgTAP の共通セットアップ。`supabase test db` はアルファベット順でファイルを
-- 評価するため、このファイル名（000- プレフィックス）で必ず最初に実行される。
--
-- ⚠️ **このファイルも TAP を出力しなければならない。**
--   `pg_prove` は各ファイルに TAP のプランを要求する。拡張を作るだけで
--   `plan()` を出さないと "No plan found in TAP output" のパースエラーになり、
--   **テストが 0 件でもスイート全体が FAIL する**（実際にそうなっていた）。
--   したがってここでも 1 件だけアサーションを出す。
--
-- ⚠️ **各ファイルは自動でトランザクションに包まれ、ロールバックされる。**
--   つまりここで作ったオブジェクトは後続のファイルには残らない。
--   共有したいものは各テストファイルの冒頭で自前に用意すること。
--
-- 詳細は .claude/skills/pgtap/SKILL.md を参照。
-- ============================================================================

-- pgTAP 拡張（extensions スキーマに置いて public を汚さない）。
-- ロールバックされる可能性があるのでトランザクションの外で実行する。
create extension if not exists pgtap with schema extensions;

begin;

select plan(1);

select has_extension(
  'extensions',
  'pgtap',
  'pgtap 拡張が extensions スキーマにロードされている'
);

select * from finish();

rollback;

-- ----------------------------------------------------------------------------
-- supabase-test-helpers について
--
-- 行レベルの RLS 検証（「alice は bob の行を見られない」等）には
-- https://github.com/usebasejump/supabase-test-helpers が要る:
--   tests.create_supabase_user / tests.authenticate_as /
--   tests.authenticate_as_service_role / tests.get_supabase_uid
--
-- **このリポジトリにはまだ取り込んでいない。** 取り込むまでは、RLS の
-- 「設定が正しいか」（有効化・ポリシーの過不足・対象ロール・対象コマンド）を
-- users_rls.sql のようにスキーマレベルで検証する。
--
-- ⚠️ 手で `set local request.jwt.claims` を組み立てるのは禁止
--    （ロール切替まで面倒を見てくれないので、通ったつもりの穴が空く）。
-- ----------------------------------------------------------------------------

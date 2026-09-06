-- ============================================================================
-- app_release_policies_rls.sql
--   推奨 / 強制アップデート方針テーブルの RLS と CHECK 制約を検証する。
--
-- ■ 何を守っているか
--   1. **未ログインでも読めること**。アップデート判定はログインより前に走るので、
--      `anon` から SELECT できなくなった瞬間に全クライアントが方針を取得できなくなる
--      （アプリ側はフェイルオープンするので「無言で強制アップデートが効かなくなる」）。
--   2. **クライアントから書けないこと**。ここを書けると、任意のユーザーが
--      `minimum_version` を吊り上げて**全ユーザーのアプリを起動不能にできる**。
--      書き込みポリシーは 1 本も無い（RLS 有効 + ポリシー無し = 既定拒否）のが正しい状態。
--   3. **`minimum_version` が `latest_version` を超えられないこと**。
--      超えるとストアに存在しない版を要求することになり、
--      ユーザーもストア審査担当者も復旧できない。UPDATE のタイプミスで起きるので
--      DB 側で止める。
--
-- 実装: drizzle/schema/app-release-policies.ts
-- 運用: docs/mobile/app-update-runbook.md / .claude/skills/app-update/
-- ============================================================================

begin;

select plan(12);

-- 既存行を消してから始める（このトランザクションは最後に rollback するので実 DB は変わらない）。
-- seed が ios / android の行を入れているため、消さないと正常系の INSERT が
-- **主キー重複**で落ちる。「seed を流したかどうか」でテスト結果が変わってはいけない。
delete from public.app_release_policies;

-- ===== テーブルの存在 =====
select has_table('public', 'app_release_policies', 'public.app_release_policies が存在する');

-- ===== RLS が有効であること =====
select is(
  (select relrowsecurity from pg_class where oid = 'public.app_release_policies'::regclass),
  true,
  'public.app_release_policies で RLS が有効になっている'
);

-- ===== ポリシーの過不足 =====
-- 増えていても減っていても落ちる。とくに**書き込みポリシーの追加**をここで検知する。
select policies_are(
  'public',
  'app_release_policies',
  array['select_app_release_policies'],
  'ポリシーは select 1 本だけ（書き込みポリシーは存在しない）'
);

select policy_cmd_is(
  'public', 'app_release_policies', 'select_app_release_policies', 'select',
  'select_app_release_policies は SELECT に効く'
);

-- anon が外れると、ログイン前のアップデート判定が取得できなくなる。
select policy_roles_are(
  'public', 'app_release_policies', 'select_app_release_policies',
  array['anon', 'authenticated']::name[],
  'select_app_release_policies は anon と authenticated が対象'
);

-- ===== CHECK 制約: 版の表記 =====
-- 3 セグメントの数値に固定することで、string_to_array(...)::int[] の比較が
-- そのまま版の大小になる（"1.10.0" < "1.9.0" という文字列比較の事故を防ぐ）。
select throws_ok(
  $$insert into public.app_release_policies (platform, minimum_version, latest_version, store_url)
    values ('ios', '1.2', '1.2.0', 'https://apps.apple.com/app/id1')$$,
  '23514',
  null,
  'minimum_version が 3 セグメントでないと拒否される'
);

select throws_ok(
  $$insert into public.app_release_policies (platform, minimum_version, latest_version, store_url)
    values ('ios', '1.2.0', '1.2.0-beta', 'https://apps.apple.com/app/id1')$$,
  '23514',
  null,
  'latest_version にプレリリースタグが付くと拒否される'
);

-- ===== CHECK 制約: 下限が最新を超えない =====
select throws_ok(
  $$insert into public.app_release_policies (platform, minimum_version, latest_version, store_url)
    values ('ios', '2.0.0', '1.9.0', 'https://apps.apple.com/app/id1')$$,
  '23514',
  null,
  'minimum_version > latest_version は拒否される（全員が詰む状態を作らせない）'
);

-- 1.10.0 > 1.9.0 が数値として比較されていること（文字列比較なら通ってしまう）
select throws_ok(
  $$insert into public.app_release_policies (platform, minimum_version, latest_version, store_url)
    values ('ios', '1.10.0', '1.9.0', 'https://apps.apple.com/app/id1')$$,
  '23514',
  null,
  '1.10.0 > 1.9.0 が数値として判定される（文字列比較になっていない）'
);

-- ===== CHECK 制約: platform / store_url =====
select throws_ok(
  $$insert into public.app_release_policies (platform, minimum_version, latest_version, store_url)
    values ('web', '1.0.0', '1.0.0', 'https://apps.apple.com/app/id1')$$,
  '23514',
  null,
  'platform は ios / android 以外を受け付けない'
);

select throws_ok(
  $$insert into public.app_release_policies (platform, minimum_version, latest_version, store_url)
    values ('ios', '1.0.0', '1.0.0', 'itms-apps://apps.apple.com/app/id1')$$,
  '23514',
  null,
  'store_url は https:// 以外を受け付けない（行を書き換えられても任意 URL を開かせない）'
);

-- ===== 正常系 =====
select lives_ok(
  $$insert into public.app_release_policies (platform, minimum_version, latest_version, store_url, release_notes)
    values ('ios', '1.9.0', '1.10.0', 'https://apps.apple.com/app/id1', '{"en":"Bug fixes","ja":"不具合修正"}'::jsonb)$$,
  '正しい行は挿入できる（release_notes はロケールキーの jsonb）'
);

select * from finish();

rollback;

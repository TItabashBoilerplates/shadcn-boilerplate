# RLS パフォーマンス最適化

Row Level Security (RLS) のパフォーマンスを最大化するためのベストプラクティス。

---

## 必須: 関数を SELECT でラップ

**最も重要な最適化**。`auth.uid()` や `auth.jwt()` を `select` でラップすることで、行ごとの関数呼び出しを防ぎ、結果をキャッシュする。

```sql
-- ❌ 遅い: 行ごとに関数呼び出し（最大99%遅い）
create policy "slow_policy" on data
using ( auth.uid() = user_id );

-- ✅ 高速: 結果をキャッシュ（initPlan として最適化）
create policy "fast_policy" on data
using ( (select auth.uid()) = user_id );
```

### 効果

| テスト | Before (ms) | After (ms) | 改善率 |
|-------|-------------|------------|--------|
| `auth.uid()` | 179 | 9 | 94.97% |
| security definer 関数 | 178,000 | 12 | 99.993% |

---

## インデックスの追加

RLSポリシーで使用するカラムにはインデックスを追加：

```sql
-- RLSポリシー
create policy "Users read own data" on user_data
to authenticated
using ( (select auth.uid()) = user_id );

-- インデックス追加（必須）
create index user_data_user_id_idx
on user_data using btree (user_id);
```

### 効果

| Before | After | 改善率 |
|--------|-------|--------|
| 171ms | <0.1ms | 99.94% |

---

## ロールを明示的に指定

`TO` 句でロールを指定することで、不要なポリシー評価をスキップ：

```sql
-- ❌ ロール指定なし: anon でもポリシー評価が実行される
create policy "bad_policy" on data
using ( (select auth.uid()) = user_id );

-- ✅ ロール指定あり: anon アクセス時はポリシー評価をスキップ
create policy "good_policy" on data
to authenticated  -- ロールを明示
using ( (select auth.uid()) = user_id );
```

### 効果

| アクセス | Before | After | 改善率 |
|---------|--------|-------|--------|
| anon ユーザー | 170ms | <0.1ms | 99.78% |

---

## security definer 関数

RLSをバイパスする関数で、複雑な権限チェックを高速化：

```sql
-- private スキーマに作成（重要: 公開スキーマに作成しない）
create function private.has_role(role_name text)
returns boolean
language plpgsql
security definer  -- 作成者の権限で実行
set search_path = ''  -- セキュリティ強化
as $$
begin
  return exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = role_name
  );
end;
$$;

-- RLSポリシーで使用
create policy "Admins can access all" on data
to authenticated
using ( (select private.has_role('admin')) );
```

### 注意点

- **必ず `private` スキーマに作成**: 公開スキーマに作成すると API 経由で呼び出し可能になる
- **`set search_path = ''`**: SQL インジェクション対策

---

## ジョインの最小化

ソーステーブルとのジョインを避け、フィルタ条件をセットで取得：

```sql
-- ❌ 遅い: ソーステーブルとジョイン
create policy "slow_policy" on test_table
using (
  (select auth.uid()) in (
    select user_id from team_user
    where team_user.team_id = team_id  -- test_table.team_id とジョイン
  )
);

-- ✅ 高速: フィルタ条件をセットで取得（ジョインなし）
create policy "fast_policy" on test_table
using (
  team_id in (
    select team_id from team_user
    where user_id = (select auth.uid())  -- ジョインなし
  )
);
```

### 効果

| Before | After | 改善率 |
|--------|-------|--------|
| 9,000ms | 20ms | 99.78% |

---

## クエリにフィルタを追加

RLSポリシーと同じ条件をクエリにも追加：

```typescript
// ❌ フィルタなし: RLSポリシーのみに依存
const { data } = supabase.from('table').select()

// ✅ フィルタあり: クエリプランが最適化される
const { data } = supabase
  .from('table')
  .select()
  .eq('user_id', userId)  // RLSポリシーと同じ条件
```

### 効果

| Before | After | 改善率 |
|--------|-------|--------|
| 171ms | 9ms | 94.74% |

---

## 複数 Permissive ポリシーを避ける

同じテーブル・操作に複数の permissive ポリシーがあると、すべて評価される：

```sql
-- ❌ 複数ポリシー: OR で結合され、すべて評価される
create policy "policy_a" on data using ( department = current_dept() );
create policy "policy_b" on data using ( grade_level <= current_grade() );

-- ✅ 単一ポリシーに統合
create policy "consolidated_policy" on data
using (
  department = current_dept()
  and grade_level <= current_grade()
);
```

---

## JWT クレームの活用

### 安全な使用法

```sql
-- ✅ 安全: app_metadata（サーバーサイドでのみ変更可能）
create policy "Team members only" on team_data
to authenticated
using (
  team_id in (select auth.jwt() -> 'app_metadata' -> 'teams')
);

-- ❌ 危険: user_metadata（ユーザーが変更可能）
-- 認可に使用しないこと！
create policy "bad_policy" on data
using ( role = auth.jwt() -> 'user_metadata' ->> 'role' );
```

### 注意点

- JWT はリフレッシュまでキャッシュされる
- `app_metadata` を更新しても、JWT リフレッシュまで反映されない
- Cookie サイズ制限（4096バイト）に注意

---

## MFA 強制

機密データへのアクセスに MFA を要求：

```sql
-- restrictive ポリシーとして追加
create policy "Require MFA for sensitive data"
on sensitive_data
as restrictive  -- 他のポリシーに追加で適用
for all
to authenticated
using ( (select auth.jwt()->>'aal') = 'aal2' );
```

### AAL（Authentication Assurance Level）

| AAL | 意味 |
|-----|------|
| `aal1` | 単一要素認証（パスワードのみ） |
| `aal2` | 多要素認証（MFA 済み） |

---

## パフォーマンステストの実施

本番環境前にRLSポリシーのパフォーマンスを検証：

```sql
-- テスト用の JWT クレームを設定
set request.jwt.claims = '{
  "sub": "test-user-uuid",
  "role": "authenticated",
  "aal": "aal1"
}';

-- クエリを実行してパフォーマンスを確認
explain analyze
select * from your_table where user_id = 'test-user-uuid';

-- リセット
reset request.jwt.claims;
```

---

## 重要: INSERT + SELECT パターンの落とし穴

**これは非常によくあるエラーです。** `.insert().select()` を使用する際、SELECT ポリシーがないと 403 エラーになります。

### 問題の本質

```
.insert({...}).select('id')
       ↓
PostgreSQL: INSERT INTO ... RETURNING id
       ↓
RETURNING句 = SELECT権限が必要
       ↓
SELECTポリシーがないと403
```

### 公式の言及

[GitHub Discussion #36619](https://github.com/orgs/supabase/discussions/36619) でSupabaseのメンテナーが明確に説明しています：

> "In postgres RLS the insert policy is not enough, you actually need the select policy to be true too."

これは **PostgreSQL の RLS の仕様** であり、Supabase 固有の問題ではありません。

### エラー例

```typescript
// ❌ 403 エラー: SELECTポリシーがない
const { data, error } = await supabase
  .from('work_creators')
  .insert({ work_id: workId, creator_id: creatorId })
  .select('id')  // ← RETURNING句 = SELECT権限が必要

// error: { code: '42501', message: 'permission denied for table work_creators' }
```

### 解決策（3つ）

| 方法 | 説明 | コード例 |
|------|------|---------|
| **1. SELECTポリシー追加** | 挿入した行を読める条件を追加 | RLS ポリシーを追加 |
| **2. `.select()` を使わない** | クライアントでUUID生成して渡す | `insert({ id: crypto.randomUUID(), ... })` |
| **3. `returning: 'minimal'`** | RETURNING句を無効化 | `insert({...}, { returning: 'minimal' })` |

### 解決策1: SELECTポリシー追加

```sql
-- INSERT ポリシー
create policy "Users can insert own data"
on work_creators for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- ✅ SELECT ポリシーも必要
create policy "Users can read own data"
on work_creators for select
to authenticated
using ( (select auth.uid()) = user_id );
```

### 解決策2: `.select()` を使わない

```typescript
// ✅ クライアントでUUIDを生成して渡す
const id = crypto.randomUUID()

const { error } = await supabase
  .from('work_creators')
  .insert({ id, work_id: workId, creator_id: creatorId })
  // .select() を使わない

// id は既に分かっているので RETURNING 不要
```

### 解決策3: `returning: 'minimal'`

```typescript
// ✅ RETURNING句を無効化
const { error } = await supabase
  .from('work_creators')
  .insert(
    { work_id: workId, creator_id: creatorId },
    { returning: 'minimal' }  // RETURNING を使わない
  )
```

### この問題がよく起きる理由

1. **Supabase JS Client は `.insert().select()` パターンを推奨している**
2. **公式ドキュメントでこの制約が目立つ場所に書かれていない**
3. **多対多テーブル（work_creators 等）を使う設計で SELECT ポリシーが後から効く場合に頻発**

### 推奨アプローチ

```typescript
// ✅ 推奨: INSERT するテーブルには必ず SELECT ポリシーも用意
// または、クライアントで ID を生成して .select() を使わない

// パターン A: SELECT ポリシーを用意
const { data, error } = await supabase
  .from('posts')
  .insert({ title: 'Hello' })
  .select('id')  // SELECT ポリシーがあれば OK

// パターン B: ID を事前生成
const id = crypto.randomUUID()
await supabase.from('posts').insert({ id, title: 'Hello' })
// 返り値が不要なら .select() なしで OK
```

---

## チェックリスト

- [ ] `auth.uid()` / `auth.jwt()` を `(select ...)` でラップしているか
- [ ] RLSで使用するカラムにインデックスがあるか
- [ ] `TO authenticated` / `TO anon` を指定しているか
- [ ] 複数の permissive ポリシーを統合できるか
- [ ] ジョインを最小化しているか
- [ ] security definer 関数は private スキーマにあるか
- [ ] user_metadata を認可に使用していないか
- [ ] **INSERT ポリシーのあるテーブルに SELECT ポリシーがあるか（`.select()` を使う場合）**

---

## 参照

- [RLS Performance Recommendations](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations)
- [RLS Performance Tests](https://github.com/GaryAustin1/RLS-Performance)
- [Multiple Permissive Policies](https://supabase.com/docs/guides/database/database-advisors?lint=0006_multiple_permissive_policies)
- [INSERT + SELECT requires SELECT policy (GitHub Discussion #36619)](https://github.com/orgs/supabase/discussions/36619)
- [Database API 42501 Errors](https://supabase.com/docs/guides/troubleshooting/database-api-42501-errors)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)

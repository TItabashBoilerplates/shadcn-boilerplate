# Supabase Storage ベストプラクティス

Supabase Storage のバケット設計、RLSポリシー、パスプレフィックスの原則について。

> **ルール参照**: ストレージポリシーは [rules/supabase-first.md](../../rules/supabase-first.md) で定義されています。

---

## 基本原則（MANDATORY）

1. **常に Private バケットを使用**（ユーザーから明示的な指示がない限り）
2. **ファイルアクセスは `createSignedUrl` を使用**
3. **パスプレフィックスにユーザーIDを使用**

---

## バケット設計原則

| バケットタイプ | デフォルト | 用途 | RLS適用範囲 |
|--------------|----------|------|-------------|
| **Private** | ✅ 推奨 | ユーザーファイル、ドキュメント | 全操作（ダウンロード含む） |
| **Public** | ❌ 特別な場合のみ | マーケティング素材、公開ブログ画像 | アップロード/削除のみ |

### Private バケット（デフォルト）

```toml
# supabase/config.toml
[storage.buckets.documents]
public = false  # DEFAULT
file_size_limit = "50MiB"
```

- **必須**: `createSignedUrl()` でファイルにアクセス
- RLSポリシーで細かいアクセス制御が可能
- セキュリティが確保される

```typescript
// ✅ Private バケットのファイルアクセス
const { data } = await supabase.storage
  .from('documents')
  .createSignedUrl('path/to/file.pdf', 60)  // 60秒有効

// 署名付きURLを使用
const fileUrl = data?.signedUrl
```

### Public バケット（明示的な許可がある場合のみ）

使用が許可されるケース：
1. ユーザーが明示的にリクエストした場合
2. 真に公開されるべきファイル（マーケティング素材など）
3. 高性能CDNキャッシュが必要な場合

```typescript
// Public バケットのみ getPublicUrl が使用可能
const { data } = supabase.storage
  .from('public-assets')
  .getPublicUrl('logo.png')
```

---

## パスプレフィックスの原則（RESTful）

RESTの原則に則った階層的なパス構造を使用：

```
{resource}/{id}/{sub-resource}/{filename}
```

### パターン例

| パス | 説明 |
|-----|------|
| `users/{user_id}/avatar.png` | ユーザーのアバター |
| `users/{user_id}/documents/{doc_id}.pdf` | ユーザーのドキュメント |
| `projects/{project_id}/assets/logo.png` | プロジェクトのアセット |
| `organizations/{org_id}/members/{user_id}/profile.png` | 組織メンバーのプロフィール |

### 実例

```
users/550e8400-e29b-41d4-a716-446655440000/avatar.png
users/550e8400-e29b-41d4-a716-446655440000/documents/report.pdf
projects/abc123/attachments/diagram.png
```

### メリット

1. **一貫性**: API エンドポイントと同じ構造
2. **RLSポリシーが簡潔**: `storage.foldername(name)[1]` でリソースID取得可能
3. **拡張性**: サブリソースの追加が容易
4. **可読性**: パスを見ればリソースの所有者がわかる

---

## ヘルパー関数

RLSポリシー作成時に使用する Storage 専用のヘルパー関数：

| 関数 | 戻り値 | 入力例 | 出力例 |
|-----|-------|-------|-------|
| `storage.filename(name)` | ファイル名 | `'public/subfolder/avatar.png'` | `'avatar.png'` |
| `storage.foldername(name)` | フォルダパス配列 | `'public/subfolder/avatar.png'` | `['public', 'subfolder']` |
| `storage.extension(name)` | 拡張子 | `'public/subfolder/avatar.png'` | `'png'` |

---

## RLSポリシーパターン

### 基本パターン: RESTful パス

```sql
-- アップロード: users/{user_id}/* のみ許可
create policy "Users upload to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'files' and
  (storage.foldername(name))[1] = 'users' and
  (storage.foldername(name))[2] = (select auth.uid()::text)
);

-- ダウンロード: owner_id で制御
create policy "Users download own files"
on storage.objects for select
to authenticated
using ( (select auth.uid()) = owner_id::uuid );

-- 更新: 自分のファイルのみ
create policy "Users update own files"
on storage.objects for update
to authenticated
using ( owner_id = (select auth.uid()) )
with check ( owner_id = (select auth.uid()) );

-- 削除: 自分のファイルのみ
create policy "Users delete own files"
on storage.objects for delete
to authenticated
using ( owner_id = (select auth.uid()) );
```

### 拡張子制限

```sql
create policy "Only allow PNG uploads"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'images' and
  storage.extension(name) in ('png', 'jpg', 'jpeg', 'webp')
);
```

### 公開フォルダパターン

```sql
-- public/ フォルダは全員が閲覧可能
create policy "Public folder is viewable by everyone"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'files' and
  (storage.foldername(name))[1] = 'public'
);

-- private/ フォルダはオーナーのみ
create policy "Private folder for owners only"
on storage.objects for select
to authenticated
using (
  bucket_id = 'files' and
  (storage.foldername(name))[1] = 'private' and
  (storage.foldername(name))[2] = (select auth.uid()::text)
);
```

---

## owner_id について

### 自動設定

- アップロード時に JWT の `sub` クレームから自動設定
- `service_key` 使用時は設定されない（オーナーなし）
- Dashboard からのアップロードもオーナーなし

### 注意点

```sql
-- ✅ 推奨: owner_id を使用
using ( owner_id = (select auth.uid()) )

-- ❌ 非推奨: owner は deprecated
using ( owner = (select auth.uid()::text) )
```

### service_key でアップロードする場合

オーナーを明示的に設定したい場合は、メタデータを活用：

```typescript
const { data, error } = await supabase.storage
  .from('bucket')
  .upload('path/file.png', file, {
    // service_key 使用時はRLSをバイパス
  })
```

---

## config.toml でのバケット定義

ローカル開発やCI/CDでバケットを定義：

```toml
# supabase/config.toml

# 汎用ファイルバケット（デフォルト: Private）
[storage.buckets.files]
public = false
file_size_limit = "50MiB"

# 画像専用バケット（デフォルト: Private）
[storage.buckets.images]
public = false
file_size_limit = "10MiB"
allowed_mime_types = ["image/png", "image/jpeg", "image/webp"]
```

### バケットのシード

```bash
supabase seed buckets
```

---

## 実装例

### アバターアップロード（Private バケット）

```typescript
// Client Component
async function uploadAvatar(file: File, userId: string) {
  const supabase = createClient()
  // RESTful パス: users/{user_id}/avatar.{ext}
  const ext = file.name.split('.').pop()
  const path = `users/${userId}/avatar.${ext}`

  const { data, error } = await supabase.storage
    .from('images')  // Private バケット
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    })

  if (error) throw error
  return data.path
}

// 署名付きURLの取得（Private バケット必須）
async function getAvatarUrl(path: string) {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('images')
    .createSignedUrl(path, 3600)  // 1時間有効

  return data?.signedUrl
}
```

### ドキュメントアップロード

```typescript
async function uploadDocument(file: File, userId: string, docId: string) {
  const supabase = createClient()
  // RESTful パス: users/{user_id}/documents/{doc_id}.pdf
  const path = `users/${userId}/documents/${docId}.pdf`

  const { data, error } = await supabase.storage
    .from('files')
    .upload(path, file)

  if (error) throw error
  return data.path
}

// 署名付きURLでダウンロード
async function getDocumentUrl(path: string) {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('files')
    .createSignedUrl(path, 300)  // 5分有効

  return data?.signedUrl
}
```

### プロジェクトアセット

```typescript
async function uploadProjectAsset(
  file: File,
  projectId: string,
  filename: string
) {
  const supabase = createClient()
  // RESTful パス: projects/{project_id}/assets/{filename}
  const path = `projects/${projectId}/assets/${filename}`

  const { data, error } = await supabase.storage
    .from('files')
    .upload(path, file)

  if (error) throw error
  return data.path
}
```

---

## 参照

- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions)
- [Object Ownership](https://supabase.com/docs/guides/storage/security/ownership)

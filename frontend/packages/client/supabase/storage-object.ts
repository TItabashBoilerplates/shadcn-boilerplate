/**
 * Supabase Storage の **画像以外**の public オブジェクト URL を組み立てる。
 *
 * 画像は必ず変換 API 経由（`storage-image.ts` / `SupabaseImage`）で配る規約
 * （`.claude/rules/storage-images.md`）だが、バイナリ配布物（デスクトップの
 * インストーラ等）は変換対象外なので素のオブジェクト URL で配る。
 * アプリコードで `/storage/v1/object/` を文字列連結するのは
 * `storage-image.policy.test.ts` が禁止しているため、組み立てはここに集約する。
 */
export function buildPublicStorageObjectUrl(params: {
  supabaseUrl: string
  bucket: string
  path: string
}): string {
  const { supabaseUrl, bucket, path } = params
  if (!supabaseUrl) {
    // 空のまま連結すると自オリジンへの 404 リンクになり、気づくのがクリック時になる
    throw new Error('buildPublicStorageObjectUrl: supabaseUrl is empty')
  }
  const base = supabaseUrl.replace(/\/+$/, '')
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}

import { buildPublicStorageObjectUrl } from '@workspace/client-supabase/storage-object'

/**
 * デスクトップアプリの安定ダウンロード URL。
 *
 * パス規約の**正本は `scripts/desktop/release-paths.mjs`**（CI のアップロード側）。
 * Next.js のビルドにリポジトリ外（`frontend/` の外）のモジュールを持ち込まないため
 * ここに定数を重複して持ち、`downloadLinks.test.ts` が正本との一致を固定している。
 * **`tauri.conf.json` の `productName` を変えたらここも変える**（テストが落ちて教えてくれる）。
 */

// macOS は既定で Apple Silicon のみ（release-paths.mjs のコメント参照）
export const DESKTOP_DOWNLOAD_PLATFORMS = ['darwin-aarch64', 'windows-x86_64'] as const

export type DesktopDownloadPlatform = (typeof DESKTOP_DOWNLOAD_PLATFORMS)[number]

const LATEST_OBJECT_PATHS: Record<DesktopDownloadPlatform, string> = {
  'darwin-aarch64': 'desktop/latest/App-apple-silicon.dmg',
  'windows-x86_64': 'desktop/latest/App-setup.exe',
}

export function desktopDownloadUrl(
  platform: DesktopDownloadPlatform,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): string {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set; cannot build desktop download URLs')
  }
  const path = LATEST_OBJECT_PATHS[platform]
  const base = buildPublicStorageObjectUrl({ supabaseUrl, bucket: 'releases', path })
  // `?download=` で Content-Disposition: attachment + ファイル名を強制する
  // （Supabase Storage の公式クエリパラメータ）。ブラウザがナビゲーションせず必ず保存になる
  return `${base}?download=${encodeURIComponent(path.split('/').at(-1) ?? '')}`
}

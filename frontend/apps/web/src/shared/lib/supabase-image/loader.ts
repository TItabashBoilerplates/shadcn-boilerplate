import {
  buildStorageImageUrl,
  isStorageObjectUrl,
  snapImageWidth,
  toStorageImageUrl,
} from '@workspace/client-supabase/storage-image'
import type { ImageLoaderProps } from 'next/image'

/**
 * next/image 用の Supabase Storage ローダー
 *
 * `next/image` が生成する srcset の各幅を、Supabase Storage の変換エンドポイント
 * （`/storage/v1/render/image/public/...`）の URL に変換する。これにより
 *
 *  - Next.js の Image Optimization API（`/_next/image`）を経由しない
 *    → Vercel の画像最適化枠を消費せず、Supabase から直接 CDN 配信される
 *  - Storage 側でリサイズ + WebP 変換が行われる
 *
 * ## なぜ `next.config.ts` の `images.loaderFile` にしないか
 *
 * `loaderFile` は **アプリ内のすべての `next/image` に適用される**グローバル設定で、
 * `/next.svg` のようなローカル静的画像や Supabase 以外のリモート画像まで
 * Storage の URL に書き換えてしまい、全部 404 になる。そのため
 * `loader` prop で **Supabase の画像だけ**に適用する（`SupabaseImage`）。
 *
 * @param src `bucket/path`（推奨）または保存済みの public object URL
 * @throws 環境変数未設定・bucket を含まない src
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations#nextjs-loader
 */
export function supabaseImageLoader({ src, width, quality }: ImageLoaderProps): string {
  const transform = {
    width: snapImageWidth(width),
    ...(quality === undefined ? {} : { quality }),
  }

  // DB に完全な public URL を保存している既存データにも対応する
  if (isStorageObjectUrl(src)) {
    return toStorageImageUrl(src, transform)
  }

  const separatorIndex = src.replace(/^\/+/, '').indexOf('/')
  const normalizedSrc = src.replace(/^\/+/, '')

  if (separatorIndex <= 0) {
    throw new Error(
      `supabaseImageLoader: src must be "bucket/path" or a Supabase Storage URL, received "${src}"`
    )
  }

  return buildStorageImageUrl({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    bucket: normalizedSrc.slice(0, separatorIndex),
    path: normalizedSrc.slice(separatorIndex + 1),
    transform,
  })
}

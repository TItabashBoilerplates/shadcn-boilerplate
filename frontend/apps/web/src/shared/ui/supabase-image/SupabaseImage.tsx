'use client'

import { assertResponsiveSizes } from '@workspace/client-supabase/storage-image'
import Image, { type ImageLoaderProps, type ImageProps } from 'next/image'
import { supabaseImageLoader } from '@/shared/lib/supabase-image'

/**
 * 署名済み URL 用の素通しローダー
 *
 * 署名 URL は **署名時に transform が固定される**ため、後から幅を差し替えられない。
 * ここでローダーを差し替えておかないと next/image の既定ローダーが動き、
 * `/_next/image` 経由（= remotePatterns 設定が必要 + Vercel の最適化枠を消費）になる。
 */
const signedUrlLoader = ({ src }: ImageLoaderProps): string => src

type SupabaseImageBaseProps = Omit<ImageProps, 'src' | 'loader' | 'unoptimized' | 'fill' | 'sizes'>

/**
 * `fill` を使う画像は `sizes` が無いとブラウザが 100vw と解釈し、小さな枠でも srcset の
 * 最大幅（2500px）を落としてくる。**transform は通っているのにサイズが最適でない**という
 * 一番気づきにくい形になるので、型で塞ぐ（`.claude/rules/storage-images.md`）。
 */
type SupabaseImageSizingProps =
  | {
      /** 親要素いっぱいに広げる。**このとき `sizes` は必須** */
      fill: true
      /** 表示幅の宣言（例: `(max-width: 768px) 100vw, 384px`） */
      sizes: string
    }
  | {
      fill?: false | undefined
      /** CSS で伸縮させるなら固定幅でも指定する（未指定は 1x/2x の srcset） */
      sizes?: string
    }

export type SupabaseImageProps = SupabaseImageBaseProps &
  SupabaseImageSizingProps &
  (
    | {
        /** public バケット名 */
        bucket: string
        /** バケット内のパス（例: `users/1/avatar.png`） */
        path: string
        signedUrl?: never
      }
    | {
        /**
         * private バケット向けに **transform 付きで発行済み**の署名 URL
         *
         * `createSignedStorageImageUrl()` で発行すること。
         */
        signedUrl: string
        bucket?: never
        path?: never
      }
  )

/**
 * Supabase Storage の画像を **必ず変換 API 経由**で表示するコンポーネント
 *
 * Storage の画像を表示するときは `next/image` を直接使わず、必ずこれを使う
 * （`.claude/rules/storage-images.md`）。
 *
 * - **public バケット**: `bucket` / `path` を渡す。`next/image` が生成する srcset の
 *   各幅がそのまま Storage の変換 URL になり、端末に合ったサイズ + WebP が配信される。
 * - **private バケット**（本リポジトリの既定）: サーバー側で
 *   `createSignedStorageImageUrl()` を呼び、得た `signedUrl` を渡す。署名 URL は
 *   transform が固定されるので srcset は生成されない（`unoptimized`）。
 *
 * @example public バケット
 * ```tsx
 * <SupabaseImage bucket="public-assets" path="hero/cover.jpg" width={1200} height={630} alt="" />
 * ```
 *
 * `fill` で親要素いっぱいに広げる場合は **`sizes` が必須**（無いとブラウザが 100vw と解釈し、
 * 小さな枠でも最大幅の画像を落としてくる）。
 *
 * @example private バケット（Server Component で署名して渡す）
 * ```tsx
 * const signedUrl = await createSignedStorageImageUrl(supabase, {
 *   bucket: 'avatars',
 *   path: `users/${userId}/avatar.png`,
 *   expiresIn: 60 * 60,
 *   transform: { width: 96, height: 96 },
 * })
 * return <SupabaseImage signedUrl={signedUrl} width={96} height={96} alt="" />
 * ```
 */
export function SupabaseImage({ bucket, path, signedUrl, alt, ...imageProps }: SupabaseImageProps) {
  // 型で塞いでいるが、spread や JS からの呼び出しは型を素通りするので実行時にも見る
  assertResponsiveSizes(imageProps, 'SupabaseImage')

  // alt は spread に混ぜず明示的に渡す（jsx-a11y/alt-text は spread の中身を追えない）
  if (signedUrl !== undefined) {
    return <Image {...imageProps} alt={alt} src={signedUrl} loader={signedUrlLoader} unoptimized />
  }

  return <Image {...imageProps} alt={alt} src={`${bucket}/${path}`} loader={supabaseImageLoader} />
}

import {
  buildStorageImageUrl,
  type StorageImageResize,
  snapImageWidth,
} from '@workspace/client-supabase/storage-image'
import { Image, type ImageProps } from 'expo-image'
import { PixelRatio } from 'react-native'

type SupabaseImageBaseProps = Omit<ImageProps, 'source'> & {
  /** レイアウト幅（dp）。DPR を掛けた実ピクセル幅で変換をリクエストする */
  width: number
  /** レイアウト高さ（dp）。省略するとアスペクト比を保って幅にあわせる */
  height?: number
  /** リサイズモード（既定は Supabase 側の `cover`） */
  resize?: StorageImageResize
  /** 画質 20-100（既定は Supabase 側の 80） */
  quality?: number
}

export type SupabaseImageProps = SupabaseImageBaseProps &
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
 * 表示サイズ（dp）と端末の DPR から、要求する実ピクセルサイズを決める
 *
 * 幅は段に丸める（{@link snapImageWidth}）ので、DPR 2 / 3 の端末が混ざっても
 * URL の種類は増えず CDN キャッシュが効く。
 */
function resolveImageUri(props: SupabaseImageProps): string {
  if (props.signedUrl !== undefined) {
    // 署名 URL は署名時に transform が固定されているのでそのまま使う
    return props.signedUrl
  }

  const { width, height, resize, quality } = props

  return buildStorageImageUrl({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    bucket: props.bucket,
    path: props.path,
    transform: {
      width: snapImageWidth(PixelRatio.getPixelSizeForLayoutSize(width)),
      ...(height === undefined ? {} : { height: PixelRatio.getPixelSizeForLayoutSize(height) }),
      ...(resize === undefined ? {} : { resize }),
      ...(quality === undefined ? {} : { quality }),
    },
  })
}

/**
 * Supabase Storage の画像を **必ず変換 API 経由**で表示するコンポーネント（Mobile）
 *
 * Storage の画像を表示するときは `expo-image` を直接使わず、必ずこれを使う
 * （`.claude/rules/storage-images.md`）。
 *
 * モバイルには `srcset` が無いので、**表示サイズ（dp）× 端末の DPR** を実ピクセル幅として
 * 1 枚だけ要求する。
 *
 * @example public バケット
 * ```tsx
 * <SupabaseImage bucket="public-assets" path="hero/cover.jpg" width={320} height={180} />
 * ```
 *
 * @example private バケット（署名 URL を発行して渡す）
 * ```tsx
 * const signedUrl = await createSignedStorageImageUrl(supabase, {
 *   bucket: 'avatars',
 *   path: `users/${userId}/avatar.png`,
 *   expiresIn: 60 * 60,
 *   transform: { width: snapImageWidth(64 * PixelRatio.get()) },
 * })
 * return <SupabaseImage signedUrl={signedUrl} width={64} height={64} />
 * ```
 */
export function SupabaseImage(props: SupabaseImageProps) {
  const {
    bucket: _bucket,
    path: _path,
    signedUrl: _signedUrl,
    width,
    height,
    resize: _resize,
    quality: _quality,
    style,
    ...imageProps
  } = props

  return (
    <Image
      {...imageProps}
      source={{ uri: resolveImageUri(props) }}
      style={[{ width, height }, style]}
    />
  )
}

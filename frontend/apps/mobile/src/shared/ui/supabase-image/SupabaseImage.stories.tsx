import type { Meta, StoryObj } from '@storybook/react'
import { SupabaseImage } from './SupabaseImage'

/**
 * Supabase Storage の画像を **必ず変換 API 経由**で表示するコンポーネント（Mobile）。
 *
 * ## public バケット
 *
 * ```tsx
 * <SupabaseImage bucket="public-assets" path="hero/cover.jpg" width={320} height={180} />
 * ```
 *
 * 表示サイズ（dp）に端末の DPR を掛けた実ピクセル幅で
 * `/storage/v1/render/image/public/<bucket>/<path>?width=...` を要求する。
 * **Storybook からは Supabase に接続できない**ため、このパターンのストーリーは置いていない
 * （URL 組み立ての検証は `packages/client/supabase/storage-image.test.ts` が担う）。
 *
 * ## private バケット（本リポジトリの既定）
 *
 * `createSignedStorageImageUrl()` で **transform 付きの署名 URL** を発行して `signedUrl` に渡す。
 *
 * 以下のストーリーは署名 URL の代わりにローカルの静的アセットを渡し、
 * レイアウト（固定サイズ / 円形 / contain）を確認するもの。
 */
const meta = {
  component: SupabaseImage,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof SupabaseImage>

export default meta
type Story = StoryObj<typeof meta>

/** 固定サイズ */
export const Default: Story = {
  args: {
    signedUrl: '/next.svg',
    width: 180,
    height: 38,
    contentFit: 'contain',
    alt: 'Next.js のロゴ',
  },
}

/** アバター用途（正方形 + 円形クリップ） */
export const Avatar: Story = {
  args: {
    signedUrl: '/globe.svg',
    width: 96,
    height: 96,
    contentFit: 'contain',
    alt: 'ユーザーのアバター',
    style: { borderRadius: 48, backgroundColor: '#f4f4f5', padding: 16 },
  },
}

/** 高さを指定しない場合（幅にあわせて表示される） */
export const WidthOnly: Story = {
  args: {
    signedUrl: '/window.svg',
    width: 200,
    contentFit: 'contain',
    alt: 'ウィンドウのイラスト',
    style: { aspectRatio: 1 },
  },
}

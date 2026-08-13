import type { Meta, StoryObj } from '@storybook/react'
import { SupabaseImage } from './SupabaseImage'

/**
 * Supabase Storage の画像を **必ず変換 API 経由**で表示するコンポーネント。
 *
 * ## public バケット
 *
 * ```tsx
 * <SupabaseImage bucket="public-assets" path="hero/cover.jpg" width={1200} height={630} alt="" />
 * ```
 *
 * `next/image` の srcset がそのまま
 * `/storage/v1/render/image/public/<bucket>/<path>?width=...` になる。
 * **Storybook では Supabase に接続できないため、このパターンのストーリーは置いていない**
 * （URL は組み立てられるが画像が取得できず、壊れた画像がカタログに並ぶだけになる）。
 * URL 組み立ての正しさは `shared/lib/supabase-image/loader.test.ts` が担保している。
 *
 * ## private バケット（本リポジトリの既定）
 *
 * サーバー側で `createSignedStorageImageUrl()` を呼び、得た署名 URL を `signedUrl` に渡す。
 * 署名 URL は **transform が署名時に固定**されるので srcset は生成されない。
 *
 * 以下のストーリーは、署名 URL の代わりにローカルの静的アセットを渡して
 * レイアウト（固定サイズ / 円形 / fill）を確認するもの。
 */
const meta = {
  component: SupabaseImage,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof SupabaseImage>

export default meta
type Story = StoryObj<typeof meta>

/** 固定サイズ（width / height 指定） */
export const Default: Story = {
  args: {
    signedUrl: '/next.svg',
    width: 180,
    height: 38,
    alt: 'Next.js のロゴ',
  },
}

/** アバター用途（正方形 + 円形クリップ） */
export const Avatar: Story = {
  args: {
    signedUrl: '/globe.svg',
    width: 96,
    height: 96,
    alt: 'ユーザーのアバター',
    className: 'rounded-full bg-muted p-4',
  },
}

/** 親要素いっぱいに広げる（`fill` + `sizes`） */
export const Fill: Story = {
  args: {
    signedUrl: '/window.svg',
    fill: true,
    alt: 'ウィンドウのイラスト',
    sizes: '(max-width: 768px) 100vw, 384px',
    className: 'object-contain p-6',
  },
  render: (args) => (
    <div className="relative h-48 w-96 overflow-hidden rounded-lg border bg-muted">
      <SupabaseImage {...args} />
    </div>
  ),
}

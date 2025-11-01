import { notFound } from 'next/navigation'

/**
 * ルートページ
 * middleware がロケールプレフィックスを処理するため、
 * このページは表示されない（404 を返す）
 */
export default function RootPage() {
  notFound()
}

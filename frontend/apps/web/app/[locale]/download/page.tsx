import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import {
  DownloadPage,
  desktopDownloadUrl,
  LatestRelease,
  LatestReleaseSkeleton,
} from '@/views/download'
import { Header } from '@/widgets/header'

interface PageProps {
  params: Promise<{ locale: string }>
}

/**
 * デスクトップアプリのダウンロードページ（公開ページ）
 *
 * リンク先は Supabase Storage の public バケットの安定 URL（`desktop/latest/…`）。
 * URL はサーバー側で組み立てて props で渡す（Storybook では dummy URL を渡せる）。
 * 配布中の版は同じバケットの `latest.json`（アプリの自動更新が読むもの）から引く。
 * Storage への取得なので `<Suspense>` で分離し、ページの殻とダウンロードボタンは
 * 取得を待たずに描く（`.claude/rules/page-navigation.md`）。
 *
 * @example URL: /download
 */
export default async function Page({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="min-h-screen pt-16">
      <Header />
      <DownloadPage
        macAppleSiliconUrl={desktopDownloadUrl('darwin-aarch64')}
        winUrl={desktopDownloadUrl('windows-x86_64')}
        releaseSlot={
          <Suspense fallback={<LatestReleaseSkeleton />}>
            <LatestRelease />
          </Suspense>
        }
      />
    </div>
  )
}

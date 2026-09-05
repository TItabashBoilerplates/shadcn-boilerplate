import { Button } from '@workspace/ui'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

/**
 * デスクトップアプリのダウンロードページ（公開・Server Component）
 *
 * リンク先は Supabase Storage の public バケット `releases` の**安定 URL**
 * （`desktop/latest/…`。リリースのたびに CI が upsert で差し替えるので、
 * このページはデプロイし直さなくても常に最新版を指す）。
 * URL の組み立ては `../model/downloadLinks` — パス規約の正本は
 * `scripts/desktop/release-paths.mjs` で、テストが一致を固定している。
 *
 * 配布中の版は `releaseSlot` で受ける（ページ側が `<Suspense>` で包んだ
 * `LatestRelease` を渡す。View は自分でデータを取らない —
 * `.claude/rules/page-navigation.md`）。
 *
 * URL と版を props で受けるのは Storybook で描画するため（環境変数と通信に依存させない）。
 */
export function DownloadPage({
  macAppleSiliconUrl,
  winUrl,
  releaseSlot,
}: {
  macAppleSiliconUrl: string
  winUrl: string
  releaseSlot: ReactNode
}) {
  const t = useTranslations('Download')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16 sm:py-24">
      <section className="flex flex-col items-start gap-4 rounded-3xl border border-border p-8 sm:p-12">
        <p className="font-medium text-primary text-xs uppercase tracking-[0.18em]">
          {t('eyebrow')}
        </p>
        <h1 className="max-w-2xl text-balance font-black text-3xl leading-[1.25] sm:text-4xl">
          {t('title')}
        </h1>
        <p className="max-w-xl text-pretty text-base text-muted-foreground leading-relaxed">
          {t('description')}
        </p>
        {releaseSlot}
      </section>

      {/*
       * 2 枚のカードは subgrid で行を共有する（見出し / 要件 / ボタン / 注記の 4 行）。
       * カードごとに flex + mt-auto で組むと、注記のある Windows 側だけボタンが
       * 上に寄って段違いになる。行を親グリッドで揃えれば、文言の折り返しが
       * ロケールで変わってもボタンは同じ高さに並ぶ。
       */}
      <section className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-6 sm:grid sm:row-span-4 sm:grid-rows-subgrid">
          <h2 className="font-bold text-lg">{t('macos.name')}</h2>
          <p className="text-pretty text-muted-foreground text-sm">{t('macos.requirements')}</p>
          <Button asChild size="lg" className="font-bold">
            {/* 外部オリジン（Supabase Storage）への直リンクなので i18n の Link は使わない */}
            <a href={macAppleSiliconUrl}>
              <Download className="mr-2 size-4" aria-hidden="true" />
              {t('macos.button')}
            </a>
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-6 sm:grid sm:row-span-4 sm:grid-rows-subgrid">
          <h2 className="font-bold text-lg">{t('windows.name')}</h2>
          <p className="text-pretty text-muted-foreground text-sm">{t('windows.requirements')}</p>
          <Button asChild size="lg" className="font-bold">
            <a href={winUrl}>
              <Download className="mr-2 size-4" aria-hidden="true" />
              {t('windows.button')}
            </a>
          </Button>
          <p className="text-pretty text-muted-foreground text-xs leading-relaxed">
            {t('windows.smartscreenNote')}
          </p>
        </div>
      </section>
    </div>
  )
}

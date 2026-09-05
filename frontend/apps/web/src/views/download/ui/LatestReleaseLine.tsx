'use client'

import { useFormattedDate } from '@workspace/ui/hooks/use-formatted-date'
import { useLocale, useTranslations } from 'next-intl'
import type { DesktopRelease } from '../model/latestRelease'

/**
 * 配布中の版と公開日。
 *
 * 日時は現地時刻へ直すので client component（`.claude/rules/datetime.md`）。
 * マウント前は版だけを描き、日付が入っても同じ 1 行に足すだけなので行の高さは跳ねない。
 */
export function LatestReleaseLine({ release }: { release: DesktopRelease }) {
  const t = useTranslations('Download')
  const locale = useLocale()
  const date = useFormattedDate(release.publishedAt, locale)

  return (
    <p className="text-muted-foreground text-sm tabular-nums">
      {t('latestVersion', { version: release.version })}
      {date ? ` · ${t('publishedAt', { date })}` : null}
    </p>
  )
}

import { Skeleton } from '@workspace/ui'
import { fetchLatestDesktopRelease } from '../model/latestRelease'
import { LatestReleaseLine } from './LatestReleaseLine'

/**
 * 配布中の版の行（async Server Component）。
 *
 * Storage への取得なので、ページはこれを `<Suspense>` で包んで先に殻を描く
 * （`.claude/rules/page-navigation.md` ルール 2。Storage が詰まっても
 * ダウンロードボタンまで道連れにしない）。読めなければ何も描かない。
 */
export async function LatestRelease() {
  const release = await fetchLatestDesktopRelease()
  return release ? <LatestReleaseLine release={release} /> : null
}

/** 版の行と同じ 1 行ぶんの骨格（レイアウトシフトを抑える） */
export function LatestReleaseSkeleton() {
  return <Skeleton className="h-5 w-72" />
}

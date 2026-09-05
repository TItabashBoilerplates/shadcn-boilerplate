import { buildPublicStorageObjectUrl } from '@workspace/client-supabase/storage-object'

/**
 * 配布中のデスクトップアプリの版。
 *
 * 出どころはアプリの自動更新が読むのと同じ `desktop/latest/latest.json`
 * （tauri-plugin-updater の静的マニフェスト。リリースのたびに CI が差し替える）。
 * ページ側で版を持たないので、リリースごとにデプロイし直さなくても常に配布中の版を指す。
 * パス規約の正本は `scripts/desktop/release-paths.mjs`（`latestRelease.test.ts` が一致を固定）。
 */
export const LATEST_MANIFEST_OBJECT_PATH = 'desktop/latest/latest.json'

/** latest/ の cache-control と同じ（publish-manifest.mjs）。これより短く読み直しても新しくならない */
const MANIFEST_REVALIDATE_SECONDS = 60

/**
 * 取得の上限。Storage が詰まったときに版の行を待ち続けない（ページは Suspense で
 * 先に描かれるが、待ち続けるとストリームが閉じず、この行だけ骨格のまま残る）
 */
const MANIFEST_TIMEOUT_MS = 5_000

export interface DesktopRelease {
  version: string
  /** ISO 8601（UTC）。表示側で現地時刻へ直す（`.claude/rules/datetime.md`） */
  publishedAt: string
}

export function desktopManifestUrl(
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): string {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set; cannot build the desktop manifest URL')
  }
  return buildPublicStorageObjectUrl({
    supabaseUrl,
    bucket: 'releases',
    path: LATEST_MANIFEST_OBJECT_PATH,
  })
}

export function parseDesktopManifest(body: unknown): DesktopRelease {
  if (typeof body !== 'object' || body === null) {
    throw new Error('latest.json is not an object')
  }
  const { version, pub_date: publishedAt } = body as { version?: unknown; pub_date?: unknown }
  if (typeof version !== 'string' || version === '') {
    throw new Error('latest.json has no version')
  }
  if (typeof publishedAt !== 'string' || publishedAt === '') {
    throw new Error('latest.json has no pub_date')
  }
  return { version, publishedAt }
}

/**
 * 配布中の版を読む。**読めなければ null**（呼び出し側は版の行を出さない）。
 *
 * これは意図したフォールバック（`.claude/rules/error-handling.md` の許容条件）:
 * ダウンロードリンクは安定 URL なので manifest が読めなくても配布は成立し、
 * 版の表示は付随的。ただし黙らず必ずログに残す（本番で版だけ消えたら
 * Storage 側の障害のサイン）。
 */
export async function fetchLatestDesktopRelease(
  options: { supabaseUrl?: string; fetchImpl?: typeof fetch } = {}
): Promise<DesktopRelease | null> {
  const fetchImpl = options.fetchImpl ?? fetch
  const url = desktopManifestUrl(options.supabaseUrl)
  try {
    const res = await fetchImpl(url, {
      next: { revalidate: MANIFEST_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return parseDesktopManifest(await res.json())
  } catch (error: unknown) {
    console.error('Failed to load the desktop release manifest:', { url, error })
    return null
  }
}

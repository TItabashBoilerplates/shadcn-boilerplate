import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  LATEST_MANIFEST_PATH,
  publicReleaseUrl,
  // アップロード側（CI）の正本。latest.json の置き場がズレると「配布はできるのに
  // ページの版だけ出ない」になり、ビルドも lint も通ってしまう。ここで一致を固定する
} from '../../../../../../../scripts/desktop/release-paths.mjs'
import {
  desktopManifestUrl,
  fetchLatestDesktopRelease,
  LATEST_MANIFEST_OBJECT_PATH,
  parseDesktopManifest,
} from './latestRelease'

const SUPABASE_URL = 'https://example.supabase.co'

const MANIFEST = {
  version: '0.3.0',
  pub_date: '2026-09-03T22:37:16.992Z',
  platforms: {
    'darwin-aarch64': { url: 'https://example/mac', signature: 'sig' },
    'windows-x86_64': { url: 'https://example/win', signature: 'sig' },
  },
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('desktopManifestUrl', () => {
  it('アプリの updater と同じ latest.json（release-paths.mjs の正本）を読む', () => {
    expect(LATEST_MANIFEST_OBJECT_PATH).toBe(LATEST_MANIFEST_PATH)
    expect(desktopManifestUrl(SUPABASE_URL)).toBe(
      publicReleaseUrl(SUPABASE_URL, LATEST_MANIFEST_PATH)
    )
  })

  it('Supabase URL が空なら明示的に落ちる', () => {
    expect(() => desktopManifestUrl('')).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})

describe('parseDesktopManifest', () => {
  it('version と pub_date を取り出す', () => {
    expect(parseDesktopManifest(MANIFEST)).toEqual({
      version: '0.3.0',
      publishedAt: '2026-09-03T22:37:16.992Z',
    })
  })

  it.each([
    ['version が無い', { pub_date: '2026-09-03T22:37:16.992Z' }],
    ['pub_date が無い', { version: '0.3.0' }],
    ['オブジェクトでない', 'nope'],
    ['null', null],
  ])('%s → 落ちる（欠けた値で「最新版 v」と描かない）', (_label, body) => {
    expect(() => parseDesktopManifest(body)).toThrow()
  })
})

describe('fetchLatestDesktopRelease', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('latest.json を読んで版と公開日時を返す', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(MANIFEST))
    await expect(
      fetchLatestDesktopRelease({ supabaseUrl: SUPABASE_URL, fetchImpl })
    ).resolves.toEqual({ version: '0.3.0', publishedAt: '2026-09-03T22:37:16.992Z' })
    expect(fetchImpl).toHaveBeenCalledWith(
      publicReleaseUrl(SUPABASE_URL, LATEST_MANIFEST_PATH),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('読めなかったら null（ダウンロードリンクは安定 URL なので版だけ出さない）。ただし必ずログに残す', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'not found' }, 400))
    await expect(
      fetchLatestDesktopRelease({ supabaseUrl: SUPABASE_URL, fetchImpl })
    ).resolves.toBeNull()
    expect(error).toHaveBeenCalled()
  })

  it('通信自体が失敗しても null + ログ（ページ全体を落とさない）', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down')
    })
    await expect(
      fetchLatestDesktopRelease({ supabaseUrl: SUPABASE_URL, fetchImpl })
    ).resolves.toBeNull()
    expect(error).toHaveBeenCalled()
  })

  it('形が違う JSON も null + ログ', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchImpl = vi.fn(async () => jsonResponse({ version: 1 }))
    await expect(
      fetchLatestDesktopRelease({ supabaseUrl: SUPABASE_URL, fetchImpl })
    ).resolves.toBeNull()
    expect(error).toHaveBeenCalled()
  })
})

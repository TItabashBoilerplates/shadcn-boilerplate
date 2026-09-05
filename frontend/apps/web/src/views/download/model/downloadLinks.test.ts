import { describe, expect, it } from 'vitest'
import {
  LATEST_ARTIFACT_NAMES,
  latestObjectPath,
  publicReleaseUrl,
  // アップロード側（CI）のパス規約の正本。Web 側の定数がこれとズレると
  // 「アップロードは成功するのにダウンロードリンクだけ 404」になり、
  // ビルドも lint も通ってしまう。ここで一致を固定する。
} from '../../../../../../../scripts/desktop/release-paths.mjs'
import { DESKTOP_DOWNLOAD_PLATFORMS, desktopDownloadUrl } from './downloadLinks'

const SUPABASE_URL = 'https://example.supabase.co'

describe('desktopDownloadUrl', () => {
  it.each([
    ...DESKTOP_DOWNLOAD_PLATFORMS,
  ])('%s: release-paths.mjs（アップロード側の正本）と同じ URL + ?download を組み立てる', (platform) => {
    const objectPath = latestObjectPath(platform)
    const fileName = objectPath.split('/').at(-1) ?? ''
    expect(desktopDownloadUrl(platform, SUPABASE_URL)).toBe(
      `${publicReleaseUrl(SUPABASE_URL, objectPath)}?download=${encodeURIComponent(fileName)}`
    )
  })

  it('プラットフォーム一覧が正本のキー集合と一致する（片方だけ増やす事故を防ぐ）', () => {
    expect([...DESKTOP_DOWNLOAD_PLATFORMS].sort()).toEqual(
      Object.keys(LATEST_ARTIFACT_NAMES).sort()
    )
  })

  it('Supabase URL が空なら明示的に落ちる（空 URL のリンクを無言で出さない）', () => {
    expect(() => desktopDownloadUrl('darwin-aarch64', '')).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildUpdaterManifest,
  UPDATER_PLATFORMS,
  // 実装: `scripts/desktop/updater-manifest.mjs`
  // CI の publish-manifest.mjs が両 OS の断片を束ねて latest.json を作る。形式は
  // tauri-plugin-updater の静的マニフェスト（version / pub_date / platforms.<key>.{url,signature}）。
  // 片方の OS が欠けたまま公開すると、その OS のユーザーだけ更新が止まる（エラーは出ない）。
} from '../../../../../../scripts/desktop/updater-manifest.mjs'

const mac = {
  platform: 'darwin-aarch64',
  url: 'https://example.supabase.co/storage/v1/object/public/releases/desktop/v0.2.0/App.app.tar.gz',
  signature: 'dW50cnVzdGVkIGNvbW1lbnQ6IG1hYw==',
}
const win = {
  platform: 'windows-x86_64',
  url: 'https://example.supabase.co/storage/v1/object/public/releases/desktop/v0.2.0/App_0.2.0_x64-setup.exe',
  signature: 'dW50cnVzdGVkIGNvbW1lbnQ6IHdpbg==',
}
const publishedAt = new Date('2026-09-03T05:00:00.000Z')

describe('buildUpdaterManifest', () => {
  it('配布プラットフォームの集合はインストーラの固定名と同じ（片方だけ足す事故を防ぐ）', () => {
    expect([...UPDATER_PLATFORMS].sort()).toEqual(['darwin-aarch64', 'windows-x86_64'])
  })

  it('両 OS の断片から tauri-plugin-updater の静的マニフェストを組む', () => {
    expect(buildUpdaterManifest({ version: '0.2.0', fragments: [win, mac], publishedAt })).toEqual({
      version: '0.2.0',
      pub_date: '2026-09-03T05:00:00.000Z',
      platforms: {
        'darwin-aarch64': { url: mac.url, signature: mac.signature },
        'windows-x86_64': { url: win.url, signature: win.signature },
      },
    })
  })

  it('notes は渡したときだけ載せる', () => {
    expect(
      buildUpdaterManifest({ version: '0.2.0', fragments: [mac, win], publishedAt, notes: 'x' })
        .notes
    ).toBe('x')
  })

  it('OS が欠けていれば落とす（片方だけ更新が止まる公開をしない）', () => {
    expect(() => buildUpdaterManifest({ version: '0.2.0', fragments: [mac], publishedAt })).toThrow(
      /windows-x86_64/
    )
  })

  it('同じ OS が 2 回来たら落とす（どちらの署名か決められない）', () => {
    expect(() =>
      buildUpdaterManifest({ version: '0.2.0', fragments: [mac, mac, win], publishedAt })
    ).toThrow(/darwin-aarch64/)
  })

  it('知らないプラットフォーム・空の署名・http の URL は落とす', () => {
    expect(() =>
      buildUpdaterManifest({
        version: '0.2.0',
        fragments: [mac, win, { ...win, platform: 'linux-x86_64' }],
        publishedAt,
      })
    ).toThrow(/linux-x86_64/)
    expect(() =>
      buildUpdaterManifest({
        version: '0.2.0',
        fragments: [mac, { ...win, signature: '' }],
        publishedAt,
      })
    ).toThrow(/signature/)
    expect(() =>
      buildUpdaterManifest({
        version: '0.2.0',
        fragments: [mac, { ...win, url: win.url.replace('https:', 'http:') }],
        publishedAt,
      })
    ).toThrow(/https/)
  })
})

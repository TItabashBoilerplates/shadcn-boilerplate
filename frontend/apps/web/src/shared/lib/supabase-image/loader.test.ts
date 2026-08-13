import { afterEach, describe, expect, it, vi } from 'vitest'
import { supabaseImageLoader } from './loader'

const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co'

function stubSupabaseUrl(url: string = SUPABASE_URL) {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('supabaseImageLoader', () => {
  it('`bucket/path` 形式の src を render エンドポイントの URL に変換する', () => {
    stubSupabaseUrl()

    expect(supabaseImageLoader({ src: 'avatars/users/1/a.png', width: 640 })).toBe(
      `${SUPABASE_URL}/storage/v1/render/image/public/avatars/users/1/a.png?width=640`
    )
  })

  it('Next.js が渡す width を幅の段に丸める（CDN キャッシュを効かせる）', () => {
    stubSupabaseUrl()

    // 3840 は Supabase の上限 2500 を超えるので 2500 に丸まる
    const url = new URL(supabaseImageLoader({ src: 'avatars/a.png', width: 3840 }))
    expect(url.searchParams.get('width')).toBe('2500')
  })

  it('quality を指定したときだけ quality を載せる（未指定は Supabase 既定の 80）', () => {
    stubSupabaseUrl()

    const withQuality = new URL(
      supabaseImageLoader({ src: 'avatars/a.png', width: 640, quality: 50 })
    )
    expect(withQuality.searchParams.get('quality')).toBe('50')

    const withoutQuality = new URL(supabaseImageLoader({ src: 'avatars/a.png', width: 640 }))
    expect(withoutQuality.searchParams.get('quality')).toBeNull()
  })

  it('保存済みの public object URL をそのまま渡しても render URL に書き換える', () => {
    stubSupabaseUrl()

    expect(
      supabaseImageLoader({
        src: `${SUPABASE_URL}/storage/v1/object/public/avatars/a.png`,
        width: 640,
      })
    ).toBe(`${SUPABASE_URL}/storage/v1/render/image/public/avatars/a.png?width=640`)
  })

  it('環境変数が無ければ throw する（無言で壊れた URL を出さない）', () => {
    stubSupabaseUrl('')

    expect(() => supabaseImageLoader({ src: 'avatars/a.png', width: 640 })).toThrow(/supabase/i)
  })

  it('bucket を含まない src は実装ミスなので throw する', () => {
    stubSupabaseUrl()

    expect(() => supabaseImageLoader({ src: 'a.png', width: 640 })).toThrow(/bucket/i)
  })
})

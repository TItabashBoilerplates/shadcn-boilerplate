/**
 * 方針の取得。**ここは「失敗したら null を返す」ことがテスト対象**である。
 *
 * `.claude/rules/error-handling.md` はフォールバックを原則禁止しているが、
 * 同ルールが挙げる許容条件（意図的な設計判断 / ログ出力済み / 既定値が安全 /
 * ユーザーの操作結果に影響しない）をすべて満たす数少ないケースがここ。
 *
 * 逆に**例外を投げると起動時のクラッシュになり、方針が読めないという理由だけで
 * アプリ全体が使えなくなる**。それは強制アップデートより悪い。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchReleasePolicy } from './fetchReleasePolicy'

const row = {
  platform: 'ios',
  minimum_version: '1.0.0',
  latest_version: '1.2.0',
  store_url: 'https://apps.apple.com/app/id123456789',
  release_notes: { en: 'Bug fixes', ja: '不具合修正' },
}

/** 問い合わせのフェイク（本物のクライアントは要らない） */
function fakeQuery(result: { data: unknown; error: unknown }, spy?: (p: string) => void) {
  return (platform: string) => {
    spy?.(platform)
    return Promise.resolve(result)
  }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchReleasePolicy', () => {
  it('snake_case の行を ReleasePolicy に写す', async () => {
    const policy = await fetchReleasePolicy(fakeQuery({ data: row, error: null }), 'ios')

    expect(policy).toEqual({
      platform: 'ios',
      minimumVersion: '1.0.0',
      latestVersion: '1.2.0',
      storeUrl: 'https://apps.apple.com/app/id123456789',
      releaseNotes: { en: 'Bug fixes', ja: '不具合修正' },
    })
  })

  it('問い合わせにはプラットフォームが渡る（iOS / Android で行が違う）', async () => {
    const seen: string[] = []
    await fetchReleasePolicy(
      fakeQuery({ data: row, error: null }, (p) => seen.push(p)),
      'android'
    )
    expect(seen).toEqual(['android'])
  })

  it('release_notes は無くてもよい（null になる）', async () => {
    const policy = await fetchReleasePolicy(
      fakeQuery({ data: { ...row, release_notes: null }, error: null }),
      'ios'
    )
    expect(policy?.releaseNotes).toBeNull()
  })

  it('行が無ければ null（方針未設定 = 何も出さない）', async () => {
    expect(await fetchReleasePolicy(fakeQuery({ data: null, error: null }), 'ios')).toBeNull()
  })

  it('Supabase がエラーを返したら、ログに残して null（例外は投げない）', async () => {
    const query = fakeQuery({ data: null, error: { message: 'permission denied', code: '42501' } })

    expect(await fetchReleasePolicy(query, 'ios')).toBeNull()
    expect(console.error).toHaveBeenCalled()
  })

  it('問い合わせが例外を投げても、ログに残して null', async () => {
    const throwing = () => {
      throw new Error('network down')
    }

    expect(await fetchReleasePolicy(throwing, 'ios')).toBeNull()
    expect(console.error).toHaveBeenCalled()
  })

  it('列が欠けた行は信用せず null（不正なデータで判断しない）', async () => {
    const broken = await fetchReleasePolicy(
      fakeQuery({ data: { platform: 'ios', minimum_version: '1.0.0' }, error: null }),
      'ios'
    )
    expect(broken).toBeNull()
    expect(console.error).toHaveBeenCalled()
  })

  it('応答が返らないときはタイムアウトして null（起動を止めない）', async () => {
    const hanging = () => new Promise<{ data: unknown; error: unknown }>(() => {})

    vi.useFakeTimers()
    try {
      const pending = fetchReleasePolicy(hanging, 'ios', { timeoutMs: 3000 })
      await vi.advanceTimersByTimeAsync(3000)
      expect(await pending).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

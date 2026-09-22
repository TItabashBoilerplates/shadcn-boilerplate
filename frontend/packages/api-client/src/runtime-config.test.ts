import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveBaseUrl } from './runtime-config'

/**
 * web と backend-py は同じ Vercel project の別 service（同一オリジン）。
 * どの経路から叩くかで正しい baseUrl が変わるので、解決順を固定する。
 */
describe('resolveBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('NEXT_PUBLIC_BACKEND_PY_URL があれば最優先（別オリジンから叩く経路）', () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_PY_URL', 'https://app.example.com')
    vi.stubEnv('BACKEND_PY_URL', 'https://binding.internal')

    expect(resolveBaseUrl()).toBe('https://app.example.com')
  })

  it('サーバー側は service binding の BACKEND_PY_URL を使う', () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_PY_URL', '')
    vi.stubEnv('BACKEND_PY_URL', 'https://binding.internal')
    vi.stubGlobal('window', undefined)

    expect(resolveBaseUrl()).toBe('https://binding.internal')
  })

  it('サーバー側で binding が無ければローカルの backend', () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_PY_URL', '')
    vi.stubEnv('BACKEND_PY_URL', '')
    vi.stubGlobal('window', undefined)

    expect(resolveBaseUrl()).toBe('http://127.0.0.1:4040')
  })

  it('ブラウザは同一オリジンなので相対 URL', () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_PY_URL', '')

    expect(resolveBaseUrl()).toBe('')
  })
})

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ app: '', api: vi.fn(), token: vi.fn() }))
vi.mock('../../scripts/mobile/play-api-client.mjs', () => ({
  api: state.api,
  token: state.token,
  PKG: 'test.app',
}))
vi.mock('../../scripts/mobile/store-config.mjs', () => ({
  get APP_DIR() {
    return state.app
  },
}))
const originalArgv = process.argv
let request: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules()
  state.app = mkdtempSync(join(tmpdir(), 'play-upload-'))
  writeFileSync(
    join(state.app, 'eas.json'),
    JSON.stringify({
      submit: { production: { android: { track: 'internal', releaseStatus: 'draft' } } },
    })
  )
  const aab = join(state.app, 'build.aab')
  writeFileSync(aab, 'test bundle')
  process.argv = ['node', 'play-upload-bundle.mjs', aab, 'production']
  state.api.mockReset().mockImplementation(async (method, path) => {
    if (method === 'POST' && path.endsWith('/edits')) return { id: 'edit-1' }
    if (method === 'GET') return { releases: [{ status: 'completed', versionCodes: ['1'] }] }
    return {}
  })
  state.token.mockReset().mockResolvedValue('test-token')
  request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ versionCode: 2 })))
  vi.stubGlobal('fetch', request)
})

afterEach(() => {
  process.argv = originalArgv
  vi.unstubAllGlobals()
  rmSync(state.app, { recursive: true, force: true })
})

const run = () =>
  import(
    /* @vite-ignore */ resolve(import.meta.dirname, '../../scripts/mobile/play-upload-bundle.mjs')
  )

describe('direct Play upload', () => {
  it('uploads to Google, preserves the current release and commits only a draft', async () => {
    await run()
    expect(request).toHaveBeenCalledWith(
      'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/test.app/edits/edit-1/bundles?uploadType=media',
      expect.objectContaining({ method: 'POST', body: Buffer.from('test bundle') })
    )
    expect(state.api).toHaveBeenCalledWith(
      'PUT',
      '/applications/test.app/edits/edit-1/tracks/internal',
      {
        track: 'internal',
        releases: [
          { status: 'completed', versionCodes: ['1'] },
          { status: 'draft', versionCodes: ['2'] },
        ],
      }
    )
    expect(state.api).toHaveBeenLastCalledWith(
      'POST',
      '/applications/test.app/edits/edit-1:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW'
    )
  })

  it('abandons the edit on upload failure without committing', async () => {
    request.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'rejected' } }), { status: 400 })
    )
    await expect(run()).rejects.toThrow('rejected')
    expect(state.api).toHaveBeenLastCalledWith('DELETE', '/applications/test.app/edits/edit-1')
    expect(state.api.mock.calls.some(([, path]) => path.includes(':commit'))).toBe(false)
  })

  it('does not overwrite an existing draft', async () => {
    state.api.mockImplementation(async (method) =>
      method === 'POST'
        ? { id: 'edit-1' }
        : { releases: [{ status: 'draft', versionCodes: ['1'] }] }
    )
    await expect(run()).rejects.toThrow('既存の draft')
    expect(request).not.toHaveBeenCalled()
    expect(state.api).toHaveBeenLastCalledWith('DELETE', '/applications/test.app/edits/edit-1')
  })

  it('does not publish directly even when the submit profile requests completed', async () => {
    writeFileSync(
      join(state.app, 'eas.json'),
      JSON.stringify({ submit: { production: { android: { releaseStatus: 'completed' } } } })
    )
    await expect(run()).rejects.toThrow('draft のみ')
    expect(state.api).not.toHaveBeenCalled()
    expect(request).not.toHaveBeenCalled()
  })
})

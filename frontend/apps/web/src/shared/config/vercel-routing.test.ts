import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * web が「同一 Vercel project の service」として正しく載っていることを機械的に守る。
 *
 * ## なぜこの検査が要るか
 *
 * web(Next.js) と backend-py(FastAPI コンテナ) はリポジトリルートの `vercel.json` の
 * `services` として 1 つの project に同居し、**top-level の rewrite が先勝ち**でパスを
 * 振り分ける（https://vercel.com/docs/services/routing）。
 *
 * つまり catch-all が上に来れば backend が全部死に、`/api/(.*)` を web 側で使えば
 * FastAPI に吸われて 404 になる。どちらも**ローカルでは絶対に再現しない**
 * （devenv は別ポートで両方動かしている）し、ビルドも型も lint も通る。
 * 気づけるのは本番で踏んだときだけなので、静的に固定する。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../../../..')

interface Rewrite {
  source: string
  destination: { service?: string }
}

interface Service {
  root?: string
  bindings?: { type: string; service: string; format: string; env: string }[]
}

interface VercelConfig {
  services: Record<string, Service>
  rewrites: Rewrite[]
}

function config(): VercelConfig {
  return JSON.parse(readFileSync(join(REPO_ROOT, 'vercel.json'), 'utf8')) as VercelConfig
}

/** 先勝ちで最初に一致した rewrite の service を返す */
function serviceFor(path: string): string | undefined {
  const hit = config().rewrites.find((rule) => new RegExp(`^${rule.source}$`).test(path))
  return hit?.destination.service
}

describe('Vercel services のルーティング', () => {
  it('catch-all は最後で、web に向いている', () => {
    const { rewrites } = config()
    const last = rewrites[rewrites.length - 1]

    expect(last.source, 'catch-all が末尾にない（後続のルールが死ぬ）').toBe('/(.*)')
    expect(last.destination.service).toBe('web')
  })

  it.each([
    ['/', 'トップページ'],
    ['/ja/login', 'ロケール配下のページ'],
    ['/auth/confirm', '認証メールの確認（Route Handler）'],
  ])('%s は web に届く（%s）', (path) => {
    expect(serviceFor(path)).toBe('web')
  })

  it.each([
    ['/api/users/me', 'api'],
    ['/healthcheck', 'api'],
    ['/openapi.json', 'api'],
  ])('%s は %s service に届く', (path, service) => {
    expect(serviceFor(path)).toBe(service)
  })

  it('web の service root は frontend/apps/web', () => {
    expect(config().services.web.root).toBe('frontend/apps/web')
  })

  /**
   * `/api/(.*)` は backend 行き。web に `app/api/**` の Route Handler を置くと、
   * ローカルでは動くのに Vercel では FastAPI に吸われて 404 になる。
   */
  it('web に app/api の Route Handler が無い', () => {
    const webRoot = join(REPO_ROOT, config().services.web.root ?? '')

    expect(existsSync(join(webRoot, 'app/api')), 'web の app/api は api service に吸われる').toBe(
      false
    )
  })

  /**
   * サーバー側の fetch は相対 URL を解決できない。binding が消えると
   * `BACKEND_PY_URL` が undefined になり、localhost へのフォールバックで本番が壊れる。
   */
  it('web は api への service binding を宣言している', () => {
    const bindings = config().services.web.bindings ?? []

    expect(bindings, 'web → api の binding が無い').toContainEqual(
      expect.objectContaining({ type: 'service', service: 'api', env: 'BACKEND_PY_URL' })
    )
  })
})

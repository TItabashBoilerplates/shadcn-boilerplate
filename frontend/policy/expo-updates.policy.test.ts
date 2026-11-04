import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * OTA（expo-updates / EAS Update）の**配線**が消えていないことを守る。
 *
 * OTA は壊れても平時は気づけない。ビルドも型も lint も通り、アプリも普通に動くが、
 * 「更新が誰にも届かない」か「非互換な更新が配られる」のどちらかが起きるのは
 * 初めて `eas update` を打った日で、そのときには手遅れ。
 *
 * - `runtimeVersion` が無い / 固定文字列 → 非互換な JS がネイティブに配られる
 * - build profile に `channel` が無い → そのビルドは更新を一切受け取らない
 * - `--environment` を付けない（SDK 55+ では必須）→ publish が失敗する
 *
 * `updates.url` と `extra.eas.projectId` は EAS プロジェクト固有の値で、
 * `mode: boilerplate` の間は意図的に置かない（PROJECT.md / docs/mobile/ota-runbook.md）。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..', '..')
const APP_DIR = join(REPO_ROOT, 'frontend/apps/mobile')

function readJson<T>(path: string): T {
  expect(existsSync(path), `${path} が存在しない`).toBe(true)
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function readText(path: string): string {
  expect(existsSync(path), `${path} が存在しない`).toBe(true)
  return readFileSync(path, 'utf8')
}

describe('expo-updates の配線', () => {
  it('expo-updates が依存に入っている', () => {
    const pkg = readJson<{ dependencies: Record<string, string> }>(join(APP_DIR, 'package.json'))
    expect(pkg.dependencies['expo-updates']).toBeDefined()
  })

  it('runtimeVersion は appVersion ポリシー（公式推奨。固定文字列にしない）', () => {
    const app = readJson<{ expo: { runtimeVersion?: unknown } }>(join(APP_DIR, 'app.json'))
    expect(app.expo.runtimeVersion).toEqual({ policy: 'appVersion' })
  })

  it('すべての build profile に channel がある', () => {
    const eas = readJson<{ build: Record<string, { channel?: string; extends?: string }> }>(
      join(APP_DIR, 'eas.json')
    )
    // `extends` する profile は channel を継承せず上書きする運用なので、明示を要求する
    for (const [name, profile] of Object.entries(eas.build)) {
      expect(profile.channel, `build.${name}.channel`).toBeTruthy()
    }
  })
})

describe('mobile-update（eas update のラッパー）', () => {
  const script = () => readText(join(REPO_ROOT, 'scripts/mobile/update.sh'))

  it('Doppler 注入 → EAS 環境変数の同期 → eas update の順に呼ぶ', () => {
    const body = script()
    const reexec = body.indexOf('mobile_doppler_reexec')
    const push = body.indexOf('mobile_push_public_env')
    const publish = body.indexOf('eas_cli update')
    expect(reexec).toBeGreaterThan(-1)
    expect(push).toBeGreaterThan(reexec)
    expect(publish).toBeGreaterThan(push)
  })

  it('SDK 55+ で必須の --environment と --channel を必ず渡す', () => {
    const body = script()
    expect(body).toMatch(/--environment\b/)
    expect(body).toMatch(/--channel\b/)
    expect(body).toMatch(/--non-interactive\b/)
  })

  it('devenv の script として公開されている', () => {
    const nix = readText(join(REPO_ROOT, 'devenv.nix'))
    expect(nix).toMatch(/"mobile-update"\s*=\s*\{/)
  })
})

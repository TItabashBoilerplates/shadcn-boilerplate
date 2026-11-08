import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function release(platform: 'ios' | 'android', args: string[] = [], failBuild = false) {
  const root = mkdtempSync(join(tmpdir(), 'mobile-local-'))
  roots.push(root)
  const scripts = join(root, 'scripts/mobile')
  cpSync(resolve(import.meta.dirname, '../../scripts/mobile'), scripts, { recursive: true })
  const app = join(root, 'app')
  const bin = join(root, 'bin')
  mkdirSync(app)
  mkdirSync(bin)
  mkdirSync(join(root, 'sdk/platforms'), { recursive: true })
  const eas = JSON.stringify({
    build: { production: {} },
    submit: { production: { android: { track: 'internal', releaseStatus: 'draft' } } },
  })
  writeFileSync(join(app, 'eas.json'), eas)
  writeFileSync(
    join(app, 'app.json'),
    JSON.stringify({ expo: { android: { package: 'test.app' } } })
  )
  writeFileSync(join(root, 'config.env'), 'MOBILE_APP_DIR="app"\n')
  const trace = join(root, 'trace')
  function executable(name: string, body: string) {
    const file = join(bin, name)
    writeFileSync(file, `#!/bin/bash\nset -eu\n${body}\n`)
    chmodSync(file, 0o755)
  }
  executable(
    'bunx',
    `echo "eas $*" >> "$TRACE"
if [ "\${FAIL_BUILD:-}" = 1 ]; then exit 9; fi
case " $* " in *" build "*" --local "*) ;; *) exit 91 ;; esac
while [ "$#" -gt 0 ]; do
  if [ "$1" = --output ]; then touch "$2"; exit 0; fi
  shift
done
exit 92`
  )
  executable('xcrun', 'echo "apple $*" >> "$TRACE"')
  executable('java', 'echo \'java version "17.0.1"\' >&2')
  executable('node', 'echo "google $*" >> "$TRACE"')
  const result = spawnSync('bash', [join(scripts, `release-${platform}.sh`), ...args], {
    encoding: 'utf8',
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      HOME: root,
      MOBILE_CONFIG_FILE: join(root, 'config.env'),
      _MOBILE_DOPPLER: '1',
      ENV: 'production',
      TRACE: trace,
      FAIL_BUILD: failBuild ? '1' : '',
      EXPO_TOKEN: 'test-token',
      EXPO_PUBLIC_SUPABASE_URL: 'https://test.invalid',
      APPLE_API_KEY: 'test-key',
      APPLE_API_ISSUER: 'test-issuer',
      APPLE_API_KEY_P8: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      APPLE_TEAM_ID: 'TESTTEAM12',
      APPLE_ASC_APP_ID: '123',
      PLAY_SERVICE_ACCOUNT_JSON: '{"type":"service_account"}',
      JAVA_HOME: root,
      ANDROID_HOME: join(root, 'sdk'),
    },
  })
  return { ...result, root, app, eas, trace: existsSync(trace) ? readFileSync(trace, 'utf8') : '' }
}

describe('local mobile release', () => {
  it.each(['ios', 'android'] as const)(
    '%s: --local builds locally and uploads directly without EAS cloud jobs or env push',
    (platform) => {
      const result = release(platform, ['--local'])
      expect(result.status, result.stderr).toBe(0)
      expect(result.trace).toContain(' build ')
      expect(result.trace).toContain('--local')
      expect(result.trace).not.toContain('env:push')
      expect(result.trace).not.toContain('eas eas-cli@latest submit')
      expect(result.trace).toContain(
        platform === 'ios' ? 'apple altool --upload-app' : 'play-upload-bundle.mjs'
      )
      expect(readFileSync(join(result.app, 'eas.json'), 'utf8')).toBe(result.eas)
      expect(existsSync(join(result.app, 'credentials/build.ipa'))).toBe(false)
      expect(existsSync(join(result.app, 'credentials/build.aab'))).toBe(false)
    }
  )

  it.each(['ios', 'android'] as const)(
    '%s: defaults to local execution outside CI/CD',
    (platform) => {
      const result = release(platform)
      expect(result.status, result.stderr).toBe(0)
      expect(result.trace).toContain('--local')
    }
  )

  it.each(['ios', 'android'] as const)(
    '%s: a local build failure never starts cloud submission',
    (platform) => {
      const result = release(platform, ['--local'], true)
      expect(result.status).not.toBe(0)
      expect(result.trace).not.toContain('google ')
      expect(result.trace).not.toContain('apple ')
      expect(result.trace).not.toContain(' submit ')
      expect(readFileSync(join(result.app, 'eas.json'), 'utf8')).toBe(result.eas)
    }
  )

  it.each(['ios', 'android'] as const)('%s: dry-run does not build or upload', (platform) => {
    const result = release(platform, ['--local', '--dry-run'])
    expect(result.status, result.stderr).toBe(0)
    expect(result.trace).toBe('')
  })

  it.each(['ios', 'android'] as const)('%s: rejects cloud execution outside CI/CD', (platform) => {
    const result = release(platform, ['--cloud'])
    expect(result.status).not.toBe(0)
    expect(result.trace).toBe('')
  })

  it('rejects --local --submit-via eas before starting a build', () => {
    const result = release('ios', ['--local', '--submit-via', 'eas'])
    expect(result.status).not.toBe(0)
    expect(result.trace).toBe('')
  })
})

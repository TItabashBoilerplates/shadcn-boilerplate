import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * `scripts/mobile/lib.sh` の「実行しないと分からない」挙動を固定する。
 *
 * ここで守るのは 2 つだけで、どちらも **CI も lint も型チェックも検出できない**:
 *
 * 1. **Doppler の再実行が組み立てるコマンドライン**
 *    トークンを別 project に置く構成では、外側の `doppler run` が `DOPPLER_PROJECT` を
 *    トークン側の project 名で上書きして子へ渡す。内側が `--project` を省くと、アプリの
 *    config をトークン側の project から探して
 *    `This token does not have access to requested config 'prd'` で落ちる。
 *    実際に踏んだ事故なので、引数の並びをテストで固定する。
 *
 * 2. **EXPO_PUBLIC_* の抽出**
 *    ここで取りこぼすと「ビルドは成功するのにアプリが起動直後にクラッシュする」になる。
 *    逆に prefix の無いサーバ側 secret を混ぜると **バンドルから読み出せてしまう**。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../..')
const LIB = join(REPO_ROOT, 'scripts/mobile/lib.sh')

/** argv をそのまま出す偽 doppler。`exec doppler ...` がこれに置き換わるので再実行は起きない。 */
const FAKE_DOPPLER = `#!/usr/bin/env bash
if [ "\${1:-}" = "configure" ]; then
  printf '%s\\n' "\${FAKE_SCOPE_PROJECT-}"
  exit 0
fi
printf 'ARGV %s\\n' "$*"
exit 0
`

let binDir: string

beforeAll(() => {
  binDir = mkdtempSync(join(tmpdir(), 'mobile-lib-test-'))
  const fake = join(binDir, 'doppler')
  writeFileSync(fake, FAKE_DOPPLER)
  chmodSync(fake, 0o755)
})

afterAll(() => {
  rmSync(binDir, { recursive: true, force: true })
})

function runLib(snippet: string, env: Record<string, string> = {}) {
  return spawnSync('bash', ['-c', `. "${LIB}"\n${snippet}`], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      PATH: `${binDir}:${process.env.PATH}`,
      HOME: process.env.HOME ?? tmpdir(),
      // 開発者の手元にある config.env を読ませない（テストの前提が壊れるため）
      MOBILE_CONFIG_FILE: join(binDir, 'no-such-config.env'),
      ENV: 'production',
      ...env,
    },
  })
}

/**
 * `exec doppler ...` が組み立てた argv。再実行される本体（`env _MOBILE_DOPPLER=1 bash <script>`）は
 * ここでの関心事ではないので、doppler へ渡す部分と、引数が転送されているかだけを見る。
 */
const REEXEC = '-- env _MOBILE_DOPPLER=1 bash '

function dopplerArgv(env: Record<string, string> = {}) {
  const result = runLib('mobile_load_config\nmobile_doppler_reexec --dry-run', env)
  const line = result.stdout.split('\n').find((l) => l.startsWith('ARGV '))
  const argv = line?.slice('ARGV '.length) ?? ''
  const at = argv.indexOf(REEXEC)
  return {
    result,
    argv,
    dopplerArgs: at < 0 ? '' : argv.slice(0, at).trimEnd(),
    forwardedArgs:
      at < 0
        ? ''
        : argv
            .slice(at + REEXEC.length)
            .split(' ')
            .slice(1)
            .join(' '),
  }
}

describe('mobile_doppler_reexec', () => {
  it('単一 project 運用では doppler run を 1 段だけ挟み、scope の解決は doppler に任せる', () => {
    const { result, dopplerArgs, forwardedArgs } = dopplerArgv({ FAKE_SCOPE_PROJECT: 'my-app' })

    expect(result.status).toBe(0)
    expect(dopplerArgs).toBe('run --config prd')
    expect(forwardedArgs).toBe('--dry-run')
  })

  it('トークンを別 project に置く構成では、内側の doppler run に --project を明示する', () => {
    const { result, dopplerArgs, forwardedArgs } = dopplerArgv({
      MOBILE_TOKENS_PROJECT: 'org-tokens',
      FAKE_SCOPE_PROJECT: 'my-app',
    })

    expect(result.status).toBe(0)
    // 外側（トークン）→ 内側（アプリ）の順。内側の --project が無いと
    // 外側が入れた DOPPLER_PROJECT=org-tokens を見にいって落ちる。
    expect(dopplerArgs).toBe(
      'run --project org-tokens --config prd -- doppler run --project my-app --config prd'
    )
    expect(forwardedArgs).toBe('--dry-run')
  })

  it('config.env の MOBILE_APP_DOPPLER_PROJECT は doppler の紐付けより優先する', () => {
    const { dopplerArgs } = dopplerArgv({
      MOBILE_TOKENS_PROJECT: 'org-tokens',
      MOBILE_APP_DOPPLER_PROJECT: 'declared-app',
      FAKE_SCOPE_PROJECT: 'my-app',
    })

    expect(dopplerArgs).toContain('doppler run --project declared-app --config prd')
  })

  it('アプリ側の project が分からないまま 2 段目を組み立てない（黙って落ちない）', () => {
    const { result, argv } = dopplerArgv({
      MOBILE_TOKENS_PROJECT: 'org-tokens',
      FAKE_SCOPE_PROJECT: '',
    })

    expect(argv).toBe('')
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('MOBILE_APP_DOPPLER_PROJECT')
  })
})

describe('mobile_push_public_env', () => {
  function pushDryRun(env: Record<string, string>) {
    return runLib('mobile_load_config\nmobile_push_public_env production dry', env)
  }

  it('EXPO_PUBLIC_* だけを対象にし、prefix の無い secret は絶対に混ぜない', () => {
    const result = pushDryRun({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      POSTGRES_URL: 'postgres://user:pw@host/db',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('EXPO_PUBLIC_SUPABASE_URL')
    expect(result.stdout).not.toContain('POSTGRES_URL')
  })

  it('空値は push しないが、落としたキーは必ず表示する', () => {
    const result = pushDryRun({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_ONESIGNAL_APP_ID: '',
    })

    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('EXPO_PUBLIC_ONESIGNAL_APP_ID')
  })

  it('1 件も無ければ落とす（黙って空の env を push しない）', () => {
    const result = pushDryRun({})

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('EXPO_PUBLIC_')
  })

  it('改行を含む値は黙って尻切れにせず、キー名を挙げて落とす', () => {
    const result = pushDryRun({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_BROKEN: 'line1\nline2',
    })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('EXPO_PUBLIC_BROKEN')
  })
})

describe('mobile_apple_team_id', () => {
  it('署名 ID の括弧から Team ID を取り出す', () => {
    const result = runLib(
      'printf "[%s]\\n" "$(mobile_apple_team_id "Apple Distribution: Example Inc. (ABCDE12345)")"'
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[ABCDE12345]')
  })

  it('取り出せなくても呼び出し元を巻き込まない（set -e + pipefail で死なない）', () => {
    // grep は不一致で exit 1 を返す。握らないと呼び出し元の代入ごと失敗し、
    // 「APPLE_TEAM_ID がありません」という案内に到達する前に無言で落ちる。
    const result = runLib(
      'team="$(mobile_apple_team_id "Apple Distribution: Example Inc.")"\nprintf "after=[%s]\\n" "$team"'
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('after=[]')
  })
})

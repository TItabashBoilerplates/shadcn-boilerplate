import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * `scripts/devenv/services.sh` の停止処理を固定する。
 *
 * devenv 2.2.2 の `devenv tasks run` は、終了時に**稼働中デーモンの**
 * `native-manager.pid` / `native.sock` まで削除する（2.3.0 で修正済みだが、2.3.x には
 * 別の不具合があり上げられない）。その状態の `devenv processes down` は
 * "No process manager is running" で失敗し、親を失ったデーモンと子（uvicorn / storybook）が
 * 生き残る。以前の `app:stop` はこの失敗を握りつぶして「✅ All services stopped.」と
 * 表示していたので、**止まっていないのに止まったと信じてしまう**状態だった。
 *
 * ここで守るのは 3 点:
 *   1. ファイルが消えていてもプロセスを見つけて止める
 *   2. 止め切れなかったら成功を名乗らない（非ゼロで落ちる）
 *   3. 自分自身と別 runtime のデーモンは絶対に殺さない
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../..')
const SERVICES = join(REPO_ROOT, 'scripts/devenv/services.sh')

const DAEMON_MARKER = 'daemon-processes'

type Sandbox = {
  root: string
  runtime: string
  bin: string
  daemons: number[]
}

const sandboxes: Sandbox[] = []

afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) {
    for (const pid of sandbox.daemons) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // 既に止まっている（テストが止めた場合）
      }
    }
    rmSync(sandbox.root, { recursive: true, force: true })
  }
})

/** DEVENV_ROOT として使う一時ディレクトリ（.devenv/run → runtime の symlink つき）。 */
function makeSandbox(): Sandbox {
  const root = mkdtempSync(join(tmpdir(), 'devenv-services-test-'))
  const runtime = join(root, 'runtime')
  mkdirSync(join(runtime, 'processes'), { recursive: true })
  mkdirSync(join(root, '.devenv'), { recursive: true })
  symlinkSync(runtime, join(root, '.devenv/run'))

  const bin = join(root, 'bin')
  mkdirSync(bin)
  const sandbox: Sandbox = { root, runtime, bin, daemons: [] }
  sandboxes.push(sandbox)
  return sandbox
}

function fakeCommand(sandbox: Sandbox, name: string, body: string) {
  const path = join(sandbox.bin, name)
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
}

/** 本物と同じ形の argv（`... daemon-processes <runtime>/processes/daemon-config.json`）を
 * 持つダミーデーモン。SIGTERM で即座に終わる。 */
function spawnFakeDaemon(sandbox: Sandbox, runtime: string): number {
  const script = join(sandbox.root, 'fake-daemon.sh')
  writeFileSync(
    script,
    // `sleep` を前面で待つと TERM の処理が遅れるので、待ちは wait に任せる
    "#!/usr/bin/env bash\ntrap 'exit 0' TERM\nwhile :; do sleep 0.2 & wait $!; done\n"
  )
  chmodSync(script, 0o755)

  const result = spawnSync(
    'bash',
    [
      '-c',
      `bash "${script}" ${DAEMON_MARKER} "${runtime}/processes/daemon-config.json" ` +
        '>/dev/null 2>&1 & echo $!',
    ],
    { encoding: 'utf8' }
  )
  const pid = Number.parseInt(result.stdout.trim(), 10)
  sandbox.daemons.push(pid)
  return pid
}

function run(sandbox: Sandbox, args: string[], options: { wrapperArgv?: string } = {}) {
  const command = options.wrapperArgv
    ? // 呼び出し元シェルの cmdline にマーカーが入る状況（pgrep -f が拾ってしまう）
      `bash "${SERVICES}" ${args.join(' ')}; : ${options.wrapperArgv}`
    : `bash "${SERVICES}" ${args.join(' ')}`

  return spawnSync('bash', ['-c', command], {
    encoding: 'utf8',
    env: {
      PATH: `${sandbox.bin}:${process.env.PATH}`,
      HOME: process.env.HOME ?? tmpdir(),
      DEVENV_ROOT: sandbox.root,
      DEVENV_STOP_WAIT_SECONDS: '5',
    },
  })
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

describe('services.sh stop', () => {
  it('manager ファイルが消えていても、生き残ったデーモンを止める', () => {
    const sandbox = makeSandbox()
    fakeCommand(sandbox, 'devenv', 'echo "No process manager is running" >&2; exit 1')
    fakeCommand(sandbox, 'supabase', 'exit 0')
    const pid = spawnFakeDaemon(sandbox, sandbox.runtime)

    const result = run(sandbox, ['stop'])

    expect(isAlive(pid)).toBe(false)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('All services stopped.')
  })

  it('Supabase を止められなかったら成功を名乗らない', () => {
    const sandbox = makeSandbox()
    fakeCommand(sandbox, 'devenv', 'exit 0')
    fakeCommand(sandbox, 'supabase', 'echo "boom" >&2; exit 1')
    // コンテナが動いている = 「元から起動していない」では説明できない失敗
    fakeCommand(sandbox, 'docker', 'echo supabase_db_container')

    const result = run(sandbox, ['stop'])

    expect(result.status).not.toBe(0)
    expect(result.stdout).not.toContain('All services stopped.')
  })

  it('別 runtime のデーモンには触らない', () => {
    const sandbox = makeSandbox()
    const other = makeSandbox()
    fakeCommand(sandbox, 'devenv', 'exit 0')
    fakeCommand(sandbox, 'supabase', 'exit 0')
    const foreign = spawnFakeDaemon(other, other.runtime)

    const result = run(sandbox, ['stop'])

    expect(result.status).toBe(0)
    expect(isAlive(foreign)).toBe(true)
  })

  it('呼び出し元のシェルを自分で殺さない', () => {
    const sandbox = makeSandbox()
    fakeCommand(sandbox, 'devenv', 'exit 0')
    fakeCommand(sandbox, 'supabase', 'exit 0')

    // 親シェルの cmdline にマーカーが入っていても、自分と祖先は対象外
    const result = run(sandbox, ['stop'], {
      wrapperArgv: `${DAEMON_MARKER} ${sandbox.runtime}/processes/daemon-config.json`,
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('All services stopped.')
  })
})

describe('services.sh reap', () => {
  it('devenv から見えているデーモンは止めない', () => {
    const sandbox = makeSandbox()
    writeFileSync(join(sandbox.runtime, 'processes/native-manager.pid'), '1\n')
    spawnSync('bash', [
      '-c',
      `python3 -c "
import socket, sys
s = socket.socket(socket.AF_UNIX)
s.bind(sys.argv[1])
" "${join(sandbox.runtime, 'processes/native.sock')}"`,
    ])
    const pid = spawnFakeDaemon(sandbox, sandbox.runtime)

    const result = run(sandbox, ['reap'])

    expect(result.status).toBe(0)
    expect(isAlive(pid)).toBe(true)
  })

  it('見えなくなったデーモンは止める', () => {
    const sandbox = makeSandbox()
    const pid = spawnFakeDaemon(sandbox, sandbox.runtime)

    const result = run(sandbox, ['reap'])

    expect(result.status).toBe(0)
    expect(isAlive(pid)).toBe(false)
  })
})

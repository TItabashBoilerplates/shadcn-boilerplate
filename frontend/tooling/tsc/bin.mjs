#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { resolveTsc } from './resolve.mjs'

/** Every workspace and drizzle use the same pinned tsrs compiler. */
const { packageName, version, tscPath } = resolveTsc()

if (process.env.WORKSPACE_TSC_VERBOSE) {
  console.error(`[workspace-tsc] using ${packageName}@${version}`)
}

// Keep the compiler in the same process on our Unix devenv platforms.
if (process.platform !== 'win32' && typeof process.execve === 'function') {
  process.execve(
    process.execPath,
    [process.execPath, tscPath, ...process.argv.slice(2)],
    process.env
  )
}

const child = spawn(process.execPath, [tscPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}

child.on('error', (error) => {
  console.error(`[workspace-tsc] failed to run ${tscPath}:`, error.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  // シグナルで落ちた場合は同じシグナルで自分も終わる（CI が理由を取り違えないように）
  if (signal) {
    process.removeAllListeners(signal)
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})

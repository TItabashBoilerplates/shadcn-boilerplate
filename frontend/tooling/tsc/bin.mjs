#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { resolveTsc } from './resolve.mjs'

/**
 * 型チェック用の tsc ラッパ。`tsc` の代わりにこれを呼ぶ。
 *
 * 解決ロジックと TypeScript 7.1 への移行手順は `resolve.mjs` を参照。
 * 引数はそのまま tsc へ渡すので `workspace-tsc --noEmit -p tsconfig.json` のように使う。
 *
 * `WORKSPACE_TSC_VERBOSE=1` を付けると、どの TypeScript を使ったかを表示する
 * （「速くなっていない気がする」ときに TS6 へフォールバックしていないか確認できる）。
 */

const { packageName, version, tscPath } = resolveTsc()

if (process.env.WORKSPACE_TSC_VERBOSE) {
  console.error(`[workspace-tsc] using ${packageName}@${version}`)
}

const child = spawn(process.execPath, [tscPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(`[workspace-tsc] failed to run ${tscPath}:`, error.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  // シグナルで落ちた場合は同じシグナルで自分も終わる（CI が理由を取り違えないように）
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})

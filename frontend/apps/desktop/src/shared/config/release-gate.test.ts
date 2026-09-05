import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  compareVersions,
  decideRelease,
  // 実装: `scripts/desktop/release-gate.mjs`
  // main へのマージで自動的にリリースを走らせるための判定。**壊れても何も起きない**
  // （リリースが走らないだけで、CI も型も lint も通る）ので、判定と workflow の配線を
  // ここで固定する。
} from '../../../../../../scripts/desktop/release-gate.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../../../..')

describe('release-gate: 版の比較', () => {
  it('x.y.z を数値で比較する（文字列比較だと 0.10.0 < 0.9.0 になる）', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBe(1)
    expect(compareVersions('0.3.0', '0.3.0')).toBe(0)
    expect(compareVersions('0.2.9', '0.3.0')).toBe(-1)
    expect(compareVersions('1.0.0', '0.99.99')).toBe(1)
  })

  it('x.y.z 以外は受け付けない（updater の semver 比較と食い違う形を配布しない）', () => {
    expect(() => compareVersions('0.3', '0.3.0')).toThrow()
    expect(() => compareVersions('v0.3.0', '0.3.0')).toThrow()
    expect(() => compareVersions('0.3.0-beta.1', '0.3.0')).toThrow()
    expect(() => compareVersions('', '0.3.0')).toThrow()
  })
})

describe('release-gate: リリースを走らせるかの判定', () => {
  it('手動実行（workflow_dispatch）は版に関わらず走らせる（再実行の逃げ道を残す）', () => {
    expect(
      decideRelease({ event: 'workflow_dispatch', current: '0.3.0', published: '0.3.0' }).release
    ).toBe(true)
    expect(
      decideRelease({ event: 'workflow_dispatch', current: '0.2.0', published: '0.3.0' }).release
    ).toBe(true)
  })

  it('push: 公開済みより新しい版なら走らせる', () => {
    expect(decideRelease({ event: 'push', current: '0.3.0', published: '0.2.0' }).release).toBe(
      true
    )
  })

  it('push: 公開済みと同じ版は走らせない（version を上げていないマージで再配布しない）', () => {
    expect(decideRelease({ event: 'push', current: '0.3.0', published: '0.3.0' }).release).toBe(
      false
    )
  })

  it('push: 公開済みより古い版は走らせない（黙って巻き戻さない）', () => {
    expect(decideRelease({ event: 'push', current: '0.2.0', published: '0.3.0' }).release).toBe(
      false
    )
  })

  it('判定の理由を返す（workflow のログで「なぜ走らなかったか」が読める）', () => {
    const skipped = decideRelease({ event: 'push', current: '0.3.0', published: '0.3.0' })
    expect(skipped.reason).toContain('0.3.0')
    const released = decideRelease({ event: 'push', current: '0.3.0', published: '0.2.0' })
    expect(released.reason).toContain('0.2.0')
    expect(released.reason).toContain('0.3.0')
  })

  it('現在の版が x.y.z でなければ判定せず落とす', () => {
    expect(() => decideRelease({ event: 'push', current: 'next', published: '0.3.0' })).toThrow()
  })
})

describe('release-gate: workflow の配線', () => {
  const workflow = readFileSync(join(REPO_ROOT, '.github/workflows/desktop-release.yml'), 'utf8')

  it('main への push（tauri.conf.json の変更）と手動実行の両方で起動する', () => {
    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).toContain('frontend/apps/desktop/src-tauri/tauri.conf.json')
  })

  it('build は gate job の判定に従う（判定は release-gate の CLI が行う）', () => {
    expect(workflow).toContain('scripts/desktop/check-release-gate.mjs')
    expect(workflow).toContain("needs.gate.outputs.release == 'true'")
  })
})

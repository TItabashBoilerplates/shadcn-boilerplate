/**
 * 版の比較。**ここを間違えると全ユーザーが起動できなくなる**ので、
 * 文字列比較との差（"1.10.0" vs "1.9.0"）と、比較できない入力の扱いを固定する。
 *
 * 方針: **比較できないものは `null` を返す**。呼び出し側はそれをフェイルオープン
 * （＝ブロックしない）に倒す。版が読めないという理由でアプリを止めてはならない。
 */
import { describe, expect, it } from 'vitest'
import { compareVersions, parseVersion } from './version'

describe('parseVersion', () => {
  it('ドット区切りの数値を配列にする', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3])
  })

  it('セグメントが足りなければ 0 で埋める（1.2 は 1.2.0 と同じ）', () => {
    expect(parseVersion('1.2')).toEqual([1, 2, 0])
    expect(parseVersion('1')).toEqual([1, 0, 0])
  })

  it('4 セグメント以上も受け付ける（Android の versionName は自由形式）', () => {
    expect(parseVersion('1.2.3.4')).toEqual([1, 2, 3, 4])
  })

  it('前後の空白は無視する', () => {
    expect(parseVersion(' 1.2.3 ')).toEqual([1, 2, 3])
  })

  // ここを「0 とみなす」等で救うと、意図せず「下限未満」と判定して
  // ユーザーをブロックしうる。読めないものは読めないと言う。
  it.each([
    ['プレリリースタグ付き', '1.2.3-beta.1'],
    ['ビルドメタデータ付き', '1.2.3+build.5'],
    ['数値でない', 'v1.2.3'],
    ['空文字', ''],
    ['空白のみ', '   '],
    ['負の数', '1.-2.3'],
    ['セグメントが空', '1..3'],
    ['小数', '1.2.3.5e1'],
  ])('%s は比較不能として null を返す: %s', (_label, input) => {
    expect(parseVersion(input)).toBeNull()
  })

  it('null / undefined は null', () => {
    expect(parseVersion(null)).toBeNull()
    expect(parseVersion(undefined)).toBeNull()
  })
})

describe('compareVersions', () => {
  it('等しければ 0', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
  })

  it('セグメント数が違っても 0 埋めで比較する', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0)
    expect(compareVersions('1.2.0.0', '1.2')).toBe(0)
  })

  // 文字列比較だと "1.10.0" < "1.9.0" になる。ここが本テストの核心。
  it('1.10.0 は 1.9.0 より新しい（文字列比較になっていない）', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compareVersions('1.9.0', '1.10.0')).toBeLessThan(0)
  })

  it('major > minor > patch の優先度で比較する', () => {
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0)
    expect(compareVersions('1.3.0', '1.2.99')).toBeGreaterThan(0)
    expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0)
  })

  it('どちらかが比較不能なら null', () => {
    expect(compareVersions('1.2.3-beta', '1.2.3')).toBeNull()
    expect(compareVersions('1.2.3', 'unknown')).toBeNull()
    expect(compareVersions(null, '1.2.3')).toBeNull()
  })
})

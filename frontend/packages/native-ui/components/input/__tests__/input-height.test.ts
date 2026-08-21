import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { INPUT_SIZES } from '@workspace/tokens/contract'
import { describe, expect, it } from 'vitest'

import { inputFieldStyle, inputStyle } from '../variants'

const INDEX_SOURCE = readFileSync(resolve(__dirname, '../index.tsx'), 'utf-8')

/**
 * Input のボックスモデル（再発防止）。
 *
 * 固定高（`h-11` 等）+ フォントメトリクス任せの縦位置で実装すると、
 * カスタムフォントや端末のフォントスケールで中身がボックスより高くなり、
 *
 * 1. Android の `TextInput`（EditText extends TextView）は収まらない中身に
 *    **内部スクロールを生やす**。`ReactEditText.onTouchEvent` は
 *    `canScrollVertically()` が真の間ドラッグを自分で消費するため、
 *    「1 行の入力欄なのに中でスクロールする」不具合になる
 * 2. `includeFontPadding`（RN 既定 true）が確保する高さと実際の描画位置が
 *    ずれ、**文字が上端に貼りついて切れる**
 *
 * どちらもビルド・型・lint・Storybook では検出できないため、ここで機械的に守る。
 */
describe('native Input / box model (intrinsic height)', () => {
  it('every size sets only a minimum height, so the box grows with its content', () => {
    for (const size of INPUT_SIZES) {
      expect(inputStyle({ size }), size).toMatch(/\bmin-h-\d+\b/)
    }
  })

  it('never pins the box to a fixed height (font scale would overflow it)', () => {
    for (const size of INPUT_SIZES) {
      expect(inputStyle({ size }), `${size} must not use h-*`).not.toMatch(
        /(?:^|\s)h-(?:\d+(?:\.\d+)?|full|px)\b/
      )
    }
  })

  it('the field brings its own vertical padding instead of being pinned to the box', () => {
    for (const size of INPUT_SIZES) {
      const classes = inputFieldStyle({ size })
      expect(classes, `${size} must have vertical padding`).toMatch(/\bpy-\d/)
      expect(classes, `${size} must not pin itself with h-full / py-0`).not.toMatch(
        /\bh-full\b|\bpy-0\b/
      )
    }
  })

  it('disables includeFontPadding so text is not glued to the top edge (Android)', () => {
    // TextStyle にしか存在しないプロパティなので className では表現できず、
    // index.tsx の style 経由で当てるしかない
    expect(INDEX_SOURCE).toContain('includeFontPadding: false')
  })

  it('centers text vertically and keeps the caller-supplied style (array merge)', () => {
    expect(INDEX_SOURCE).toContain('textAlignVertical="center"')
    // 呼び出し側の style を配列で温存する（上書きで潰さない）
    expect(INDEX_SOURCE).toMatch(/style=\{\[[^\]]+,\s*style\s*\]\}/)
  })
})

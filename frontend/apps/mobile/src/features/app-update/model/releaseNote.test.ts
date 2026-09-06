import { describe, expect, it } from 'vitest'
import { pickReleaseNote } from './releaseNote'

/**
 * リリースノートはロケールキーの jsonb（`{"en": "...", "ja": "..."}`）。
 * **表示できないなら出さない**（英語を日本語ユーザーに出すより無いほうがよい、
 * ではなく「英語なら読める人もいる」ので en へフォールバックする方針）。
 */
describe('pickReleaseNote', () => {
  const notes = { en: 'Bug fixes', ja: '不具合を修正しました' }

  it('現在のロケールを優先する', () => {
    expect(pickReleaseNote(notes, 'ja')).toBe('不具合を修正しました')
    expect(pickReleaseNote(notes, 'en')).toBe('Bug fixes')
  })

  it('ロケールが無ければ en にフォールバックする', () => {
    expect(pickReleaseNote(notes, 'fr')).toBe('Bug fixes')
  })

  it('en も無ければ null（既定文言だけを出す）', () => {
    expect(pickReleaseNote({ ja: 'あ' }, 'fr')).toBeNull()
  })

  it('ノート自体が無ければ null', () => {
    expect(pickReleaseNote(null, 'ja')).toBeNull()
  })

  it('空文字は「無い」とみなす（空の枠を描かせない）', () => {
    expect(pickReleaseNote({ ja: '   ', en: 'Bug fixes' }, 'ja')).toBe('Bug fixes')
    expect(pickReleaseNote({ ja: '', en: '' }, 'ja')).toBeNull()
  })

  it('ロケールに地域が付いていても言語で引ける（ja-JP → ja）', () => {
    expect(pickReleaseNote(notes, 'ja-JP')).toBe('不具合を修正しました')
  })
})

/** 読めるロケールが 1 つも無いときの最終手段 */
const FALLBACK_LOCALE = 'en'

/**
 * `release_notes`（ロケールキーの jsonb）から、いま表示すべき 1 本を選ぶ。
 *
 * 固定の UI 文言と違い、リリースノートは**リリースごとに変わるデータ**なので
 * i18n のメッセージファイルではなく DB に置いてある（`.claude/rules/i18n.md` が
 * 対象にしているのは「アプリに埋め込む文言」）。無ければ UI 側の既定文言だけを出す。
 */
export function pickReleaseNote(
  notes: Record<string, string> | null | undefined,
  locale: string
): string | null {
  if (!notes) return null

  // 'ja-JP' / 'en-US' のような BCP 47 タグでも言語部分で引けるようにする
  const language = locale.split('-')[0] ?? locale

  for (const key of [locale, language, FALLBACK_LOCALE]) {
    const value = notes[key]
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return null
}

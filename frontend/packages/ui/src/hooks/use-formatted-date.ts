'use client'

import { useEffect, useState } from 'react'

/**
 * UTC の ISO 文字列を**ブラウザのタイムゾーン**で整形する。
 *
 * ## なぜ effect の中でしか整形しないか
 *
 * DB も API も UTC で持つ（`.claude/rules/datetime.md`）ので、表示のたびに現地時刻へ
 * 直す必要がある。ところが**サーバ描画時のタイムゾーンはサーバのもの**（Vercel は UTC）
 * で、ブラウザは利用者のものになる。素直に描くと同じ値が 2 通りに出て、
 * **ハイドレーション不一致**になる（日付が 1 日ずれることさえある）。
 *
 * next-intl の `useFormatter().dateTime()` を日時にそのまま使うと、この状況を
 * **`IntlError: ENVIRONMENT_FALLBACK`**（"timeZone がグローバルに設定されていない"）
 * として警告してくる。警告を消すために `timeZone` を固定すると、今度は全員に
 * UTC の日付を見せることになる。したがって**整形はマウント後に行う**。
 *
 * マウント前は `null` を返すので、**呼び出し側はプレースホルダを描く**こと
 * （素の `''` を描くと行の高さが跳ねる）。
 *
 * 月の境界のように「UTC として読むのが正しい」値は、`options.timeZone` に
 * `'UTC'` を渡して**呼び出し側で明示する**（例: 使用量の月次サマリ）。
 */
export function useFormattedDate(
  iso: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string | null {
  const [formatted, setFormatted] = useState<string | null>(null)

  // options はリテラルで渡される想定。JSON 化して比較しないと、毎回新しい
  // オブジェクトが依存に入って effect が回り続ける
  const optionsKey = JSON.stringify(options)
  useEffect(() => {
    if (!iso) {
      setFormatted(null)
      return
    }
    setFormatted(
      new Intl.DateTimeFormat(locale, JSON.parse(optionsKey) as Intl.DateTimeFormatOptions).format(
        new Date(iso)
      )
    )
  }, [iso, locale, optionsKey])

  return formatted
}

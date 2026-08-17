import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `"use server"` ファイルが async 関数以外を export していないことを守る。
 *
 * ## なぜこの検査が要るか
 *
 * Next.js は `"use server"` ファイルからの export を **async 関数に限定**している
 * （export されたものは全てクライアントから呼べる RPC エンドポイントになるため、
 * 定数や同期関数を置く場所ではない）。
 *
 * **この違反は型チェックでも lint でも Storybook でも検出できない。**
 * `tsc --noEmit` は通り、Biome も ESLint も通り、単体テストも通る。
 * 壊れるのは `next build`（Turbopack）だけで、しかもエラーの出方が
 *
 *   Error: Only async functions are allowed to be exported in a "use server" file.
 *   → The export X was not found in module ... The module has no exports at all.
 *
 * という形になる。**違反した 1 つの定数のせいでモジュール全体の export が消える**ので、
 * そのファイルを import している箇所が芋づる式に壊れ、原因が非常に分かりにくい。
 *
 * 実際に `deleteAccount.ts` が `DELETE_ACCOUNT_CONFIRMATION` を export していたために
 * `next build` が 7 エラーで失敗していた（`ci:check` は lint / format / type-check のみで
 * `next build` を含まないため、長期間気づかれなかった）。
 *
 * @see https://nextjs.org/docs/app/api-reference/directives/use-server
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC_ROOT = resolve(HERE, '../..')

/** コメントと文字列リテラルの影響を避けるため、ブロック/行コメントだけ落とす */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

function collectFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return collectFiles(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })
}

/** 先頭の `'use server'` / `"use server"` ディレクティブを持つファイル */
function isServerActionFile(source: string): boolean {
  return /^\s*(?:'use server'|"use server")/.test(source)
}

const serverActionFiles = collectFiles(SRC_ROOT).filter((file) =>
  isServerActionFile(readFileSync(file, 'utf8'))
)

describe('"use server" ファイルの export', () => {
  it('検査対象が 1 つ以上見つかる（glob が壊れていないことの確認）', () => {
    expect(serverActionFiles.length).toBeGreaterThan(0)
  })

  it.each(
    serverActionFiles.map((file) => [relative(SRC_ROOT, file), file])
  )('%s は async 関数以外を export していない', (_label, file) => {
    const code = stripComments(readFileSync(file, 'utf8'))

    // `export const` / `export let` / `export var` は値の export になるため不可
    const valueExports = code.match(/^\s*export\s+(?:const|let|var)\s+\w+/gm) ?? []

    // `export function` は async でなければ不可（`export async function` のみ許可）
    const syncFunctionExports = code.match(/^\s*export\s+function\s+\w+/gm) ?? []

    // `export { X }` の再 export も、何を出しているか静的に追えないため不可
    const namedReExports = code.match(/^\s*export\s*\{[^}]*\}/gm) ?? []

    expect(
      [...valueExports, ...syncFunctionExports, ...namedReExports],
      `"use server" ファイルは async 関数のみ export できる。` +
        `定数や型は model/ など別モジュールへ移すこと`
    ).toEqual([])
  })
})

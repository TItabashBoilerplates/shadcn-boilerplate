import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/**
 * 型チェックに使う TypeScript コンパイラを解決する。
 *
 * ## なぜ解決処理が要るのか
 *
 * TypeScript 7.0 は **programmatic API を持たない**（`require('typescript')` の
 * ルート export は `version` だけ）。そのため typescript-eslint のように
 * コンパイラ API を使うツールは TS 7 では動かず、公式も TS 6 との**側置き**を
 * 案内している。
 *
 *   > TypeScript 7.0 does not ship with an API. ... TypeScript 6.0 and TypeScript 7.0
 *   > can be run side-by-side for utilities that still need programmatic access
 *   > to the compiler (such as typescript-eslint).
 *
 * 本リポジトリはその構成を採っている:
 *
 * | パッケージ名           | 中身        | 使う人                          |
 * |------------------------|-------------|---------------------------------|
 * | `typescript`           | TS 6.0.3    | typescript-eslint（ESLint 経由）|
 * | `@typescript/native`   | TS 7.x      | 型チェック（このモジュール）     |
 *
 * `node_modules/.bin/tsc` は**両者が同じ bin 名を要求するためどちらが勝つかが
 * インストール順に依存する**。`.bin/tsc` に頼ると「ある日静かに TS6 に戻る」
 * 形で壊れるので、必ずこのモジュールで明示的に解決する。
 *
 * ## TypeScript 7.1 が出たときの移行手順
 *
 * 7.1 で安定 API が入り typescript-eslint が対応したら、**`frontend/package.json` の
 * 2 行を書き換えるだけ**でよい:
 *
 * ```diff
 * -"typescript": "6.0.3",
 * -"@typescript/native": "npm:typescript@^7.0.2",
 * +"typescript": "^7.1.0",
 * ```
 *
 * このモジュールは `typescript` のメジャーが 7 以上ならそちらを優先するので、
 * **スクリプト・devenv・turbo の設定は一切変更不要**。エイリアスが消えても
 * そのまま動く。
 *
 * @see https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
 */

const require = createRequire(import.meta.url)

/** 候補パッケージ。**先頭から順に評価し、最初に「TS 7 以上」だったものを使う** */
const CANDIDATES = ['typescript', '@typescript/native']

function inspect(packageName) {
  let packageJsonPath
  try {
    packageJsonPath = require.resolve(`${packageName}/package.json`)
  } catch {
    return null
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const packageDir = dirname(packageJsonPath)

  // TS 7 の bin は拡張子なしの ESM ラッパで Node の main entry にできない
  // （Next.js も同じ理由で lib/tsc.js へ迂回している）。lib/tsc.js は TS 6 / 7 とも存在する。
  const tscJs = join(packageDir, 'lib', 'tsc.js')

  return {
    packageName,
    version: packageJson.version,
    major: Number.parseInt(packageJson.version, 10),
    tscPath: existsSync(tscJs) ? tscJs : null,
  }
}

/**
 * 使用する tsc を決める。
 *
 * @returns {{ packageName: string, version: string, major: number, tscPath: string }}
 * @throws 使える tsc が 1 つも無い場合
 */
export function resolveTsc() {
  const found = CANDIDATES.map(inspect).filter((entry) => entry?.tscPath)

  if (found.length === 0) {
    throw new Error(
      'TypeScript が見つからない。frontend で `bun install` を実行したか確認すること。'
    )
  }

  // TS 7 以上を最優先（= 7.1 移行後は typescript 本体がそのまま選ばれる）
  return found.find((entry) => entry.major >= 7) ?? found[0]
}

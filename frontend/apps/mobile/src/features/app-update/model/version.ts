/**
 * 版（バージョン文字列）の比較。
 *
 * ## なぜ semver ライブラリを使わないか
 *
 * 比較したいのは **ストアのマーケティング版**（iOS `CFBundleShortVersionString` /
 * Android `versionName`）であって semver ではない。Apple は「ピリオド区切りの
 * 非負整数」しか受け付けず、プレリリースタグもビルドメタデータも入らない。
 * つまり semver の仕様のうち必要なのは数値セグメントの比較だけで、
 * そのために依存を 1 つ増やす理由が無い（`.claude/rules/minimal-implementation.md` §1）。
 *
 * ## 設計方針: 読めないものは `null` を返す
 *
 * ここで「読めない版を 0.0.0 とみなす」等の救済をすると、**下限未満と判定されて
 * 正常なユーザーがブロックされる**。読めないことは判断材料が無いということなので、
 * 呼び出し側（`decide.ts`）がフェイルオープンに倒せるよう `null` を返す。
 */

/** セグメントが 1 つ以上のドット区切り非負整数のみを受け付ける */
const VERSION_PATTERN = /^\d+(?:\.\d+)*$/

/** 比較で 0 埋めする最小セグメント数（major.minor.patch） */
const MIN_SEGMENTS = 3

/**
 * 版文字列を数値配列にする。比較不能なら `null`。
 *
 * `'1.2'` → `[1, 2, 0]` のように `MIN_SEGMENTS` まで 0 で埋めるので、
 * セグメント数の違う版どうしをそのまま比較できる。
 */
export function parseVersion(version: string | null | undefined): number[] | null {
  if (typeof version !== 'string') return null

  const trimmed = version.trim()
  if (!VERSION_PATTERN.test(trimmed)) return null

  const segments = trimmed.split('.').map(Number)
  // 桁あふれ（Number.MAX_SAFE_INTEGER 超え）は比較の意味が壊れるので拒否する
  if (segments.some((n) => !Number.isSafeInteger(n))) return null

  while (segments.length < MIN_SEGMENTS) segments.push(0)
  return segments
}

/**
 * `a` と `b` を比較する。`a > b` なら正、`a < b` なら負、等しければ 0。
 * **どちらかが読めなければ `null`**（「等しい」ではない）。
 *
 * `'1.10.0'` > `'1.9.0'` になること（文字列比較では逆になる）が要点。
 */
export function compareVersions(
  a: string | null | undefined,
  b: string | null | undefined
): number | null {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (left === null || right === null) return null

  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

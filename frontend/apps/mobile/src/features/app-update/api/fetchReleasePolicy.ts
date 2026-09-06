import type { AppPlatform, ReleasePolicy } from '../model/types'

/**
 * 方針を 1 行引く問い合わせ。**実際の supabase-js 呼び出しは
 * `releasePolicyQuery.ts` 側**にあり、ここは結果の形だけを契約にする。
 *
 * こう分けている理由は 2 つ:
 *
 * 1. **テストに本物のクライアントが要らなくなる。** 必要なのは
 *    「`{ data, error }` を返す何か」だけなので、フェイクが 1 行で書ける。
 * 2. `SupabaseClient<Database>` を構造的部分型で受けると、TypeScript が
 *    **TS2589（Type instantiation is excessively deep）** を出す。
 *    postgrest のビルダー型が深く、代入可能性の検査が発散するため。
 */
export type ReleasePolicyQueryResult = { data: unknown; error: unknown }
export type ReleasePolicyQuery = (platform: AppPlatform) => PromiseLike<ReleasePolicyQueryResult>

/**
 * 応答を待つ上限。
 *
 * **待ち続けてはいけない。** 判定はアプリの起動直後に走るので、
 * 応答が返らないネットワーク（キャプティブポータル・機内モード直後・
 * 圏内外の境目）でここが宙吊りになると、後段の処理が永久に待つ形になりうる。
 * 5 秒で諦めて「方針は取得できなかった」= 何も出さない、に倒す。
 */
const DEFAULT_TIMEOUT_MS = 5000

/**
 * アップデート方針を 1 行取得する。**失敗は例外ではなく `null` で返す。**
 *
 * ## なぜ supabase-js から直接引くのか
 *
 * `.claude/rules/supabase-first.md` の判断順で第 1 段に収まる（RLS で
 * `anon` に SELECT を許した 1 行を読むだけ）。Edge Function を挟むと
 * **アプリの起動可否が関数のコールドスタートに依存する**ようになる。
 *
 * ## なぜフォールバックが許されるのか
 *
 * `.claude/rules/error-handling.md` の許容条件をすべて満たすため:
 * 意図的な設計判断であり、必ずログに残し、既定値（何も出さない）が安全側で、
 * ユーザーの操作結果に影響しない。**逆に投げるとアプリが起動できなくなる。**
 */
export async function fetchReleasePolicy(
  query: ReleasePolicyQuery,
  platform: AppPlatform,
  options: { timeoutMs?: number } = {}
): Promise<ReleasePolicy | null> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const pending = query(platform)

    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), timeoutMs)
    })

    const outcome = await Promise.race([pending, timeout])

    if (outcome === 'timeout') {
      console.error('App update policy fetch timed out:', { platform, timeoutMs })
      return null
    }

    const { data, error } = outcome
    if (error) {
      console.error('Failed to fetch app update policy:', { platform, error })
      return null
    }

    // 行が無いのは正常（方針未設定 = 何も出さない）。エラーとして騒がない。
    if (data == null) return null

    return toReleasePolicy(data, platform)
  } catch (error: unknown) {
    console.error('Failed to fetch app update policy:', { platform, error })
    return null
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * 行を検証しながら写す。**列が 1 つでも欠けていたら採用しない。**
 *
 * 欠けた値を空文字などで埋めると、`decide.ts` がそれを「読めない版」ではなく
 * 「有効な値」として扱ってしまう経路ができる。ここで落としておけば、後段は
 * 「方針が無い」= フェイルオープンに一本化される。
 */
function toReleasePolicy(row: unknown, platform: AppPlatform): ReleasePolicy | null {
  if (typeof row !== 'object' || row === null) {
    console.error('App update policy row is not an object:', { platform })
    return null
  }

  const record = row as Record<string, unknown>
  const minimumVersion = record.minimum_version
  const latestVersion = record.latest_version
  const storeUrl = record.store_url

  if (
    typeof minimumVersion !== 'string' ||
    typeof latestVersion !== 'string' ||
    typeof storeUrl !== 'string'
  ) {
    console.error('App update policy row is missing required columns:', {
      platform,
      keys: Object.keys(record),
    })
    return null
  }

  return {
    platform,
    minimumVersion,
    latestVersion,
    storeUrl,
    releaseNotes: toReleaseNotes(record.release_notes),
  }
}

/** jsonb は任意の形が入りうるので、`Record<string, string>` に絞れなければ null */
function toReleaseNotes(value: unknown): Record<string, string> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string'
  )
  return entries.length > 0 ? Object.fromEntries(entries) : null
}

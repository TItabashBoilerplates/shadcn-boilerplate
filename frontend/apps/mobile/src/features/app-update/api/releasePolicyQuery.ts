import { supabase } from '@/shared/lib/supabase'
import type { AppPlatform } from '../model/types'
import type { ReleasePolicyQuery } from './fetchReleasePolicy'

/** RLS で `anon` / `authenticated` に SELECT だけ許してある（書き込みポリシーは無い） */
const TABLE = 'app_release_policies'
const COLUMNS = 'platform, minimum_version, latest_version, store_url, release_notes'

/**
 * 実際の supabase-js 呼び出し。**この 1 か所だけが本物のクライアントに触れる。**
 *
 * `.claude/rules/supabase-first.md` の判断順で第 1 段（supabase-js から直接読む）。
 * Edge Function を挟むと**アプリの起動可否が関数のコールドスタートに依存する**。
 *
 * `{ error }` の判定・タイムアウト・行の検証はすべて `fetchReleasePolicy` が行う。
 * ここは問い合わせを組み立てるだけで、**判断も握りつぶしもしない**。
 */
export const releasePolicyQuery: ReleasePolicyQuery = (platform: AppPlatform) =>
  supabase.from(TABLE).select(COLUMNS).eq('platform', platform).maybeSingle()

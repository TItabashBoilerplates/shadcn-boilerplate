import { getSupabase } from '@workspace/client-supabase/native'

/**
 * Mobile 用 Supabase クライアント（シングルトン）
 *
 * `@workspace/client-supabase/native` が **セッション永続化に必要な設定**をすでに
 * 持っている:
 *
 * - `storage` … AsyncStorage。**渡さないと起動のたびにログインし直しになる**
 * - `autoRefreshToken: true`
 * - `persistSession: true`
 * - `detectSessionInUrl: false` … RN に URL コールバックは無い
 *
 * より強い保護が要るなら `expo-secure-store` に載せ替える。ただし SecureStore は
 * 1 項目あたり 2048 バイト制限があり、セッション JSON がそれを超えることがあるため、
 * 公式例のように「鍵だけ SecureStore + 本体は暗号化して AsyncStorage」の構成にすること。
 */
export const supabase = getSupabase()

import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Tables } from '@workspace/types/schema'

/**
 * ユーザーエンティティの型定義（Web / Mobile / Desktop 共有の正本）
 *
 * ## この 2 つを分けている理由
 *
 * - `AuthUser` … Supabase Auth のセッション由来。認証されているか、メール確認済みか。
 * - `User`     … `public.users` テーブル由来。表示名などのプロフィール。
 *
 * サインアップ直後は「`AuthUser` はあるが `User` の行はまだ無い」という状態が実際に起こる。
 * 1 つの型にまとめるとこれを表現できず、`user` が null なだけなのか未認証なのかが判別できない。
 */

/**
 * users テーブルのユーザー情報。
 *
 * **必ず生成物 `Tables<'users'>` から導出する。手書きしない。**
 * 手書きするとマイグレーションに追従せず、列を消しても型が残って
 * 型チェックが通ったまま実行時に undefined になる（実際に mobile 側が
 * DB に無い `email` / `avatarUrl` を定義していた）。
 */
export type User = Tables<'users'>

/**
 * 認証ユーザー（Supabase Auth）。
 *
 * `SupabaseUser` をそのまま公開すると `user_metadata` のような
 * **誰でも書き換えられる領域**まで UI から触れてしまうため、必要な項目だけに絞る。
 */
export interface AuthUser {
  id: string
  email: string | undefined
  emailConfirmedAt: Date | null
  createdAt: Date
}

/**
 * Supabase Auth のユーザーを `AuthUser` へ変換する。
 *
 * **プロフィール項目（表示名・アバター）を `user_metadata` から作らないこと。**
 * `user_metadata` はクライアントから更新できる領域で、`users` テーブルとは同期しない。
 * ここから表示名を作ると「変更したのに反映されない」不整合になる。
 * 表示名が要るなら `users` テーブル（= `User`）を読む。
 */
export function toAuthUser(supabaseUser: SupabaseUser): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    emailConfirmedAt: supabaseUser.email_confirmed_at
      ? new Date(supabaseUser.email_confirmed_at)
      : null,
    createdAt: new Date(supabaseUser.created_at),
  }
}

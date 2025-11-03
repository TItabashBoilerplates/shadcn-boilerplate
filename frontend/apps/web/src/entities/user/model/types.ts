import type { Tables } from '@workspace/types/schema'

/**
 * Supabase general_users テーブルの型
 */
export type User = Tables<'general_users'>

/**
 * Supabase general_user_profiles テーブルの型
 */
export type UserProfile = Tables<'general_user_profiles'>

/**
 * ユーザーとプロフィールを結合した型
 */
export interface UserWithProfile {
  user: User
  profile: UserProfile | null
}

/**
 * 認証ユーザー情報（Supabase Auth）
 */
export interface AuthUser {
  id: string
  email: string | undefined
  emailConfirmedAt: Date | null
  createdAt: Date
}

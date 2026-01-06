import type { Tables } from '@workspace/types/schema'

/**
 * Supabase users テーブルの型
 */
export type User = Tables<'users'>

/**
 * Supabase user_profiles テーブルの型
 */
export type UserProfile = Tables<'user_profiles'>

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

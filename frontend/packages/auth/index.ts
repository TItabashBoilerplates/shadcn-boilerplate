/**
 * @workspace/auth - 認証ライブラリ
 *
 * Supabase認証をZustandで管理するための共通パッケージ
 *
 * @packageDocumentation
 */

// Hooks
export { useAuth, useRequireAuth } from './hooks'
// Providers
export { AuthProvider } from './providers/AuthProvider'
export type { AuthState } from './store/authStore'
// Store
export { useAuthStore } from './store/authStore'

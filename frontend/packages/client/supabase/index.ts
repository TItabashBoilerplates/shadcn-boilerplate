/**
 * Supabase クライアント - Public API
 *
 * Next.js App Router + Supabase SSR統合パッケージ
 *
 * @packageDocumentation
 */

// Client Components用
export { createClient as createBrowserClient } from './client'

// Server Components/Actions/Route Handlers用
export { createClient as createServerClient } from './server'

// Middleware用
export { updateSession } from './middleware'

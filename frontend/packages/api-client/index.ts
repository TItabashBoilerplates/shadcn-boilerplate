/**
 * @workspace/api-client
 *
 * backend-py (FastAPI) の型安全な API クライアント
 *
 * @example
 * ```typescript
 * // 基本的な fetch クライアント
 * import { createBackendClient } from '@workspace/api-client'
 *
 * const client = createBackendClient({ accessToken: session.access_token })
 * const { data, error } = await client.GET('/healthcheck')
 *
 * // TanStack Query 統合
 * import { createBackendQueryClient } from '@workspace/api-client'
 *
 * const $api = createBackendQueryClient({ accessToken })
 * const { data, isLoading } = $api.useQuery('get', '/healthcheck')
 * ```
 */

// Client exports
export { type BackendClient, type BackendClientOptions, createBackendClient } from './src/client'

// Query exports
export {
  type BackendQueryClient,
  type BackendQueryClientOptions,
  createBackendQueryClient,
} from './src/query'

// Type exports
export type { paths } from './src/schema'

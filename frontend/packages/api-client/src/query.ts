/**
 * Backend API クライアント - TanStack Query 統合 (openapi-react-query)
 *
 * @module @workspace/api-client/query
 */

import createFetchClient, { type ClientOptions } from 'openapi-fetch'
import createClient from 'openapi-react-query'
import type { paths } from './schema'

/**
 * クエリクライアントのオプション
 */
export interface BackendQueryClientOptions {
  /** API のベース URL */
  baseUrl?: string
  /** 認証用アクセストークン */
  accessToken?: string
  /** カスタム fetch 関数 */
  fetch?: typeof fetch
}

/**
 * TanStack Query 統合済みのバックエンド API クライアントを作成
 *
 * @example
 * ```tsx
 * // クライアントの作成
 * const $api = createBackendQueryClient({ accessToken: session.access_token })
 *
 * // useQuery の使用
 * function UserInfo() {
 *   const { data, isLoading, error } = $api.useQuery('get', '/')
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *
 *   return <div>Welcome, {data?.message}</div>
 * }
 *
 * // useMutation の使用
 * function ChatForm() {
 *   const mutation = $api.useMutation('post', '/api/chat')
 *
 *   const handleSubmit = (message: string) => {
 *     mutation.mutate({
 *       body: { message, chat_room_id: 'room-1' }
 *     })
 *   }
 *
 *   return (
 *     <button
 *       onClick={() => handleSubmit('Hello')}
 *       disabled={mutation.isPending}
 *     >
 *       Send
 *     </button>
 *   )
 * }
 * ```
 */
export function createBackendQueryClient(options?: BackendQueryClientOptions) {
  const baseUrl =
    options?.baseUrl ?? process.env.NEXT_PUBLIC_BACKEND_PY_URL ?? 'http://127.0.0.1:4040'

  const clientOptions: ClientOptions = {
    baseUrl,
  }

  // カスタム fetch がある場合は設定
  if (options?.fetch) {
    clientOptions.fetch = options.fetch
  }

  const fetchClient = createFetchClient<paths>(clientOptions)

  // 認証ヘッダーを設定するミドルウェア
  if (options?.accessToken) {
    fetchClient.use({
      async onRequest({ request }) {
        request.headers.set('Authorization', `Bearer ${options.accessToken}`)
        return request
      },
    })
  }

  return createClient(fetchClient)
}

// 型のエクスポート
export type BackendQueryClient = ReturnType<typeof createBackendQueryClient>

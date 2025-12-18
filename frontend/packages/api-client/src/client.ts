/**
 * Backend API クライアント (openapi-fetch)
 *
 * @module @workspace/api-client/client
 */

import createClient, { type ClientOptions } from 'openapi-fetch'
import type { paths } from './schema'

/**
 * バックエンドクライアントのオプション
 */
export interface BackendClientOptions {
  /** API のベース URL */
  baseUrl?: string
  /** 認証用アクセストークン */
  accessToken?: string
  /** カスタム fetch 関数 */
  fetch?: typeof fetch
}

/**
 * バックエンド API クライアントを作成
 *
 * @example
 * ```typescript
 * // 基本的な使用方法
 * const client = createBackendClient()
 * const { data, error } = await client.GET('/healthcheck')
 *
 * // 認証付きリクエスト
 * const client = createBackendClient({ accessToken: session.access_token })
 * const { data } = await client.GET('/')
 *
 * // POST リクエスト
 * const { data } = await client.POST('/api/chat', {
 *   body: { message: 'Hello' }
 * })
 * ```
 */
export function createBackendClient(options?: BackendClientOptions) {
  const baseUrl =
    options?.baseUrl ?? process.env.NEXT_PUBLIC_BACKEND_PY_URL ?? 'http://127.0.0.1:4040'

  const clientOptions: ClientOptions = {
    baseUrl,
  }

  // カスタム fetch がある場合は設定
  if (options?.fetch) {
    clientOptions.fetch = options.fetch
  }

  const client = createClient<paths>(clientOptions)

  // 認証ヘッダーを設定するミドルウェア
  if (options?.accessToken) {
    client.use({
      async onRequest({ request }) {
        request.headers.set('Authorization', `Bearer ${options.accessToken}`)
        return request
      },
    })
  }

  return client
}

// 型のエクスポート
export type { paths }
export type BackendClient = ReturnType<typeof createBackendClient>

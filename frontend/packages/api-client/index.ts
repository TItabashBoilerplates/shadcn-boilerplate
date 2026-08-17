/**
 * @workspace/api-client
 *
 * backend-py (FastAPI) の型安全な API クライアント
 *
 * @example
 * ```typescript
 * // クライアント設定
 * import { client } from '@workspace/api-client'
 *
 * client.setConfig({
 *   baseUrl: process.env.NEXT_PUBLIC_BACKEND_PY_URL,
 *   headers: { Authorization: `Bearer ${accessToken}` },
 * })
 *
 * // SDK 関数の直接使用
 * import { getHealthcheck, postApiChat } from '@workspace/api-client'
 *
 * const { data, error } = await getHealthcheck()
 * const { data: chatData } = await postApiChat({ body: { message: 'Hello' } })
 *
 * // TanStack Query hooks の使用
 * import { getHealthcheckOptions, postApiChatMutation } from '@workspace/api-client'
 *
 * // useQuery
 * const { data, isLoading } = useQuery(getHealthcheckOptions())
 *
 * // useMutation
 * const mutation = useMutation(postApiChatMutation())
 * mutation.mutate({ body: { message: 'Hello' } })
 * ```
 */

// Client configuration
//
// Hey API はクライアント実装を `src/generated/client/` へ**バンドル出力**するため、
// ランタイムの `@hey-api/client-fetch` から `client` を取り出すことはできない
// （同パッケージは `client` を named export していない）。
// 生成物の `client.gen.ts` が `createClient()` 済みのインスタンスを持っているので、
// Public API はそちらを再 export する。
export { client } from './src/generated/client.gen'

// SDK functions
export * from './src/generated/sdk.gen'
// Types
export * from './src/generated/types.gen'

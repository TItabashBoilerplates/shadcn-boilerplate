/**
 * Hey API ランタイム設定
 *
 * openapi-ts の runtimeConfigPath によって自動的に読み込まれる。
 *
 * ## baseUrl の決め方
 *
 * web は backend-py と **同じ Vercel project の別 service** として同一オリジンに載る
 * （リポジトリルートの `vercel.json` の `services`）。したがって解決順は次のとおり:
 *
 * 1. `NEXT_PUBLIC_BACKEND_PY_URL` … 明示指定が最優先。**別オリジンから叩く経路**
 *    （デスクトップ / モバイル / ローカル開発）はここでしか解決できない
 * 2. `BACKEND_PY_URL` … サーバー側のみ。Vercel の **service binding** が注入する
 *    絶対 URL で、deployment ごとに正しい相手（preview は同じ preview の api）へ向く。
 *    公開経路を通らないので CORS も firewall も挟まらない
 * 3. 相対 URL（`''`）… ブラウザは同一オリジンなので `/api/...` がそのまま届く
 *
 * ⚠️ binding は **runtime 専用**でビルド時には解決しない（Vercel 公式）。
 *    そのため `NEXT_PUBLIC_*` に焼き込むことはできず、ブラウザ側は相対 URL を使う。
 */
import type { CreateClientConfig } from './generated/client.gen'

/** devenv のローカル backend（別ポートなので相対では届かない） */
const LOCAL_FALLBACK = 'http://127.0.0.1:4040'

export function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_PY_URL
  if (explicit) return explicit

  if (typeof window === 'undefined') {
    return process.env.BACKEND_PY_URL || LOCAL_FALLBACK
  }

  return ''
}

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: resolveBaseUrl(),
})

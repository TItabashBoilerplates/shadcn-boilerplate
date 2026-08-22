#!/usr/bin/env bun
/**
 * マイグレーションの接続先（`POSTGRES_URL`）が、その実行環境で本当に使えるものかを判定する。
 *
 * ## なぜ要るか
 *
 * Supabase の DB には接続経路が複数あり、**migration に使ってよいものは限られる**
 * （https://supabase.com/docs/guides/database/connecting-to-postgres）。
 *
 * | 経路 | Host:Port | IP | migration に使えるか |
 * |---|---|---|---|
 * | 直結 | `db.<ref>.supabase.co:5432` | **IPv6**（IPv4 add-on 購入時のみ IPv4） | IPv6 が使える実行環境なら可 |
 * | Shared pooler / session | `aws-<n>-<region>.pooler.supabase.com:5432` | **IPv4**（全プラン） | **可（CI の既定）** |
 * | Shared pooler / transaction | `...pooler.supabase.com:6543` | IPv4 | **不可**（prepared statement 非対応） |
 * | Dedicated pooler | `db.<ref>.supabase.co:6543` | IPv6 / IPv4 add-on | **不可**（transaction モードのみ） |
 *
 * 間違えたときの壊れ方が厄介で、
 *   - **直結 × GitHub Actions**: runner は IPv4 のみなので `ENETUNREACH`。
 *     開発者のマシンからは繋がるためローカルでは一切再現しない
 *     （Supabase 公式も IPv4 only のサービスとして GitHub Actions を名指ししている）。
 *   - **transaction pooler**: 接続はできるのに migration だけが prepared statement で落ちる。
 *
 * どちらも lint / 型チェック / ローカルテストを全部通過するので、接続先を静的に検査するしかない。
 *
 * ## 使い方（CLI）
 *
 *   bun run scripts/migration-endpoint.ts   # 環境変数を読んで判定。NG なら exit 1
 *
 * 読む環境変数:
 *   - `MIGRATE_POSTGRES_URL` / `POSTGRES_URL` … 接続先（値は絶対に出力しない）
 *   - `ENV`                     … `local` 以外ならリモート適用の意図とみなす
 *   - `GITHUB_ACTIONS`          … `true` なら IPv4 のみの実行環境とみなす
 *   - `MIGRATE_ALLOW_DIRECT_DB` … `1` なら直結を許可（IPv4 add-on を購入済みの project 用）
 */

export type EndpointKind = 'local' | 'session-pooler' | 'transaction-pooler' | 'direct' | 'unknown'

export interface EndpointInfo {
  kind: EndpointKind
  host: string
  port: number
}

export interface CheckOptions {
  /** リモート（dev / staging / production）へ適用する意図があるか */
  remote: boolean
  /** 実行環境が IPv4 のみか（GitHub-hosted runner = true） */
  ipv4Only: boolean
  /** IPv4 add-on 前提で直結を明示的に許可するか */
  allowDirect: boolean
}

export interface Verdict {
  ok: boolean
  kind: EndpointKind
  /** `host:port`。**認証情報は含めない**（ログに出るため） */
  target: string
  reason?: string
  hint?: string
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', 'host.docker.internal'])
const SHARED_POOLER_SUFFIX = '.pooler.supabase.com'
const SESSION_PORT = 5432
const TRANSACTION_PORT = 6543

/** URL からホストとポートだけを取り出す（パスワードには触らない） */
function parseHostPort(url: string): { host: string; port: number } | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^\[|\]$/g, '')
    if (host) {
      return { host, port: parsed.port ? Number(parsed.port) : SESSION_PORT }
    }
  } catch {
    // URL として解釈できない指定（libpq 形式など）は下の正規表現で拾う
  }
  const matched = /@\[?([^/?@\]]+?)\]?(?::(\d+))?(?:[/?]|$)/.exec(url)
  if (!matched?.[1]) return null
  return { host: matched[1], port: matched[2] ? Number(matched[2]) : SESSION_PORT }
}

export function classifyEndpoint(url: string): EndpointInfo {
  const parsed = parseHostPort(url)
  if (!parsed) return { kind: 'unknown', host: '', port: 0 }
  const { host, port } = parsed

  if (LOCAL_HOSTS.has(host)) return { kind: 'local', host, port }

  // Shared pooler(Supavisor) は 5432=session / 6543=transaction の 2 つだけ。
  if (host.endsWith(SHARED_POOLER_SUFFIX)) {
    return { kind: port === SESSION_PORT ? 'session-pooler' : 'transaction-pooler', host, port }
  }

  // 同じホストでも 6543 は Dedicated pooler（transaction モードのみ）。
  if (/^db\.[a-z0-9]+\.supabase\.co$/.test(host)) {
    return { kind: port === TRANSACTION_PORT ? 'transaction-pooler' : 'direct', host, port }
  }

  return { kind: 'unknown', host, port }
}

export function checkMigrationEndpoint(url: string | undefined, opts: CheckOptions): Verdict {
  if (!url) {
    return {
      ok: false,
      kind: 'unknown',
      target: '',
      reason: '接続先が未設定です（MIGRATE_POSTGRES_URL / POSTGRES_URL のいずれも空）。',
      hint: 'GitHub Environment に POSTGRES_URL secret が同期されているか（Doppler → GitHub の sync）を確認してください。',
    }
  }

  const { kind, host, port } = classifyEndpoint(url)
  const target = host ? `${host}:${port}` : ''

  if (!host) {
    return {
      ok: false,
      kind,
      target,
      reason: '接続文字列からホストを解釈できませんでした。',
      hint: 'postgresql://<user>:<password>@<host>:<port>/<db> の形式か確認してください（パスワードに記号が入る場合は percent-encoding が必要）。',
    }
  }

  if (kind === 'transaction-pooler') {
    return {
      ok: false,
      kind,
      target,
      reason:
        'transaction モードの pooler は prepared statement をサポートしないため、migration には使えません。',
      hint: `session モード（同じホストの ${SESSION_PORT} 番）を使ってください: <region>${SHARED_POOLER_SUFFIX}:${SESSION_PORT}`,
    }
  }

  if (kind === 'local' && opts.remote) {
    return {
      ok: false,
      kind,
      target,
      reason: 'リモート適用の指定なのに接続先がローカル値です。',
      hint: '接続先は MIGRATE_POSTGRES_URL で渡してください（devenv の enterShell が env/*/.env.local の POSTGRES_URL で上書きするため）。',
    }
  }

  if (kind === 'direct' && opts.ipv4Only && !opts.allowDirect) {
    return {
      ok: false,
      kind,
      target,
      reason:
        '直結エンドポイントは IPv6 のみ（IPv4 add-on 未購入時）で、この実行環境は IPv4 のみです。',
      hint: `session モードの pooler（*${SHARED_POOLER_SUFFIX}:${SESSION_PORT}）を POSTGRES_URL に設定してください。IPv4 add-on を購入済みなら MIGRATE_ALLOW_DIRECT_DB=1 で直結を許可できます。`,
    }
  }

  return { ok: true, kind, target }
}

/** CLI 実行時に環境変数から判定条件を組み立てる */
export function optionsFromEnv(env: Record<string, string | undefined>): CheckOptions {
  return {
    remote: Boolean(env.MIGRATE_POSTGRES_URL) || (env.ENV ?? 'local') !== 'local',
    ipv4Only: env.GITHUB_ACTIONS === 'true',
    allowDirect: env.MIGRATE_ALLOW_DIRECT_DB === '1',
  }
}

const KIND_LABEL: Record<EndpointKind, string> = {
  local: 'ローカル DB',
  'session-pooler': 'Supavisor session pooler (IPv4)',
  'transaction-pooler': 'transaction pooler',
  direct: '直結 (IPv6)',
  unknown: '判別できない接続先',
}

function main(): void {
  const env = process.env
  const verdict = checkMigrationEndpoint(
    env.MIGRATE_POSTGRES_URL || env.POSTGRES_URL,
    optionsFromEnv(env)
  )

  if (!verdict.ok) {
    console.error(`✗ ${verdict.reason}`)
    if (verdict.target) console.error(`  接続先: ${verdict.target}（${KIND_LABEL[verdict.kind]}）`)
    if (verdict.hint) console.error(`  → ${verdict.hint}`)
    console.error('  参考: https://supabase.com/docs/guides/database/connecting-to-postgres')
    process.exit(1)
  }

  console.log(`✓ 接続先: ${verdict.target}（${KIND_LABEL[verdict.kind]}）`)
}

if (import.meta.main) main()

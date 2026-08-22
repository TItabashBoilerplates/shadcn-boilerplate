/**
 * マイグレーション接続先の**判定ロジック**を検証する。
 *
 * ここを固定する理由: 接続先の良し悪しは「繋いでみるまで分からない」形で失敗する。
 *   - GitHub-hosted runner は **IPv4 のみ**。Supabase の直結エンドポイント
 *     (`db.<ref>.supabase.co`) は **IPv6**（IPv4 add-on を買わない限り）なので、
 *     CI からは `ENETUNREACH` になる。ローカルの開発者マシンでは繋がるため再現しない。
 *   - transaction モードの pooler (`:6543`) は **prepared statement を持たない**。
 *     drizzle-kit / postgres-js は既定で prepared statement を使うので、
 *     「繋がるのに migration だけ落ちる」という分かりにくい壊れ方をする。
 *
 * どちらも lint / 型チェック / ローカルのテストをすべて通過してしまうので、
 * 接続先そのものを静的に検査するしかない。
 *
 * 実装: `drizzle/scripts/migration-endpoint.ts`
 * 出典: https://supabase.com/docs/guides/database/connecting-to-postgres
 */
import { describe, expect, test } from 'bun:test'
import { checkMigrationEndpoint, classifyEndpoint } from './migration-endpoint'

const SESSION_POOLER =
  'postgresql://postgres.abcdefghijklmnopqrst:s3cr3t@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
const TRANSACTION_POOLER =
  'postgresql://postgres.abcdefghijklmnopqrst:s3cr3t@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'
const DIRECT = 'postgresql://postgres:s3cr3t@db.abcdefghijklmnopqrst.supabase.co:5432/postgres'
const DEDICATED_POOLER =
  'postgresql://postgres:s3cr3t@db.abcdefghijklmnopqrst.supabase.co:6543/postgres'
const LOCAL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const CI = { remote: true, ipv4Only: true, allowDirect: false }

describe('classifyEndpoint', () => {
  test('shared pooler の 5432 は session モード', () => {
    expect(classifyEndpoint(SESSION_POOLER)).toEqual({
      kind: 'session-pooler',
      host: 'aws-0-ap-northeast-1.pooler.supabase.com',
      port: 5432,
    })
  })

  test('shared pooler の 6543 は transaction モード', () => {
    expect(classifyEndpoint(TRANSACTION_POOLER).kind).toBe('transaction-pooler')
  })

  test('db.<ref>.supabase.co:5432 は直結', () => {
    expect(classifyEndpoint(DIRECT).kind).toBe('direct')
  })

  test('db.<ref>.supabase.co:6543 は dedicated pooler（transaction モードのみ）', () => {
    expect(classifyEndpoint(DEDICATED_POOLER).kind).toBe('transaction-pooler')
  })

  test('ローカルは local', () => {
    expect(classifyEndpoint(LOCAL)).toEqual({ kind: 'local', host: '127.0.0.1', port: 54322 })
    expect(classifyEndpoint('postgresql://postgres:postgres@localhost/postgres').kind).toBe('local')
  })

  test('ポート省略時は 5432 とみなす', () => {
    expect(classifyEndpoint(DIRECT.replace(':5432', '')).port).toBe(5432)
  })

  test('クエリ文字列が付いていても判定できる', () => {
    expect(classifyEndpoint(`${SESSION_POOLER}?sslmode=require`).kind).toBe('session-pooler')
  })

  test('自前 Postgres は unknown（禁止はしない）', () => {
    expect(classifyEndpoint('postgresql://u:p@db.internal.example.com:5432/app').kind).toBe(
      'unknown'
    )
  })
})

describe('checkMigrationEndpoint', () => {
  test('CI で session pooler は通る', () => {
    const v = checkMigrationEndpoint(SESSION_POOLER, CI)
    expect(v.ok).toBe(true)
    expect(v.target).toBe('aws-0-ap-northeast-1.pooler.supabase.com:5432')
  })

  test('transaction pooler は CI でもローカルでも落とす（prepared statement 非対応）', () => {
    for (const opts of [CI, { remote: true, ipv4Only: false, allowDirect: true }]) {
      const v = checkMigrationEndpoint(TRANSACTION_POOLER, opts)
      expect(v.ok).toBe(false)
      expect(v.reason).toContain('transaction')
      expect(v.hint).toContain('5432')
    }
  })

  test('CI（IPv4 のみ）で直結は落とす', () => {
    const v = checkMigrationEndpoint(DIRECT, CI)
    expect(v.ok).toBe(false)
    expect(v.reason).toContain('IPv6')
    expect(v.hint).toContain('MIGRATE_ALLOW_DIRECT_DB')
  })

  test('IPv4 add-on を明示したら CI でも直結を許す', () => {
    expect(checkMigrationEndpoint(DIRECT, { ...CI, allowDirect: true }).ok).toBe(true)
  })

  test('IPv6 が使える実行環境（開発者マシン）なら直結は通る', () => {
    expect(
      checkMigrationEndpoint(DIRECT, { remote: true, ipv4Only: false, allowDirect: false }).ok
    ).toBe(true)
  })

  test('リモート適用の意図があるのにローカル接続先なら落とす', () => {
    const v = checkMigrationEndpoint(LOCAL, { remote: true, ipv4Only: false, allowDirect: false })
    expect(v.ok).toBe(false)
    expect(v.reason).toContain('ローカル')
  })

  test('ローカル適用ならローカル接続先で通る', () => {
    expect(
      checkMigrationEndpoint(LOCAL, { remote: false, ipv4Only: false, allowDirect: false }).ok
    ).toBe(true)
  })

  test('未設定は落とす', () => {
    for (const url of [undefined, '']) {
      expect(checkMigrationEndpoint(url, CI).ok).toBe(false)
    }
  })

  test('判定結果にパスワードを含めない', () => {
    const v = checkMigrationEndpoint(SESSION_POOLER, CI)
    expect(JSON.stringify(v)).not.toContain('s3cr3t')
  })

  test('自前 Postgres は通す（boilerplate 派生先の自由度を残す）', () => {
    expect(checkMigrationEndpoint('postgresql://u:p@db.internal.example.com:5432/app', CI).ok).toBe(
      true
    )
  })
})

import type { User as SupabaseUser } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { toAuthUser } from './types'

/**
 * ユーザーエンティティ型の共有化に対する回帰テスト。
 *
 * ## なぜこのテストが要るか
 *
 * 以前は web / mobile / packages/app の 3 か所に別々の `User` 定義があり、
 * **mobile と packages/app は DB に存在しないカラム（`email` / `avatarUrl` / `bio`）を
 * 勝手に定義していた**。`users` テーブルの実体は
 * `id` / `display_name` / `account_name` / `created_at` / `updated_at` のみである。
 *
 * 手書きの型は**マイグレーションに追従しない**（列を消しても型は残り、
 * 型チェックが通ったまま実行時に undefined になる）。したがって `User` は
 * 必ず生成物の `Tables<'users'>` から導出し、ここでその契約を固定する。
 */

function makeSupabaseUser(overrides: Partial<SupabaseUser> = {}): SupabaseUser {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-02T03:04:05.000Z',
    email: 'user@example.com',
    ...overrides,
  } as SupabaseUser
}

describe('toAuthUser', () => {
  it('Supabase Auth のユーザーを AuthUser へ変換する', () => {
    const authUser = toAuthUser(
      makeSupabaseUser({ email_confirmed_at: '2026-01-03T00:00:00.000Z' })
    )

    expect(authUser).toEqual({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'user@example.com',
      emailConfirmedAt: new Date('2026-01-03T00:00:00.000Z'),
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
    })
  })

  it('メール未確認なら emailConfirmedAt は null', () => {
    expect(toAuthUser(makeSupabaseUser()).emailConfirmedAt).toBeNull()
  })

  it('email が無いユーザー（電話番号認証等）でも落ちない', () => {
    expect(toAuthUser(makeSupabaseUser({ email: undefined })).email).toBeUndefined()
  })

  it('プロフィール項目（displayName / avatarUrl）を user_metadata から捏造しない', () => {
    // user_metadata は誰でも書き換えられる領域であり、DB の users テーブルとは別物。
    // ここから displayName を作ると「表示名を変えたのに反映されない」不整合になる。
    const authUser = toAuthUser(
      makeSupabaseUser({ user_metadata: { display_name: 'なりすまし', avatar_url: 'x' } })
    )

    expect(authUser).not.toHaveProperty('displayName')
    expect(authUser).not.toHaveProperty('avatarUrl')
  })
})

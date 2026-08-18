// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createAuthStorage } from './native'

/**
 * プリレンダー（Node）で Supabase クライアントが落ちないことの回帰テスト。
 *
 * ## 何を防いでいるか
 *
 * `apps/mobile` は `app.json` の `web.output: "static"` により、
 * **`expo export --platform web` で Expo Router が Node 上で HTML を事前生成**する。
 * そこには `window` が無い。
 *
 * 一方 Supabase クライアントは
 *
 *   1. `apps/mobile/src/shared/lib/supabase/index.ts` がモジュール束縛で生成し
 *   2. `persistSession: true` により **生成直後に保存済みセッションを読みにいき**
 *      （`_emitInitialSession` → `__loadSession` → `storage.getItem`）
 *   3. `@react-native-async-storage/async-storage` の **web 向けビルドは
 *      `window.localStorage` 実装**
 *
 * となっているため、プリレンダー時に `ReferenceError: window is not defined` で
 * ビルドが丸ごと失敗していた。
 *
 * **ネイティブ（iOS / Android）では `window` shim があるため再現せず**、
 * `ci:check` も mobile-web をビルドしないので、この検査が無いと誰も気づけない。
 *
 * このファイルは `@vitest-environment node` で **`window` が無い状態**を再現している
 * （既定の jsdom だと `window` が存在してしまい、検査にならない）。
 */

describe('createAuthStorage（プリレンダー環境）', () => {
  it('window が無い環境であることを前提にしている', () => {
    expect(typeof window).toBe('undefined')
  })

  it('window が無ければ window に触れないストレージを返す', async () => {
    const storage = createAuthStorage()

    // ここで throw したら、それがプリレンダーで起きていた事故そのもの
    await expect(storage.getItem('sb-access-token')).resolves.toBeNull()
    await expect(storage.setItem('sb-access-token', 'x')).resolves.toBeUndefined()
    await expect(storage.removeItem('sb-access-token')).resolves.toBeUndefined()
  })

  it('サーバー側では常にセッション無しとして振る舞う（書いても読めない）', async () => {
    const storage = createAuthStorage()

    await storage.setItem('k', 'v')

    // プリレンダーに跨るセッションを持たせない。持たせると生成した HTML に
    // ログイン状態が焼き込まれ、全ユーザーに配られる
    await expect(storage.getItem('k')).resolves.toBeNull()
  })
})

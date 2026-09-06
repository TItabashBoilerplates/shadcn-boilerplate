import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 推奨 / 強制アップデートの**配線と安全側の既定**が消えていないことを機械的に守る。
 *
 * ## なぜ静的検査が要るのか
 *
 * この機能は**平時に一度も発火しない**。`minimum_version` を上げるまで
 * `decideUpdateAction` は常に `none` を返し、画面は出ない。したがって
 *
 * - ゲートを `AppProvider` から外しても
 * - フェイルオープンをフェイルクローズに変えても
 * - `expo-constants` の版に差し替えても
 *
 * **アプリは普通に動き、ビルドも型も lint も Storybook も全部通る。**
 * 壊れていることが分かるのは、下限を上げた日に「誰にも届かない」か
 * 「全員が起動できない」かのどちらかが起きたときで、そのときには手遅れ。
 * `.claude/rules/store-review.md` §7 と同じ考え方でここに固定する。
 *
 * 判断ロジックそのものは `decide.test.ts` / `version.test.ts` が見ている。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(HERE, '../../../..')
const REPO_ROOT = resolve(APP_ROOT, '../../..')

function read(relativePath: string, root = APP_ROOT): string {
  const full = join(root, relativePath)
  expect(existsSync(full), `${relativePath} が存在しない`).toBe(true)
  return readFileSync(full, 'utf8')
}

/** 「この API は使わない」という注意書き自体を拾わないよう、コメントを除く */
function readCode(relativePath: string, root = APP_ROOT): string {
  return read(relativePath, root)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('ゲートの配線', () => {
  it('AppProvider が AppUpdateGate を描画している（外すと機能ごと消える）', () => {
    const provider = readCode('src/app/providers/AppProvider.tsx')
    expect(provider).toContain('AppUpdateGate')
    expect(provider).toMatch(/<AppUpdateGate>\s*\{children\}\s*<\/AppUpdateGate>/)
  })

  it('forced のときは children を描かず画面を差し替える（裏の画面を残さない）', () => {
    const gate = readCode('src/app/providers/AppUpdateGate.tsx')
    // 早期 return で UpdateRequiredScreen だけを返していること
    expect(gate).toMatch(/if\s*\(\s*decision\.action === 'forced'\s*\)\s*\{\s*return/)
    expect(gate).toContain('UpdateRequiredScreen')
  })

  it('recommended は children を残したまま重ねる（作業を止めない）', () => {
    const gate = readCode('src/app/providers/AppUpdateGate.tsx')
    expect(gate).toContain('UpdateAvailableNotice')
    expect(gate).toContain('{children}')
  })
})

describe('版の取得元', () => {
  // OTA を当てると expoConfig 側の版はバイナリとずれる（Expo 公式が明記）。
  // ここを取り違えると「更新したのに強制アップデートが解けない」になる。
  it('expo-application の nativeApplicationVersion を使っている', () => {
    const runtime = readCode('src/features/app-update/lib/runtime.ts')
    expect(runtime).toContain('nativeApplicationVersion')
    expect(runtime).toContain('expo-application')
  })

  it('expo-constants の expoConfig.version を判定に使っていない', () => {
    const feature = [
      'src/features/app-update/lib/runtime.ts',
      'src/features/app-update/model/useAppUpdate.ts',
      'src/features/app-update/model/decide.ts',
    ]
      .map((path) => readCode(path))
      .join('\n')

    expect(feature).not.toContain('expo-constants')
    expect(feature).not.toContain('expoConfig')
  })

  it('expo-application が依存に入っている', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.dependencies['expo-application']).toBeTruthy()
  })
})

describe('フェイルオープン（ブロックしないことの担保）', () => {
  // App Store 2.1(a) は "turn on your back-end service!" と明記している。
  // 方針の取得失敗でブロックする実装は、バックエンドが落ちた瞬間に
  // 審査担当者もユーザーもアプリを開けなくする。
  it('取得に失敗したら例外ではなく null を返す（throw しない）', () => {
    const api = readCode('src/features/app-update/api/fetchReleasePolicy.ts')
    expect(api).toContain('catch')
    expect(api).toContain('return null')
    expect(api).not.toMatch(/\bthrow\b/)
  })

  it('取得にタイムアウトがある（応答が返らない回線で起動を止めない）', () => {
    const api = readCode('src/features/app-update/api/fetchReleasePolicy.ts')
    expect(api).toContain('timeoutMs')
  })

  it('判定の初期値が none（判定が終わるまで待たない）', () => {
    const hook = readCode('src/features/app-update/model/useAppUpdate.ts')
    expect(hook).toMatch(/action:\s*'none'/)
    expect(hook).toContain('useState<UpdateDecision>(NO_UPDATE)')
  })

  it('フォアグラウンド復帰でも再判定する（起動しっぱなしの端末に届く）', () => {
    const hook = readCode('src/features/app-update/model/useAppUpdate.ts')
    expect(hook).toContain('AppState')
    expect(hook).toContain("'active'")
  })
})

describe('ストア誘導先', () => {
  it('DB の store_url は https 限定（CHECK 制約が残っている）', () => {
    const schema = read('drizzle/schema/app-release-policies.ts', REPO_ROOT)
    expect(schema).toContain('app_release_policies_store_url_check')
    expect(schema).toContain('^https://')
  })

  it('minimum_version が latest_version を超えられない（全員が詰む状態を作らせない）', () => {
    const schema = read('drizzle/schema/app-release-policies.ts', REPO_ROOT)
    expect(schema).toContain('app_release_policies_minimum_not_above_latest_check')
  })

  it('app_release_policies に書き込みポリシーが無い（誰でも全員をブロックできてしまう）', () => {
    const schema = read('drizzle/schema/app-release-policies.ts', REPO_ROOT)
    const policies = schema.match(/pgPolicy\(/g) ?? []
    expect(policies).toHaveLength(1)
    expect(schema).toContain("for: 'select'")
  })
})

describe('文言', () => {
  it('en / ja の appUpdate キー集合が一致している（片方だけ足す事故を防ぐ）', () => {
    const keysOf = (locale: 'en' | 'ja') => {
      const source = read(`src/shared/config/i18n/translations/${locale}.ts`)
      const block = source.match(/appUpdate:\s*\{([\s\S]*?)\n {2}\},/)
      expect(block, `${locale}.ts に appUpdate が無い`).toBeTruthy()
      return [...(block?.[1] ?? '').matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]).sort()
    }

    const en = keysOf('en')
    expect(en.length).toBeGreaterThan(0)
    expect(keysOf('ja')).toEqual(en)
  })
})

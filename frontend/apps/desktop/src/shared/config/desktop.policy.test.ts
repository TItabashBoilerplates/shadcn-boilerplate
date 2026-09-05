import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  LATEST_MANIFEST_PATH,
  productionSupabaseUrl,
  publicReleaseUrl,
} from '../../../../../../scripts/desktop/release-paths.mjs'

/**
 * デスクトップアプリの「壊れてもビルド・型・lint が通ってしまう」配線を機械的に守る。
 *
 * ここに並んでいるものの共通点は **静的検査でしか止まらない**こと:
 *
 * | 壊し方 | 気づける唯一のタイミング |
 * |---|---|
 * | updater の endpoint がズレる | **誰にも更新が届かない**（エラーも出ない） |
 * | 公開鍵が違う / 秘密鍵が変わる | 署名検証に落ちて更新が届かない |
 * | `createUpdaterArtifacts` の overlay を外す | latest.json が作れず、更新の来ない版を配る |
 * | version を 3 か所で揃え忘れる | 「同じ版」なので更新扱いにならない |
 * | 署名 env が無い | `tauri build` は**未署名のまま成功**し、配布して初めて分かる |
 * | Tauri の identity が雛形のまま | 「App」という名前と既定アイコンで配布される |
 *
 * ## `mode` による適用範囲
 *
 * `PROJECT.md` の `mode` が `boilerplate` の間は、**プロダクト固有の値（productName /
 * identifier / updater の endpoint と公開鍵 / `releases` バケット）が意図的に空**なので
 * 検査しない。`mode: product` にした時点で全部必須になる。
 * 配線そのもの（プラグインの有無・overlay・capability・version の一致）は常に検査する。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(HERE, '../../..')
const REPO_ROOT = resolve(APP_ROOT, '../../..')

function read(relativePath: string): string {
  const full = join(APP_ROOT, relativePath)
  expect(existsSync(full), `${relativePath} が存在しない`).toBe(true)
  return readFileSync(full, 'utf8')
}

function readRepo(relativePath: string): string {
  const full = join(REPO_ROOT, relativePath)
  expect(existsSync(full), `${relativePath} が存在しない`).toBe(true)
  return readFileSync(full, 'utf8')
}

/** `PROJECT.md` の frontmatter から `mode` だけを読む（YAML パーサを依存に足さない） */
function readProjectMode(): string {
  const matched = /^---\n([\s\S]*?)\n---/.exec(readRepo('PROJECT.md'))
  expect(matched, 'PROJECT.md は frontmatter で始まる').not.toBeNull()
  const mode = /^mode:\s*(\S+)/m.exec((matched as RegExpExecArray)[1])?.[1]
  expect(mode, 'PROJECT.md に mode がある').toBeTruthy()
  return mode as string
}

const isProduct = readProjectMode() === 'product'

const conf = JSON.parse(read('src-tauri/tauri.conf.json')) as {
  version: string
  productName: string
  identifier: string
  app: {
    windows: { title: string; label: string; dragDropEnabled?: boolean }[]
    security: { csp: string }
  }
  build: { devUrl: string }
  bundle: { createUpdaterArtifacts?: unknown; macOS?: { entitlements?: string } }
  plugins?: {
    updater?: { endpoints?: string[]; pubkey?: string; windows?: { installMode?: string } }
  }
}

const workflow = readRepo('.github/workflows/desktop-release.yml')

describe('Tauri の identity', () => {
  it('devUrl が Vite の固定ポートと一致する（ズレると起動時に真っ白）', () => {
    const port = /--port (\d+)/.exec(
      (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts.dev
    )?.[1]
    expect(port).toBeTruthy()
    expect(conf.build.devUrl).toBe(`http://localhost:${port}`)
  })

  it('capability の対象ウィンドウ label が実在する', () => {
    const capability = JSON.parse(read('src-tauri/capabilities/default.json')) as {
      windows: string[]
    }
    const labels = conf.app.windows.map((w) => w.label)
    for (const target of capability.windows) expect(labels).toContain(target)
  })

  it('CSP が IPC に必要なものを落としていない', () => {
    // これが欠けると invoke が無言で壊れる
    for (const required of ['ipc:', 'http://ipc.localhost']) {
      expect(conf.app.security.csp, `${required} が CSP に無い`).toContain(required)
    }
  })

  it.runIf(isProduct)('雛形の値（App / com.example.*）が残っていない', () => {
    // identifier はバンドル ID。配布後に変えるとインストール済みアプリと別物になる
    expect(conf.productName).not.toBe('App')
    expect(conf.identifier).not.toMatch(/com\.example/)
    expect(conf.app.windows[0]?.title).not.toBe('App')
  })
})

describe('配布（署名・公証・インストーラ）の配線', () => {
  it('プラットフォーム別 config が配布ターゲットを固定している', () => {
    // JSON Merge Patch では配列が丸ごと置換される（= ここが各 OS の確定値になる）
    const macos = JSON.parse(read('src-tauri/tauri.macos.conf.json')) as {
      bundle: { targets: string[] }
    }
    expect(macos.bundle.targets).toEqual(['app', 'dmg'])

    const windows = JSON.parse(read('src-tauri/tauri.windows.conf.json')) as {
      bundle: { targets: string[]; windows: { nsis: { installMode: string } } }
    }
    expect(windows.bundle.targets).toEqual(['nsis'])
    // 管理者権限なしで入る（Web 配布の個人ユーザー向け既定）
    expect(windows.bundle.windows.nsis.installMode).toBe('currentUser')
  })

  it('リリース workflow が署名 env とアップロードを配線している', () => {
    for (const required of [
      // これが欠けると「未署名のまま成功」した配布物が無言でできる
      'APPLE_CERTIFICATE',
      'APPLE_API_KEY_PATH',
      'stapler validate',
      'scripts/desktop/upload-release.mjs',
    ]) {
      expect(workflow, `desktop-release.yml に ${required} が無い`).toContain(required)
    }
  })

  it('Apple の署名シークレットを Doppler → Repository secrets へ写す経路がある', () => {
    const wire = readRepo('scripts/desktop/wire-signing-secrets.sh')
    for (const key of ['APPLE_CERTIFICATE', 'APPLE_API_KEY_P8', 'TAURI_SIGNING_PRIVATE_KEY']) {
      expect(wire, `wire-signing-secrets.sh に ${key} が無い`).toContain(key)
    }
  })
})

describe('自動更新（tauri-plugin-updater）の配線', () => {
  /**
   * 自動更新は**壊れていても何も起きない**（更新が来ないだけ。エラーも出ない）。
   * どれもビルド・型・lint は通るので、配線をここで固定する。
   */
  it('Windows はインストーラを黙って走らせる（passive: 進捗だけ出して質問しない）', () => {
    expect(conf.plugins?.updater?.windows?.installMode).toBe('passive')
  })

  it('署名付き payload の生成は CI の overlay だけで有効（ローカルの --build に秘密鍵を要求しない）', () => {
    expect(conf.bundle.createUpdaterArtifacts).toBeUndefined()
    const release = JSON.parse(read('src-tauri/tauri.release.conf.json')) as {
      bundle: { createUpdaterArtifacts: unknown }
    }
    expect(release.bundle.createUpdaterArtifacts).toBe(true)
  })

  it('capability に updater と process（再起動）の権限がある', () => {
    const capability = JSON.parse(read('src-tauri/capabilities/default.json')) as {
      permissions: string[]
    }
    expect(capability.permissions).toContain('updater:default')
    expect(capability.permissions).toContain('process:default')
  })

  it('Rust / JS の両側にプラグインが入り、Rust 側で初期化されている', () => {
    const cargo = read('src-tauri/Cargo.toml')
    expect(cargo).toContain('tauri-plugin-updater')
    expect(cargo).toContain('tauri-plugin-process')
    const lib = read('src-tauri/src/lib.rs')
    // Cargo に入れただけでは動かない（Builder に .plugin() が要る）
    expect(lib).toContain('tauri_plugin_updater')
    expect(lib).toContain('tauri_plugin_process')
    const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['@tauri-apps/plugin-updater']).toBeTruthy()
    expect(pkg.dependencies['@tauri-apps/plugin-process']).toBeTruthy()
  })

  // 起動時 1 回だけだと、開きっぱなしのアプリには**次に立ち上げ直すまで永久に届かない**。
  // 消しても通知が減るだけでエラーは出ないので、定期確認の配線をここで固定する
  it('起動時だけでなく定期的に確認する', () => {
    const hook = read('src/features/app-update/model/useAppUpdate.ts')
    expect(hook).toContain('setInterval')
    expect(hook).toContain('UPDATE_CHECK_INTERVAL_MS')
    expect(hook).toContain('clearInterval')
  })

  it('通知がアプリのルートに描かれている（feature を作っても置き忘れたら誰にも出ない）', () => {
    expect(read('src/main.tsx')).toContain('<UpdateBanner />')
  })

  it('version が 3 か所で一致する（更新判定は semver 比較。片方だけ上げると更新が届かない）', () => {
    const pkg = JSON.parse(read('package.json')) as { version: string }
    const cargo = /^version = "([^"]+)"/m.exec(read('src-tauri/Cargo.toml'))?.[1]
    expect(pkg.version).toBe(conf.version)
    expect(cargo).toBe(conf.version)
  })

  it('リリース workflow が署名鍵・overlay・マニフェスト公開を配線している', () => {
    for (const required of [
      'TAURI_SIGNING_PRIVATE_KEY',
      'tauri.release.conf.json',
      '--platform',
      'scripts/desktop/publish-manifest.mjs',
    ]) {
      expect(workflow, `desktop-release.yml に ${required} が無い`).toContain(required)
    }
  })

  it.runIf(isProduct)('endpoint が本番 Storage の latest.json（release-paths と一致）', () => {
    // 配布済みアプリはこの URL しか見ない。CI の公開先（release-paths.mjs）と
    // 必ず同じホストになっていること
    expect(conf.plugins?.updater?.endpoints).toEqual([
      publicReleaseUrl(productionSupabaseUrl(), LATEST_MANIFEST_PATH),
    ])
  })

  it.runIf(isProduct)('公開鍵が焼き込まれている（minisign の公開鍵を base64 にしたもの）', () => {
    const pubkey = conf.plugins?.updater?.pubkey ?? ''
    expect(pubkey).toMatch(/^[A-Za-z0-9+/=]{40,}$/)
    expect(Buffer.from(pubkey, 'base64').toString('utf8')).toContain('untrusted comment')
  })

  it.runIf(isProduct)('releases バケットが config.toml に public として宣言されている', () => {
    const config = readRepo('supabase/config.toml')
    const section = /\[storage\.buckets\.releases\]\n(?:[^[]*)/m.exec(config)?.[0]
    expect(section, '[storage.buckets.releases] が config.toml に無い').toBeTruthy()
    expect(section).toContain('public = true')
  })
})

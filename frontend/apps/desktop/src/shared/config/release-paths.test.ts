import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  classifyArtifact,
  DESKTOP_RELEASES_BUCKET,
  LATEST_ARTIFACT_NAMES,
  LATEST_MANIFEST_PATH,
  latestObjectPath,
  publicReleaseUrl,
  updaterArtifactRole,
  versionedObjectPath,
  // 実装: `scripts/desktop/release-paths.mjs`
  // CI のアップロード（scripts/desktop/upload-release.mjs）と Web のダウンロードページが
  // 同じパス規約を共有する。ズレると「アップロードは成功するのにリンクが 404」になり、
  // どちらのビルドも lint も通ってしまうため、規約を 1 モジュールに固定して単体テストで守る。
} from '../../../../../../scripts/desktop/release-paths.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../../../..')

const tauriConf = JSON.parse(
  readFileSync(join(REPO_ROOT, 'frontend/apps/desktop/src-tauri/tauri.conf.json'), 'utf8')
) as { productName: string }
const productName = tauriConf.productName

describe('release-paths: 配布物のオブジェクトパス規約', () => {
  it('バージョン付きパスは desktop/v<version>/<file>', () => {
    expect(versionedObjectPath('0.1.0', `${productName}_0.1.0_aarch64.dmg`)).toBe(
      `desktop/v0.1.0/${productName}_0.1.0_aarch64.dmg`
    )
  })

  it('latest の安定パスは productName 由来の固定名（アプリを改名したら配布名も変わる）', () => {
    expect(latestObjectPath('darwin-aarch64')).toBe(
      `desktop/latest/${productName}-apple-silicon.dmg`
    )
    expect(latestObjectPath('windows-x86_64')).toBe(`desktop/latest/${productName}-setup.exe`)
  })

  it('Intel Mac は既定で配布対象外（足すのは release-paths と workflow の matrix）', () => {
    expect(() => latestObjectPath('darwin-x64')).toThrow(/darwin-x64/)
    expect(classifyArtifact(`${productName}_0.1.0_x64.dmg`)).toBeNull()
  })

  it('未知のプラットフォームキーは例外（無言で undefined を返さない）', () => {
    expect(() => latestObjectPath('linux-x64')).toThrow(/linux-x64/)
  })

  it('公開 URL は public バケットのオブジェクト URL 形式', () => {
    expect(publicReleaseUrl('https://example.supabase.co', 'desktop/latest/App-setup.exe')).toBe(
      'https://example.supabase.co/storage/v1/object/public/releases/desktop/latest/App-setup.exe'
    )
    // 末尾スラッシュ付きでも二重スラッシュにしない
    expect(publicReleaseUrl('https://example.supabase.co/', 'desktop/latest/App-setup.exe')).toBe(
      'https://example.supabase.co/storage/v1/object/public/releases/desktop/latest/App-setup.exe'
    )
  })

  it('Tauri の成果物ファイル名からプラットフォームを判定できる', () => {
    // ファイル名規則は Tauri bundler の実装:
    //   DMG:  {productName}_{version}_{arch}.dmg（arch = aarch64 | x64 | universal）
    //   NSIS: {productName}_{version}_{arch}-setup.exe
    expect(classifyArtifact(`${productName}_0.1.0_aarch64.dmg`)).toBe('darwin-aarch64')
    expect(classifyArtifact(`${productName}_0.1.0_x64-setup.exe`)).toBe('windows-x86_64')
    // インストーラでないもの（.app.tar.gz / .msi / .sig 等）は null（アップロード対象外）
    expect(classifyArtifact(`${productName}.app.tar.gz`)).toBeNull()
    expect(classifyArtifact(`${productName}_0.1.0_x64_en-US.msi`)).toBeNull()
    expect(classifyArtifact(`${productName}_0.1.0_universal.dmg`)).toBeNull()
  })
})

describe('release-paths: 自動更新（updater）の成果物とマニフェスト', () => {
  it('マニフェストは latest/ の固定パス（アプリに焼き込む URL なので動かせない）', () => {
    expect(LATEST_MANIFEST_PATH).toBe('desktop/latest/latest.json')
  })

  it('updater の成果物を payload / signature に分類できる', () => {
    // createUpdaterArtifacts: true が生む名前（macOS は .app.tar.gz + .sig、
    // Windows は NSIS の -setup.exe がそのまま payload で .sig が付く）
    expect(updaterArtifactRole(`${productName}.app.tar.gz`)).toBe('payload')
    expect(updaterArtifactRole(`${productName}.app.tar.gz.sig`)).toBe('signature')
    expect(updaterArtifactRole(`${productName}_0.2.0_x64-setup.exe`)).toBe('payload')
    expect(updaterArtifactRole(`${productName}_0.2.0_x64-setup.exe.sig`)).toBe('signature')
  })

  it('インストーラでも updater でもないものは null', () => {
    expect(updaterArtifactRole(`${productName}_0.2.0_aarch64.dmg`)).toBeNull()
    expect(updaterArtifactRole(`${productName}_0.2.0_x64_en-US.msi`)).toBeNull()
    expect(updaterArtifactRole('latest.json')).toBeNull()
  })
})

describe('release-paths: 他の正本との整合', () => {
  it('latest の固定名が productName から組まれている（改名の追従漏れ検知）', () => {
    for (const name of Object.values(LATEST_ARTIFACT_NAMES)) {
      expect(name.startsWith(productName), `${name} が productName と食い違う`).toBe(true)
    }
  })

  it('バケット名が Web 側と同じ 1 つの値（releases）', () => {
    // Web の /download と CI のアップロードが同じバケットを見ていること。
    // `mode: product` で supabase/config.toml を作ったら、そこに
    // [storage.buckets.releases] public = true を宣言する（desktop.policy.test.ts が検査）
    expect(DESKTOP_RELEASES_BUCKET).toBe('releases')
  })
})

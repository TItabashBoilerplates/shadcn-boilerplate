import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { IMAGE_WIDTH_LADDER } from './storage-image'

/**
 * Supabase Storage の画像変換ポリシーの静的検査
 *
 * `.claude/rules/storage-images.md` の不変条件をコードに固定する。ここで検査しているものは
 * **壊してもアプリは普通に動く**（ビルドも型チェックも lint も通る）。気づけるのは
 * Supabase の egress 請求か、遅いページを誰かが報告したときだけなので、CI で止める。
 *
 * 検査するのは「画像を描画するファイルが Storage の URL を自前で組み立てていないか」。
 * 画像以外のファイル（PDF 等）の署名 URL 発行までは禁止しない。
 */

const FRONTEND_ROOT = resolve(__dirname, '../../..')
const APP_SOURCE_DIRS = [
  join(FRONTEND_ROOT, 'apps/web/src'),
  join(FRONTEND_ROOT, 'apps/mobile/src'),
]

/** ポリシーの実装本体（ここだけは Storage の URL を組み立ててよい） */
const POLICY_IMPLEMENTATION = [
  'apps/web/src/shared/lib/supabase-image',
  'apps/web/src/shared/ui/supabase-image',
  'apps/mobile/src/shared/ui/supabase-image',
]

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) return listSourceFiles(fullPath)
    return /\.tsx?$/.test(entry) && !/\.(test|stories)\.tsx?$/.test(entry) ? [fullPath] : []
  })
}

function collectAppSources(): { path: string; relativePath: string; content: string }[] {
  return APP_SOURCE_DIRS.flatMap(listSourceFiles).map((path) => ({
    path,
    relativePath: relative(FRONTEND_ROOT, path),
    content: readFileSync(path, 'utf-8'),
  }))
}

function isPolicyImplementation(relativePath: string): boolean {
  return POLICY_IMPLEMENTATION.some((dir) => relativePath.startsWith(dir))
}

const appSources = collectAppSources()

describe('共有コンポーネントの存在', () => {
  it.each([
    ['apps/web/src/shared/ui/supabase-image/SupabaseImage.tsx', 'supabaseImageLoader'],
    ['apps/mobile/src/shared/ui/supabase-image/SupabaseImage.tsx', 'buildStorageImageUrl'],
  ])('%s が変換経路（%s）を使っている', (relativePath, expectedSymbol) => {
    const content = readFileSync(join(FRONTEND_ROOT, relativePath), 'utf-8')
    expect(content).toContain(expectedSymbol)
  })

  it('web の SupabaseImage が fill 時の sizes を検査している（最適サイズの担保）', () => {
    // sizes が無い fill は 100vw 扱い → 小さな枠でも srcset の最大幅が落ちてくる
    const content = readFileSync(
      join(FRONTEND_ROOT, 'apps/web/src/shared/ui/supabase-image/SupabaseImage.tsx'),
      'utf-8'
    )
    expect(content).toContain('assertResponsiveSizes')
  })

  it('<img> 要素を biome が error で止める（next/image・SupabaseImage を迂回させない）', () => {
    const biomeConfig = JSON.parse(readFileSync(join(FRONTEND_ROOT, 'biome.json'), 'utf-8'))
    expect(biomeConfig.linter?.rules?.performance?.noImgElement).toBe('error')
  })

  it('web のローダーは next/image のグローバル loaderFile ではなく loader prop で使う', () => {
    // loaderFile はアプリ内の全 next/image に適用され、ローカル静的画像まで壊す
    const nextConfig = readFileSync(join(FRONTEND_ROOT, 'apps/web/next.config.ts'), 'utf-8')
    expect(nextConfig).not.toContain('loaderFile')
  })
})

describe('next.config.ts の画像サイズ', () => {
  function parseSizes(source: string, key: 'imageSizes' | 'deviceSizes'): number[] {
    const matched = source.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`))
    if (!matched) throw new Error(`next.config.ts に images.${key} が無い`)
    return matched[1]
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value))
  }

  const nextConfig = readFileSync(join(FRONTEND_ROOT, 'apps/web/next.config.ts'), 'utf-8')

  it('imageSizes + deviceSizes が IMAGE_WIDTH_LADDER と一致する', () => {
    const sizes = [
      ...parseSizes(nextConfig, 'imageSizes'),
      ...parseSizes(nextConfig, 'deviceSizes'),
    ]
    expect(sizes).toEqual([...IMAGE_WIDTH_LADDER])
  })

  it('Supabase の上限（2500）を超える幅を srcset に出さない', () => {
    const sizes = [
      ...parseSizes(nextConfig, 'imageSizes'),
      ...parseSizes(nextConfig, 'deviceSizes'),
    ]
    for (const size of sizes) {
      expect(size).toBeLessThanOrEqual(2500)
    }
  })
})

describe('アプリコードでの Storage URL の直接組み立て禁止', () => {
  it('object/public の URL を文字列で組み立てているファイルが無い', () => {
    const violations = appSources
      .filter(({ relativePath }) => !isPolicyImplementation(relativePath))
      .filter(({ content }) => content.includes('/storage/v1/object/'))
      .map(({ relativePath }) => relativePath)

    expect(violations, 'Storage の URL は buildStorageImageUrl / SupabaseImage 経由で作る').toEqual(
      []
    )
  })

  it('画像を描画するファイルが getPublicUrl / createSignedUrl を直接呼んでいない', () => {
    // next/image・expo-image を import しているファイル = 画像を描画するファイル
    const violations = appSources
      .filter(({ relativePath }) => !isPolicyImplementation(relativePath))
      .filter(({ content }) => /from '(next\/image|expo-image)'/.test(content))
      .filter(({ content }) => /\.(getPublicUrl|createSignedUrl)\(/.test(content))
      .map(({ relativePath }) => relativePath)

    expect(
      violations,
      '画像の URL は SupabaseImage / createSignedStorageImageUrl 経由で作る（transform 必須）'
    ).toEqual([])
  })
})

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `.claude/rules/mobile-uiux.md` §4〜§6 のうち、**Web（スマホ幅）**に効く不変条件を守る。
 *
 * Mobile 版（`apps/mobile/src/shared/config/mobile-uiux.policy.test.ts`）と対になる検査。
 *
 * ## なぜ静的検査なのか
 *
 * - **DevTools のデバイスモードは仮想キーボードもセーフエリアもエミュレートしない**ので、
 *   幅を狭めた確認では一切再現しない
 * - ズーム禁止も、下部バーがキーボードに隠れるのも、**ビルド・型・lint は全部通る**
 * - 気づけるのは実機の iOS Safari を触ったときだけ
 *
 * **このテストを無効化・削除しない**（`.claude/rules/mobile-uiux.md` §10）。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(HERE, '../../..')

function read(relativePath: string): string {
  const full = join(APP_ROOT, relativePath)
  expect(existsSync(full), `${relativePath} が存在しない`).toBe(true)
  return readFileSync(full, 'utf8')
}

/** 「この API は使わない」という注意書き自体を拾わないよう、コメントを除く */
function readCode(relativePath: string): string {
  return read(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function sourceFiles(): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    if (!existsSync(join(APP_ROOT, dir))) {
      return
    }
    for (const entry of readdirSync(join(APP_ROOT, dir), { withFileTypes: true })) {
      const relative = `${dir}/${entry.name}`
      if (entry.isDirectory()) {
        walk(relative)
      } else if (
        /\.tsx?$/.test(entry.name) &&
        // ストーリーとテスト自身は出荷されない。検査パターンの文字列で自爆しないよう除く
        !entry.name.includes('.stories.') &&
        !entry.name.includes('.test.')
      ) {
        found.push(relative)
      }
    }
  }
  walk('app')
  walk('src')
  return found
}

describe('ビューポート', () => {
  /**
   * ⚠️ **Next.js 公式の `generateViewport` のサンプルコードに
   * `maximumScale: 1, userScalable: false` がそのまま載っている。**
   * コピーすると WCAG 1.4.4 (Resize Text) 違反になり、axe でも failure になる。
   * iOS Safari のオートズームは font-size 16px 以上で止めること
   * （`.claude/rules/form-controls.md`）。
   */
  it('ズームを禁止していない（maximumScale / userScalable / user-scalable）', () => {
    const offenders = sourceFiles().filter((file) =>
      /maximumScale|userScalable|user-scalable|maximum-scale/.test(readCode(file))
    )
    expect(
      offenders,
      'ズーム禁止は WCAG 1.4.4 違反。Next.js 公式サンプルをコピーしないこと'
    ).toEqual([])
  })

  it('ロケールレイアウトが viewport を export し、viewportFit: cover になっている', () => {
    const layout = readCode('app/[locale]/layout.tsx')
    expect(layout, 'viewport export が無い').toMatch(/export const viewport\s*:\s*Viewport/)
    expect(layout, 'env(safe-area-inset-*) を効かせるため cover が要る').toContain(
      "viewportFit: 'cover'"
    )
  })
})

describe('キーボードとレイアウト', () => {
  /**
   * `env(keyboard-inset-*)` は VirtualKeyboard API
   * (`navigator.virtualKeyboard.overlaysContent = true`) が前提で **Chromium 系限定**。
   * iOS Safari では常に 0 になるため、依存すると「Android だけ直る」実装になる。
   */
  it('env(keyboard-inset-*) に依存していない', () => {
    const offenders = [...sourceFiles(), 'src/app/styles/globals.css'].filter((file) => {
      if (!existsSync(join(APP_ROOT, file))) {
        return false
      }
      return /keyboard-inset-/.test(readCode(file))
    })
    expect(
      offenders,
      'Chromium 限定（iOS で常に 0）。interactiveWidget か VisualViewport を使う'
    ).toEqual([])
  })

  /**
   * `100vh` はモバイルでアドレスバーぶんずれる。`dvh` / `svh` / `lvh` を使う。
   * （Tailwind なら `h-dvh` / `min-h-dvh`）
   */
  it('h-screen / 100vh をページの高さに使っていない', () => {
    const offenders = sourceFiles().filter((file) => /\bh-screen\b|100vh/.test(readCode(file)))
    expect(offenders, 'モバイルでアドレスバーぶんずれる。dvh / svh を使う').toEqual([])
  })
})

describe('フォーム要素', () => {
  /**
   * iOS Safari は computed font-size が 16px 未満のフォーム要素にフォーカスすると
   * 自動でズームインする。標準形は `text-base md:text-sm`。
   * スタイルは `@workspace/ui` の共有コンポーネント 1 か所にのみ置く
   * （実際に `textareaClass` が 6 ファイルへコピペされて全部ズーム対象になった事故がある）。
   */
  it('生の input / textarea / select を直書きしていない', () => {
    // 対象は「フォーカスでテキスト入力キャレットが立つ」要素だけ
    // （`.claude/rules/form-controls.md` §2.2）。hidden / checkbox / radio / file は
    // フォーカスしてもズームしないので対象外
    const NON_TEXT_INPUT = /<input[^>]*type=["'](hidden|checkbox|radio|file|range|color)["']/
    const offenders = sourceFiles().filter((file) => {
      const code = readCode(file)
      return code
        .split('\n')
        .some(
          (line) =>
            /(^|[\s({[>])<(input|textarea|select)[\s/>]/.test(line) && !NON_TEXT_INPUT.test(line)
        )
    })
    expect(
      offenders,
      '@workspace/ui の共有コンポーネントを使うこと（.claude/rules/form-controls.md）'
    ).toEqual([])
  })

  it('入力欄のクラス定数をローカルにコピペしていない', () => {
    const offenders = sourceFiles().filter((file) =>
      /const\s+[a-z]*(textarea|input|field)[a-zA-Z]*Class(Name)?\s*=/i.test(readCode(file))
    )
    expect(offenders, '共有コンポーネント 1 か所にのみ定義する').toEqual([])
  })
})

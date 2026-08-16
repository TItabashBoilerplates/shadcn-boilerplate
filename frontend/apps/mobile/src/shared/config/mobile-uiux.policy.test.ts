import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `.claude/rules/mobile-uiux.md` の不変条件を機械的に守る。
 *
 * ## なぜ静的検査でしか守れないのか
 *
 * キーボード周りの不具合は**開発中に一切顕在化しない**:
 *
 * - シミュレータは既定でハードウェアキーボード扱い（iOS は `⌘K` でトグル）なので、
 *   入力欄が隠れる症状が**手元で一度も再現しない**
 * - ビルド・型・lint・Storybook は**全部通る**
 * - Android の edge-to-edge（15 で強制 / 16 で opt-out 不可）は
 *   **API 35 未満の端末では影響が出ない**ので「動いた」が根拠にならない
 *
 * つまり気づけるのはユーザーからの報告時だけ。だからここで止める。
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

/** app / src 配下のソースを集める（Storybook とテスト自身は対象外） */
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

describe('キーボード回避', () => {
  /**
   * Android 15（targetSdk 35）以降 edge-to-edge が強制され、`adjustResize` は
   * ウィンドウをリサイズしなくなった（OS は IME inset をアプリへ渡す）。
   * `react-native` 標準の `KeyboardAvoidingView` は IME inset を見ず、
   * アニメーション完了後に発火する `keyboardDidShow` に依存しているため、
   * **この構成では構造的に壊れている**（Expo 公式も
   * "ideally react-native-keyboard-controller" と明記）。
   */
  it('react-native 標準の KeyboardAvoidingView を使っていない', () => {
    const offenders = sourceFiles().filter((file) => {
      const code = readCode(file)
      // import { ..., KeyboardAvoidingView, ... } from 'react-native'
      return /import\s*\{[^}]*\bKeyboardAvoidingView\b[^}]*\}\s*from\s*['"]react-native['"]/.test(
        code
      )
    })

    expect(
      offenders,
      `react-native の KeyboardAvoidingView は Android edge-to-edge 下で壊れる。` +
        `react-native-keyboard-controller から import すること`
    ).toEqual([])
  })

  it('react-native-keyboard-controller が依存に入っている', () => {
    const manifest = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>
    }
    expect(manifest.dependencies?.['react-native-keyboard-controller']).toBeDefined()
  })

  /** 無いとライブラリのコンポーネントは**エラーも出さずに何もしない** */
  it('KeyboardProvider がアプリのルートに 1 つだけある', () => {
    const provider = readCode('src/app/providers/AppProvider.tsx')
    expect(provider).toContain('KeyboardProvider')
    expect(provider).toContain('react-native-keyboard-controller')

    const occurrences = sourceFiles().filter((file) =>
      /<KeyboardProvider[\s>]/.test(readCode(file))
    )
    expect(occurrences, 'KeyboardProvider はルートに 1 つだけ置く').toEqual([
      'src/app/providers/AppProvider.tsx',
    ])
  })

  /**
   * `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` は
   * **RN 標準版の回避策**であり、keyboard-controller では不要かつ誤り
   * （両プラットフォームで同じアニメーションを再現するライブラリなので）。
   */
  it('behavior をプラットフォームで書き分けていない', () => {
    const offenders = sourceFiles().filter((file) =>
      /behavior=\{[^}]*Platform\.OS/.test(readCode(file))
    )
    expect(offenders, 'keyboard-controller では behavior の Platform 分岐は誤り').toEqual([])
  })
})

describe('スクロールコンテナ', () => {
  /**
   * 無いとキーボード表示中の 1 タップ目が「キーボードを閉じる」で消費され、
   * 「送信ボタンが 1 回目は効かない」という再現性の低いバグになる。
   */
  it.each([
    'src/views/auth/ui/AuthScreen.tsx',
    'src/views/account/ui/AccountScreen.tsx',
  ])('%s に keyboardShouldPersistTaps="handled" がある', (file) => {
    expect(readCode(file)).toContain('keyboardShouldPersistTaps="handled"')
  })

  it('入力を含む画面が KeyboardAwareScrollView を使っている', () => {
    for (const file of [
      'src/views/auth/ui/AuthScreen.tsx',
      'src/views/account/ui/AccountScreen.tsx',
    ]) {
      expect(
        readCode(file),
        `${file} はフォーム画面なので KeyboardAwareScrollView を使う`
      ).toContain('KeyboardAwareScrollView')
    }
  })

  /** `always` にするとキーボードが閉じられなくなる。正解は `handled` */
  it('keyboardShouldPersistTaps="always" を使っていない', () => {
    const offenders = sourceFiles().filter((file) =>
      readCode(file).includes('keyboardShouldPersistTaps="always"')
    )
    expect(offenders).toEqual([])
  })
})

describe('セーフエリア', () => {
  /**
   * NativeWind v5 は `SafeAreaProvider` だけを cssInterop するため、
   * `react-native-safe-area-context` の `SafeAreaView` に `className` を渡すと
   * **型もビルドも通るのに実行時だけ無視され、画面が真っ黒になる**。
   */
  it('react-native-safe-area-context から SafeAreaView を直接 import していない', () => {
    const offenders = sourceFiles().filter((file) =>
      /import\s*\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*['"]react-native-safe-area-context['"]/.test(
        readCode(file)
      )
    )
    expect(offenders, '@workspace/native-ui の SafeAreaView を使うこと').toEqual([])
  })

  /**
   * キーボードが下辺を覆っている間、home indicator の inset は不要。
   * 足すと隙間が二重に開く。
   */
  it('セーフエリアの bottom inset とキーボード高を足し算していない', () => {
    const offenders = sourceFiles().filter((file) =>
      /insets\.bottom\s*\+\s*\w*[kK]eyboard/.test(readCode(file))
    )
    expect(offenders).toEqual([])
  })
})

describe('app.json', () => {
  const appConfig = JSON.parse(read('app.json')) as {
    expo: { android?: Record<string, unknown> }
  }

  /**
   * Android 16 では opt-out 不可なので、無効化すると新しい端末との挙動が乖離し、
   * 「古い端末でだけ動く」実装になる。
   */
  it('edge-to-edge を無効化していない', () => {
    expect(appConfig.expo.android?.edgeToEdgeEnabled).not.toBe(false)
  })

  /**
   * `pan` は keyboard-controller を使わない場合の下タブ回避策。
   * 併用すると二重にレイアウトが動く。
   */
  it('softwareKeyboardLayoutMode を pan にしていない', () => {
    expect(appConfig.expo.android?.softwareKeyboardLayoutMode).not.toBe('pan')
  })
})

describe('入力属性', () => {
  /**
   * 属性を省いた `TextInput` は「英字キーボードが出て、オートフィルが効かず、
   * Enter が何をするか分からない入力」であり、モバイルでは機能欠陥にあたる。
   * 本アプリの入力欄は `AuthField` に集約し、意味（purpose）から属性を導出する。
   */
  it('生の TextInput を画面に直書きしていない（共有コンポーネントに集約する）', () => {
    // JSX の `<TextInput` だけを見る。`Ref<TextInput>` のような型引数は対象外
    // （`<` の直前が識別子文字なら型位置）
    const offenders = sourceFiles().filter((file) =>
      /(^|[\s({[>])<TextInput[\s/>]/m.test(readCode(file))
    )
    expect(
      offenders,
      'AuthField / @workspace/native-ui の Input を使うこと（.claude/rules/form-controls.md）'
    ).toEqual([])
  })

  it('AuthField が意味ベースの purpose から属性を導出している', () => {
    const field = readCode('src/features/auth/ui/AuthField.tsx')
    expect(field).toContain('resolveAuthFieldAttributes')
    expect(field).toContain('Platform.OS')
  })

  /** deprecated。`submitBehavior`（'submit' | 'blurAndSubmit' | 'newline'）を使う */
  it('deprecated な blurOnSubmit を使っていない', () => {
    const offenders = sourceFiles().filter((file) => readCode(file).includes('blurOnSubmit'))
    expect(offenders).toEqual([])
  })
})

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * AI 設定の「層分離」を機械的に守る。
 *
 * ## 2 つの層
 *
 * | 層 | 所有者 | 場所 | 中身 |
 * |---|---|---|---|
 * | スタック層（how） | boilerplate | `.claude/CLAUDE.md` / `.claude/rules/` / `.claude/skills/` / `AGENTS.md` | 技術規約。派生先で書き換えない |
 * | プロダクト層（what） | 派生先 | `PROJECT.md` | そのアプリの決定事項。派生先が埋める |
 *
 * ## なぜこの検査が要るか
 *
 * スタック層に「このリポジトリは boilerplate なので config.toml を置かない」のような
 * **リポジトリの正体に関する記述**が混ざると、template から起こした派生先でそれが
 * そのまま**誤情報**になる（AI が config.toml を作らずに進める、Doppler の本番保護が
 * 巻き戻る、等）。壊れてもビルドも lint も通るので、静的検査でしか止められない。
 *
 * 逆に `PROJECT.md` が埋まっていないまま `mode: product` にすると、AI は決定事項を
 * 推測で埋める。それも同じ経路で止める。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../..')

const PROJECT_MANIFEST = 'PROJECT.md'
const STACK_LAYER_FILES = ['.claude/CLAUDE.md', 'AGENTS.md']
const RULES_DIR = '.claude/rules'
const PLACEHOLDER = 'TODO'

/** スタック層に書いてはいけない「リポジトリの正体」の記述。正体は PROJECT.md にしか書かない */
const IDENTITY_STATEMENTS = [
  /このリポジトリは\s*boilerplate/,
  /boilerplate\s*本体/,
  /派生プロジェクト/,
  /派生先/,
  /^PHASE:/m,
]

const REQUIRED_KEYS = [
  'mode',
  'distribution',
  'tenancy',
  'locales',
  'seo_public_pages',
  'supabase_plan',
  'doppler_phase',
  'services.stripe',
  'services.revenuecat',
  'services.resend',
  'services.onesignal',
  'services.livekit',
  'services.fal',
  'services.sentry',
  'services.langchain',
] as const

const ENUMS: Record<string, readonly string[]> = {
  mode: ['boilerplate', 'product'],
  distribution: ['web', 'web+mobile', 'mobile'],
  tenancy: ['personal', 'organization'],
  seo_public_pages: ['true', 'false'],
  supabase_plan: ['free', 'pro', 'team', 'enterprise'],
  doppler_phase: ['full-access', 'protected'],
}
for (const key of REQUIRED_KEYS) {
  if (key.startsWith('services.')) ENUMS[key] = ['true', 'false']
}

function read(relativePath: string): string {
  const full = join(REPO_ROOT, relativePath)
  expect(existsSync(full), `${relativePath} が存在しない`).toBe(true)
  return readFileSync(full, 'utf8')
}

/** コードブロックとインラインコードを除いた本文（`@` import と禁止語の検査に使う） */
function stripCode(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

/**
 * PROJECT.md の frontmatter を `key` / `parent.child` の平坦な Map に読む。
 * YAML パーサを依存に足さないため、扱う形は「スカラー」と「1 段のネスト」に限定する。
 */
function parseFrontmatter(markdown: string): Map<string, string> {
  const match = /^---\n([\s\S]*?)\n---/.exec(markdown)
  expect(match, 'PROJECT.md は frontmatter（--- で囲んだ YAML）で始まる').not.toBeNull()
  const values = new Map<string, string>()
  let parent: string | null = null
  for (const rawLine of (match as RegExpExecArray)[1].split('\n')) {
    const line = rawLine.replace(/\s+#.*$/, '').trimEnd()
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const nested = /^\s+([\w-]+):\s*(.*)$/.exec(line)
    const top = /^([\w-]+):\s*(.*)$/.exec(line)
    if (top) {
      parent = top[2] === '' ? top[1] : null
      if (top[2] !== '') values.set(top[1], top[2].trim())
    } else if (nested && parent) {
      values.set(`${parent}.${nested[1]}`, nested[2].trim())
    }
  }
  return values
}

function listMarkdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return listMarkdownFiles(full)
    return entry.endsWith('.md') ? [full] : []
  })
}

const manifest = read(PROJECT_MANIFEST)
const values = parseFrontmatter(manifest)
const mode = values.get('mode')

describe('PROJECT.md（プロダクト層）', () => {
  it('必須キーがすべてある（派生先が項目を消せない）', () => {
    const missing = REQUIRED_KEYS.filter((key) => !values.has(key))
    expect(missing, `PROJECT.md の frontmatter に無いキー: ${missing.join(', ')}`).toEqual([])
  })

  it.each(REQUIRED_KEYS.filter((key) => key in ENUMS))('%s は許容値か TODO', (key) => {
    const value = values.get(key) ?? ''
    expect(
      value === PLACEHOLDER || ENUMS[key].includes(value),
      `${key}: "${value}" は ${ENUMS[key].join(' | ')} | ${PLACEHOLDER} のいずれでもない`
    ).toBe(true)
  })

  it('mode は必ず決まっている（TODO 不可）', () => {
    expect(ENUMS.mode).toContain(mode)
  })

  it('意図的な逸脱を記録する節がある（design-research.md §3 の記録先）', () => {
    expect(manifest).toMatch(/^##\s+.*意図的な逸脱/m)
  })
})

describe(`mode: ${mode}`, () => {
  if (mode === 'product') {
    it('決定事項に TODO が残っていない（推測で埋めさせない）', () => {
      const todoLines = manifest
        .split('\n')
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(({ line }) => line.includes(PLACEHOLDER))
        .map(({ number, line }) => `${number}: ${line.trim()}`)
      expect(todoLines, `PROJECT.md に未決定の項目が残っている:\n${todoLines.join('\n')}`).toEqual(
        []
      )
    })

    it('supabase/config.toml がある（Config-as-Code が効く状態）', () => {
      expect(existsSync(join(REPO_ROOT, 'supabase/config.toml'))).toBe(true)
    })
  } else {
    it('supabase/config.toml を置かない（値が派生先ごとに異なるため雛形に含めない）', () => {
      expect(existsSync(join(REPO_ROOT, 'supabase/config.toml'))).toBe(false)
    })
  }
})

describe('スタック層（boilerplate 所有）にリポジトリの正体を書かない', () => {
  const ruleFiles = listMarkdownFiles(join(REPO_ROOT, RULES_DIR)).map((full) =>
    relative(REPO_ROOT, full)
  )

  it.each([...STACK_LAYER_FILES, ...ruleFiles])('%s', (relativePath) => {
    const content = stripCode(read(relativePath))
    const hits = IDENTITY_STATEMENTS.filter((pattern) => pattern.test(content)).map(String)
    expect(hits, `${relativePath} に PROJECT.md へ移すべき記述がある: ${hits.join(', ')}`).toEqual(
      []
    )
  })

  it('.claude/CLAUDE.md が PROJECT.md を import している（相対パスは書いたファイル基準）', () => {
    expect(stripCode(read('.claude/CLAUDE.md'))).toMatch(/^@\.\.\/PROJECT\.md\s*$/m)
  })

  it('.claude/CLAUDE.md が AGENTS.md を import している（二重化しない。公式推奨）', () => {
    expect(stripCode(read('.claude/CLAUDE.md'))).toMatch(/^@\.\.\/AGENTS\.md\s*$/m)
  })

  it('.claude/memory/ を持たない（セッション記憶は派生先に配らない）', () => {
    expect(existsSync(join(REPO_ROOT, '.claude/memory'))).toBe(false)
  })
})

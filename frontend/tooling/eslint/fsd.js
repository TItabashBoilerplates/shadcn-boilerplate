import boundaries from 'eslint-plugin-boundaries'

/**
 * FSD Layer Hierarchy (top to bottom):
 * app > views > widgets > features > entities > shared
 *
 * Import rules: Each layer can only import from layers below it.
 * Same-slice imports are always allowed.
 */

const FSD_ELEMENTS = [
  // Next.js App Router (at project root) - treated as top-level entry point
  { type: 'nextjs-app', pattern: 'app/**/*', partialMatch: false },
  // FSD layers (inside src/)
  { type: 'fsd-app', pattern: 'src/app/**/*', partialMatch: false },
  {
    type: 'views',
    pattern: 'src/views/*',
    capture: ['slice'],
  },
  {
    type: 'widgets',
    pattern: 'src/widgets/*',
    capture: ['slice'],
  },
  // @x cross-imports for features (must be before features to match first)
  {
    type: 'features-cross-import',
    pattern: 'src/features/*/@x/*',
    partialMatch: false,
    capture: ['sourceSlice', 'targetSlice'],
  },
  {
    type: 'features',
    pattern: 'src/features/*',
    capture: ['slice'],
  },
  // @x cross-imports for entities (must be before entities to match first)
  {
    type: 'entities-cross-import',
    pattern: 'src/entities/*/@x/*',
    partialMatch: false,
    capture: ['sourceSlice', 'targetSlice'],
  },
  {
    type: 'entities',
    pattern: 'src/entities/*',
    capture: ['slice'],
  },
  {
    type: 'shared',
    pattern: 'src/shared/*',
    capture: ['segment'],
  },
  // Workspace packages (always allowed)
  { type: 'workspace', pattern: '@workspace/**' },
]

/** `from` / `to` に書く要素セレクタ（eslint-plugin-boundaries v7 のオブジェクト形式） */
const el = (type) => ({ element: { type } })

/** 下位レイヤーへの依存だけを許可する */
const layer = (from, allowed) => ({
  from: el(from),
  allow: { to: allowed.map(el) },
})

const SLICED_LAYERS = ['views', 'widgets', 'features', 'entities']

const LAYER_POLICIES = [
  // Next.js App Router can import from all FSD layers
  layer('nextjs-app', [
    'fsd-app',
    'views',
    'widgets',
    'features',
    'entities',
    'shared',
    'workspace',
  ]),
  // FSD app layer can import from itself and all lower layers
  layer('fsd-app', ['fsd-app', 'views', 'widgets', 'features', 'entities', 'shared', 'workspace']),
  layer('views', ['widgets', 'features', 'entities', 'shared', 'workspace']),
  layer('widgets', ['features', 'entities', 'shared', 'workspace']),
  layer('features', ['entities', 'shared', 'workspace']),
  layer('entities', ['shared', 'workspace']),
  // Shared layer can import from any segment within shared (and workspace)
  layer('shared', ['shared', 'workspace']),
  // Allow same-slice imports (intra-slice) for sliced layers
  ...SLICED_LAYERS.map((type) => ({
    from: { element: { type: SLICED_LAYERS } },
    allow: {
      to: {
        element: { type, captured: { slice: '{{ from.element.captured.slice }}' } },
      },
    },
  })),
]

/**
 * FSD ESLint configuration for eslint-plugin-boundaries
 * @see https://github.com/javierbrea/eslint-plugin-boundaries
 */
export const fsdConfig = {
  plugins: {
    boundaries,
  },
  settings: {
    'boundaries/include': ['src/**/*', 'app/**/*'],
    'boundaries/elements': FSD_ELEMENTS,
  },
  rules: {
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        policies: LAYER_POLICIES,
      },
    ],
    'boundaries/no-unknown-dependencies': ['warn'],
  },
}

export default fsdConfig

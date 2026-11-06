import base from '../../../.oxlintrc.json' with { type: 'json' }
import { fsdConfig } from './fsd.js'

/** Shared application policy; paths are resolved from each application's cwd. */
export function appConfig(rules, plugins, app) {
  return {
    ...base,
    plugins: [...new Set([...base.plugins, ...plugins])],
    jsPlugins: [
      'eslint-plugin-boundaries',
      { name: 'react-compat', specifier: 'eslint-plugin-react' },
      { name: 'hooks-compat', specifier: 'eslint-plugin-react-hooks' },
      ...(app === 'web' ? [{ name: 'next-compat', specifier: '@next/eslint-plugin-next' }] : []),
      ...(app === 'mobile'
        ? ['eslint-plugin-expo', { name: 'import-compat', specifier: 'eslint-plugin-import' }]
        : []),
    ],
    settings: {
      ...fsdConfig.settings,
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
      react: { version: '19.2.3' },
    },
    overrides: [
      ...base.overrides,
      {
        files: ['**/*.{js,cjs,mjs}'],
        rules: {
          'typescript/no-require-imports': 'off',
          ...(app === 'mobile' ? { 'no-undef': 'error' } : {}),
        },
      },
    ],
    rules: {
      ...base.rules,
      ...rules,
      ...(app !== 'desktop'
        ? {
            'react-compat/no-deprecated': 'error',
            'hooks-compat/config': 'error',
            'hooks-compat/gating': 'error',
            'react/immutability': 'off',
          }
        : {}),
      ...(app === 'web' ? { 'next-compat/no-location-assign-relative-destination': 'warn' } : {}),
      ...(app === 'mobile'
        ? { 'import-compat/no-unresolved': 'error', 'import/export': 'error' }
        : {}),
      ...fsdConfig.rules,
    },
  }
}

import parser from '@typescript-eslint/parser'
import hooks from 'eslint-plugin-react-hooks'

// Oxlint 1.91 reports a nonexistent cleanup assignment in useAppUpdate.ts when
// checking the whole app. Preserve this rule with the original implementation.
export default [
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': hooks },
    rules: { 'react-hooks/immutability': 'error' },
  },
]

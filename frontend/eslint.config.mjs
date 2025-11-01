import baseConfig from '@workspace/eslint-config/base.js'

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'node_modules/**',
      '.turbo/**',
      'dist/**',
    ],
  },
  ...baseConfig,
]

export default eslintConfig

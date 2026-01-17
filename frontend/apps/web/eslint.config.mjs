import { fsdConfig } from '@workspace/eslint-config/fsd'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

export default [
  ...nextCoreWebVitals,
  fsdConfig,
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
]

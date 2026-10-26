import { expect, test } from 'bun:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const loaderRequire = createRequire(require.resolve('@esbuild-kit/core-utils'))

test('the legacy Drizzle loader can transform TypeScript with patched esbuild', () => {
  const esbuild = loaderRequire('esbuild')
  expect(esbuild.version).toBe('0.28.2')
  const loader = require('@esbuild-kit/core-utils')
  const result = loader.transformSync('export const value: number = 42', '/tmp/config.ts', {
    sourcemap: true,
  })
  expect(result.code).toContain('42')
  expect(result.map.sources).toContain('/tmp/config.ts')
})

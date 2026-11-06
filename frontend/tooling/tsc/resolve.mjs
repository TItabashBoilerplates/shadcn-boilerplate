import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

/** Resolve the pinned Rust compiler; never silently switch compiler implementations. */
export function resolveTsc() {
  const packageJsonPath = require.resolve('tsrs/package.json')
  const { version } = require('tsrs/package.json')
  return {
    packageName: 'tsrs',
    version,
    tscPath: join(dirname(packageJsonPath), 'bin', 'tsrs'),
  }
}

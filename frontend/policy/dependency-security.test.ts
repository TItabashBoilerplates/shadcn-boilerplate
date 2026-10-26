import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

describe('security fixes in transitive dependencies', () => {
  it('decodes malformed query strings without blocking the process', () => {
    const queryString = require.resolve('query-string')
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        `const assert = require('node:assert/strict');
const query = require(${JSON.stringify(queryString)});
assert.equal(query.parse('name=%E6%97%A5%E6%9C%AC+test').name, '日本 test');
const malformed = '%FF'.repeat(12000);
assert.equal(query.parse('value=' + malformed).value, malformed);`,
      ],
      { timeout: 3000, encoding: 'utf8' }
    )
    expect(result.error).toBeUndefined()
    expect(result.status, result.stderr).toBe(0)
  })

  it('keeps Xcode UUID generation working and rejects truncated v5 output buffers', () => {
    const xcodeRequire = createRequire(require.resolve('xcode'))
    const uuid = xcodeRequire('uuid')
    const xcode = require('xcode')
    const project = xcode.project('/unused.pbxproj')
    project.hash = { project: { objects: {} } }
    expect(project.generateUuid()).toMatch(/^[0-9A-F]{24}$/)
    expect(() => uuid.v5('test', uuid.v5.DNS, new Uint8Array(1))).toThrow(RangeError)
  })
})

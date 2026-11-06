import { spawnSync } from 'node:child_process'
import { verify } from 'node:crypto'
import { createRequire } from 'node:module'
import type * as ExpoCertificates from '@expo/code-signing-certificates'
import type * as GlobModule from 'glob'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

describe('security fixes in transitive dependencies', () => {
  it('keeps Expo update signatures interoperable with Node crypto and PEM buffers', () => {
    const certificates = require('@expo/code-signing-certificates') as typeof ExpoCertificates
    const forge = createRequire(require.resolve('@expo/code-signing-certificates'))('node-forge')
    const keyPair = certificates.generateKeyPair()
    const certificate = certificates.generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotBefore: new Date(Date.now() - 60_000),
      validityNotAfter: new Date(Date.now() + 3_600_000),
      commonName: 'Dependency compatibility test',
    })
    const pem = certificates.convertCertificateToCertificatePEM(certificate)
    const parsed = certificates.convertCertificatePEMToCertificate(pem)
    certificates.validateSelfSignedCertificate(parsed, keyPair)
    expect(forge.pem.decode(Buffer.from(pem))[0].type).toBe('CERTIFICATE')

    const payload = Buffer.from('Expo update manifest')
    const signature = Buffer.from(
      certificates.signBufferRSASHA256AndVerify(keyPair.privateKey, parsed, payload),
      'base64'
    )
    expect(verify('sha256', payload, pem, signature)).toBe(true)
    expect(verify('sha256', Buffer.from('Modified manifest'), pem, signature)).toBe(false)
  })

  it('preserves modern and legacy glob matching and honors an aborted traversal', async () => {
    const fingerprintRequire = createRequire(require.resolve('@expo/fingerprint'))
    const { Minimatch } = fingerprintRequire('minimatch')
    expect(new Minimatch('src/**/*.tsx', { dot: true }).match('src/.hidden/view.tsx')).toBe(true)
    expect(new Minimatch('src/**/*.tsx').match('src/view.ts')).toBe(false)
    // ESLint's legacy callers still require the callable minimatch 3 API.
    expect(require('minimatch')('src/view.tsx', '**/*.tsx')).toBe(true)

    const { glob } = require('glob') as typeof GlobModule
    await expect(glob('**/*', { signal: AbortSignal.abort() })).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

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

  it('keeps Xcode UUID generation working after its migration to native crypto', () => {
    const xcode = require('xcode')
    const project = xcode.project('/unused.pbxproj')
    project.hash = { project: { objects: {} } }
    expect(project.generateUuid()).toMatch(/^[0-9A-F]{24}$/)
    expect(project.generateUuid()).not.toBe(project.generateUuid())
  })
})

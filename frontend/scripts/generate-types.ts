#!/usr/bin/env bun

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { $ } from 'bun'

console.log('🔄 Generating Supabase types...')

// プロジェクトルートを取得（frontend/scripts/ の親の親）
const __dirname = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(__dirname, '..')
const outputPath = resolve(frontendRoot, 'packages/types/schema.ts')

try {
  // Supabase型生成（ローカル環境から）
  $.cwd(frontendRoot)
  await $`supabase gen types typescript --local > ${outputPath}`

  console.log('✅ Type generation complete!')
} catch (error) {
  console.error('❌ Type generation failed:', error)
  process.exit(1)
}

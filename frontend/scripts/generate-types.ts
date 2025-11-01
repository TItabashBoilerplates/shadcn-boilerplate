#!/usr/bin/env bun

import { $ } from 'bun'

console.log('🔄 Generating Supabase types...')

try {
  // Supabase型生成（ローカル環境から）
  await $`cd ../.. && supabase gen types typescript --local > frontend/packages/types/src/database.ts`

  console.log('✅ Type generation complete!')
} catch (error) {
  console.error('❌ Type generation failed:', error)
  process.exit(1)
}

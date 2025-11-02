#!/usr/bin/env bun

/**
 * Drizzle Migration Script
 *
 * このスクリプトは、Drizzleマイグレーション実行後に
 * カスタムSQL（pgvector拡張、関数、トリガーなど）を適用します。
 *
 * config/ ディレクトリ内の全ての .sql ファイルを自動的に検出し、
 * アルファベット順で順次実行します。
 * エラーが発生した場合でも処理を続行し、最後にサマリーを表示します。
 *
 * 使用方法:
 *   bun run drizzle/migrate.ts
 *
 * 環境変数:
 *   DATABASE_URL - PostgreSQL接続文字列（必須）
 */

import { readdirSync } from 'node:fs'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

async function main() {
  const databaseUrl = Bun.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is required')
    process.exit(1)
  }

  console.log('🔌 Connecting to database...')

  // PostgreSQL接続（マイグレーション実行後は接続を閉じるため max: 1）
  const client = postgres(databaseUrl, { max: 1 })
  const db = drizzle(client)

  try {
    console.log('📖 Reading SQL files from config/ directory...')

    // config/ ディレクトリ内の全 .sql ファイルを取得
    const configDir = `${import.meta.dir}/config`
    const sqlFiles = readdirSync(configDir)
      .filter((file) => file.endsWith('.sql'))
      .sort() // アルファベット順でソート（一貫性のため）

    if (sqlFiles.length === 0) {
      console.log('⚠️  No SQL files found in config/ directory')
      console.log('Skipping custom SQL execution.')
    } else {
      console.log(`Found ${sqlFiles.length} SQL file(s): ${sqlFiles.join(', ')}`)
      console.log('')

      // 各ファイルの実行結果を記録
      const results: Array<{ file: string; success: boolean; error?: string }> = []

      // 各SQLファイルを順次実行
      for (const file of sqlFiles) {
        try {
          console.log(`🔧 Executing ${file}...`)
          const sqlPath = `${configDir}/${file}`
          const sqlFile = Bun.file(sqlPath)
          const sqlContent = await sqlFile.text()

          // SQLを実行
          await db.execute(sql.raw(sqlContent))

          console.log(`✅ ${file} executed successfully`)
          results.push({ file, success: true })
        } catch (error) {
          console.error(`⚠️  Error executing ${file}:`)
          if (error instanceof Error) {
            console.error(`   ${error.message}`)
            results.push({ file, success: false, error: error.message })
          } else {
            console.error('   Unknown error occurred')
            results.push({ file, success: false, error: 'Unknown error' })
          }
          // エラーが発生しても続行
        }
        console.log('') // 空行で区切り
      }

      // 実行結果のサマリーを表示
      const successful = results.filter((r) => r.success)
      const failed = results.filter((r) => !r.success)

      console.log('📊 Execution Summary:')
      console.log(`  Total files: ${results.length}`)
      console.log(`  Successful: ${successful.length}`)
      console.log(`  Failed: ${failed.length}`)

      if (successful.length > 0) {
        console.log('')
        console.log('✅ Successfully executed:')
        for (const r of successful) {
          console.log(`  - ${r.file}`)
        }
      }

      if (failed.length > 0) {
        console.log('')
        console.log('❌ Failed to execute:')
        for (const r of failed) {
          console.log(`  - ${r.file}: ${r.error}`)
        }
        console.log('')
        console.log('⚠️  Some SQL files failed to execute. Please check the errors above.')
        // 失敗があっても exit(1) しない（警告のみ）
      }
    } // else ブロックの終了
  } catch (error) {
    console.error('❌ Fatal error during SQL execution:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error('   Unknown error occurred')
    }
    process.exit(1)
  } finally {
    // 接続を確実にクローズ
    await client.end()
  }
}

main()

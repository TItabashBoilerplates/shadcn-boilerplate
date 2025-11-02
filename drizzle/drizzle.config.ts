import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  // スキーマ定義ファイル（drizzle/ディレクトリからの相対パス）
  schema: './schema/index.ts',

  // マイグレーション出力先（Supabaseと統合）
  out: '../supabase/migrations',

  // PostgreSQL方言
  dialect: 'postgresql',

  // データベース接続（環境変数から取得）
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },

  // マイグレーション設定
  migrations: {
    // マイグレーションテーブル名
    table: '__drizzle_migrations',
    // スキーマ名
    schema: 'public',
  },

  // Supabaseが管理するスキーマを除外
  schemaFilter: ['public'],

  // Verbose モード（デバッグ用）
  verbose: true,
  strict: true,
})

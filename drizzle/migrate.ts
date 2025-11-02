#!/usr/bin/env bun
/**
 * Drizzle Migration Script
 *
 * このスクリプトは、Drizzleマイグレーション実行後に
 * カスタムSQL（pgvector拡張、関数、トリガー）を適用します。
 *
 * 使用方法:
 *   bun run drizzle/migrate.ts
 *
 * 環境変数:
 *   DATABASE_URL - PostgreSQL接続文字列（必須）
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

async function main() {
  const databaseUrl = Bun.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ Error: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("🔌 Connecting to database...");

  // PostgreSQL接続（マイグレーション実行後は接続を閉じるため max: 1）
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  try {
    console.log("📖 Reading custom SQL file...");
    // Bunのimport.meta.dirを使用してスクリプトのディレクトリを取得
    const customSqlPath = `${import.meta.dir}/config/functions.sql`;
    const customSqlFile = Bun.file(customSqlPath);
    const customSql = await customSqlFile.text();

    console.log(
      "🔧 Executing custom SQL (pgvector extension, functions, triggers)..."
    );

    // カスタムSQLを実行（Drizzleのsql.raw()を使用）
    await db.execute(sql.raw(customSql));

    console.log("✅ Custom SQL executed successfully!");
    console.log("");
    console.log("Applied:");
    console.log("  - pgvector extension");
    console.log("  - Auth hook functions (handle_new_user)");
    console.log("  - Auth triggers");
  } catch (error) {
    console.error("❌ Error executing custom SQL:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error("   Unknown error occurred");
    }
    process.exit(1);
  } finally {
    // 接続を確実にクローズ
    await client.end();
  }
}

main();

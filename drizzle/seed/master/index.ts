/**
 * Master Data Seeding
 *
 * This module seeds fixed/master data that should exist in all environments.
 * Master data is typically:
 * - Initial configuration values
 * - Default categories/types
 * - System-required records
 *
 * All master data seeds should be idempotent (safe to run multiple times).
 *
 * The `users` table needs no master seed — rows are created by the
 * `handle_new_user()` trigger on `auth.users` insertions.
 */
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../schema'
import { seedAppReleasePolicies } from './app-release-policies'

type Database = PostgresJsDatabase<typeof schema>

export async function seedMasterData(db: Database): Promise<void> {
  // Add master data seeds here in order of dependency.
  await seedAppReleasePolicies(db)
}

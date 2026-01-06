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
 */
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../schema'
import { seedOrganizations } from './organizations'

type Database = PostgresJsDatabase<typeof schema>

export async function seedMasterData(db: Database): Promise<void> {
  // Add master data seeds here in order of dependency
  await seedOrganizations(db)

  // Example: Add more master data seeds as needed
  // await seedCategories(db)
  // await seedDefaultSettings(db)
}

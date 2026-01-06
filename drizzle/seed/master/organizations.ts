/**
 * Organizations Master Data
 *
 * Seeds default organizations that should exist in the system.
 * Uses onConflictDoNothing to ensure idempotency.
 */
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schemaTypes from '../../schema'
import { organizations } from '../../schema'

type Database = PostgresJsDatabase<typeof schemaTypes>

export async function seedOrganizations(db: Database): Promise<void> {
  await db
    .insert(organizations)
    .values([
      { name: 'Demo Organization' },
      // Add more default organizations as needed
    ])
    .onConflictDoNothing()
}

#!/usr/bin/env bun
/**
 * Polar.sh Plan Sync Script
 *
 * This script syncs plan definitions from TypeScript code to Polar.sh.
 *
 * Usage:
 *   make polar-sync-dry   # Dry run - show what would change
 *   make polar-sync       # Actually sync to Polar.sh
 *
 * Environment Variables:
 *   POLAR_ACCESS_TOKEN    - Your Polar.sh access token
 *   POLAR_ORGANIZATION_ID - Your organization ID
 *   POLAR_SERVER          - 'sandbox' or 'production'
 */

import { Polar } from '@polar-sh/sdk'
import { planDefinitions, type ProductDefinition } from '../frontend/packages/polar/plans'
import type { PolarServer } from '../frontend/packages/polar/types'
import * as fs from 'node:fs'
import * as path from 'node:path'

const MAPPING_FILE = path.join(import.meta.dir, 'mapping.json')

interface ProductMapping {
  [key: string]: {
    productId: string
    priceIds: { [interval: string]: string }
  }
}

function getPolarClient(): Polar {
  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN environment variable is required')
  }

  const server = (process.env.POLAR_SERVER || 'sandbox') as PolarServer
  return new Polar({
    accessToken,
    server,
  })
}

function getOrganizationId(): string {
  const orgId = process.env.POLAR_ORGANIZATION_ID
  if (!orgId) {
    throw new Error('POLAR_ORGANIZATION_ID environment variable is required')
  }
  return orgId
}

function loadMapping(): ProductMapping {
  if (fs.existsSync(MAPPING_FILE)) {
    const content = fs.readFileSync(MAPPING_FILE, 'utf-8')
    return JSON.parse(content)
  }
  return {}
}

function saveMapping(mapping: ProductMapping): void {
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2))
}

async function syncProduct(
  polar: Polar,
  organizationId: string,
  key: string,
  definition: ProductDefinition,
  existingMapping: ProductMapping,
  dryRun: boolean
): Promise<{ productId: string; priceIds: { [interval: string]: string } }> {
  const existing = existingMapping[key]

  console.log(`\n📦 Processing: ${definition.name} (${key})`)

  if (existing) {
    console.log(`  Found existing mapping: ${existing.productId}`)

    if (dryRun) {
      console.log(`  [DRY RUN] Would update product`)
      return existing
    }

    // Update existing product
    try {
      await polar.products.update({
        id: existing.productId,
        body: {
          name: definition.name,
          description: definition.description,
        },
      })
      console.log(`  ✅ Updated product: ${existing.productId}`)
      return existing
    } catch (error) {
      console.error(`  ❌ Failed to update product:`, error)
      throw error
    }
  }

  // Create new product
  console.log(`  Creating new product...`)

  if (dryRun) {
    console.log(`  [DRY RUN] Would create product with ${definition.prices.length} price(s)`)
    return { productId: 'DRY_RUN', priceIds: {} }
  }

  try {
    // Prepare prices for creation
    const prices = definition.prices.map((price) => {
      if (price.type === 'recurring') {
        return {
          type: 'recurring' as const,
          amountType: 'fixed' as const,
          priceAmount: price.amount,
          priceCurrency: price.currency,
          recurringInterval: price.interval,
        }
      }
      return {
        type: 'one_time' as const,
        amountType: 'fixed' as const,
        priceAmount: price.amount,
        priceCurrency: price.currency,
      }
    })

    const response = await polar.products.create({
      body: {
        name: definition.name,
        description: definition.description,
        organizationId,
        prices,
      },
    })

    const priceIds: { [interval: string]: string } = {}
    if (response.prices) {
      for (let i = 0; i < response.prices.length; i++) {
        const price = response.prices[i]
        const defPrice = definition.prices[i]
        const interval = defPrice.type === 'recurring' ? defPrice.interval : 'one_time'
        priceIds[interval] = price.id
      }
    }

    console.log(`  ✅ Created product: ${response.id}`)
    return { productId: response.id, priceIds }
  } catch (error) {
    console.error(`  ❌ Failed to create product:`, error)
    throw error
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('🚀 Polar.sh Plan Sync')
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   Server: ${process.env.POLAR_SERVER || 'sandbox'}`)

  const polar = getPolarClient()
  const organizationId = getOrganizationId()

  console.log(`   Organization: ${organizationId}`)

  const existingMapping = loadMapping()
  const newMapping: ProductMapping = {}

  const productKeys = Object.keys(planDefinitions.products) as Array<
    keyof typeof planDefinitions.products
  >

  for (const key of productKeys) {
    const definition = planDefinitions.products[key]
    const result = await syncProduct(
      polar,
      organizationId,
      key,
      definition,
      existingMapping,
      dryRun
    )
    newMapping[key] = result
  }

  if (!dryRun) {
    saveMapping(newMapping)
    console.log(`\n💾 Mapping saved to: ${MAPPING_FILE}`)
  }

  console.log('\n✨ Sync complete!')
}

main().catch((error) => {
  console.error('\n❌ Sync failed:', error)
  process.exit(1)
})

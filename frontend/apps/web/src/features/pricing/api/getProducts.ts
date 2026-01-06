'use server'

import { getOrganizationId, getPolarClient } from '@workspace/polar/client'

/**
 * Polar SDK Product type from API response
 */
type PolarProduct = Awaited<
  ReturnType<ReturnType<typeof getPolarClient>['products']['list']>
>['result']['items'][number]

/**
 * Fetch all products from Polar.sh
 */
export async function getProducts(): Promise<PolarProduct[]> {
  const polar = getPolarClient()
  const organizationId = getOrganizationId()

  const response = await polar.products.list({
    organizationId,
    isArchived: false,
  })

  return response.result.items
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(productId: string): Promise<PolarProduct | null> {
  const polar = getPolarClient()

  try {
    const response = await polar.products.get({
      id: productId,
    })
    return response
  } catch {
    return null
  }
}

export type { PolarProduct }

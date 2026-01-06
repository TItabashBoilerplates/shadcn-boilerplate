'use client'

import { useTranslations } from 'next-intl'
import type { PolarProduct } from '../api/getProducts'
import { PricingCard } from './PricingCard'

interface PricingTableProps {
  products: PolarProduct[]
  userId?: string
  currentProductId?: string
  popularProductId?: string
}

export function PricingTable({
  products,
  userId,
  currentProductId,
  popularProductId,
}: PricingTableProps) {
  const t = useTranslations('Pricing')

  if (products.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        <p>No products available</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground mt-2">{t('description')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <PricingCard
            key={product.id}
            product={product}
            userId={userId}
            isCurrentPlan={product.id === currentProductId}
            isPopular={product.id === popularProductId}
          />
        ))}
      </div>
    </div>
  )
}

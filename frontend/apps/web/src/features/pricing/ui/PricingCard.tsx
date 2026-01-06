'use client'

import { useCheckout } from '@workspace/polar/hooks'
import { Badge } from '@workspace/ui/web/components/badge'
import { Button } from '@workspace/ui/web/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/web/components/card'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { PolarProduct } from '../api/getProducts'

interface PricingCardProps {
  product: PolarProduct
  userId?: string
  isCurrentPlan?: boolean
  isPopular?: boolean
}

type ProductPrice = PolarProduct['prices'][number]

function formatPrice(price: ProductPrice): string {
  // Check if it's a free price
  if ('amountType' in price && price.amountType === 'free') {
    return 'Free'
  }

  const amount = ('priceAmount' in price ? price.priceAmount : 0) / 100
  const currency = 'priceCurrency' in price ? price.priceCurrency?.toUpperCase() : 'USD'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
  }).format(amount)
}

function getPriceInterval(price: ProductPrice, t: ReturnType<typeof useTranslations>): string {
  if (!('recurringInterval' in price) || !price.recurringInterval) {
    return t('oneTime')
  }

  if (price.recurringInterval === 'month') {
    return t('perMonth')
  }

  if (price.recurringInterval === 'year') {
    return t('perYear')
  }

  return ''
}

export function PricingCard({
  product,
  userId,
  isCurrentPlan = false,
  isPopular = false,
}: PricingCardProps) {
  const t = useTranslations('Pricing')
  const { checkout, isLoading } = useCheckout()

  const price = product.prices?.[0]
  const isSubscription = product.isRecurring

  const handleClick = () => {
    if (isCurrentPlan || !userId) return
    checkout({
      productId: product.id,
      metadata: { user_id: userId },
    })
  }

  return (
    <Card className={`relative flex flex-col ${isPopular ? 'border-primary shadow-lg' : ''}`}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default">
          {t('mostPopular')}
        </Badge>
      )}

      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-4xl font-bold">{price ? formatPrice(price) : 'N/A'}</span>
          {price && <span className="text-muted-foreground">{getPriceInterval(price, t)}</span>}
        </div>

        {product.benefits && product.benefits.length > 0 && (
          <ul className="space-y-2">
            {product.benefits.map((benefit) => (
              <li key={benefit.id} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">{benefit.description}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={handleClick}
          disabled={isCurrentPlan || isLoading || !userId}
          variant={isCurrentPlan ? 'outline' : 'default'}
        >
          {isCurrentPlan ? t('currentPlan') : isSubscription ? t('subscribe') : t('purchase')}
        </Button>
      </CardFooter>
    </Card>
  )
}

'use client'

import { useCustomerPortal, useSubscription } from '@workspace/polar/hooks'
import type { SubscriptionStatus as SubscriptionStatusValue } from '@workspace/polar/types'
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
import { Calendar, CreditCard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface SubscriptionStatusProps {
  polarCustomerId?: string
}

function getStatusVariant(
  status: SubscriptionStatusValue
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'default'
    case 'canceled':
    case 'past_due':
    case 'unpaid':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  return new Intl.DateTimeFormat('default', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString))
}

export function SubscriptionStatus({ polarCustomerId }: SubscriptionStatusProps) {
  const t = useTranslations('Subscription')
  const { subscription, isLoading } = useSubscription()
  const { openPortal, isLoading: isPortalLoading } = useCustomerPortal()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('noSubscription')}</p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <a href="/pricing">{t('viewPlans')}</a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const statusKey = subscription.status.replace(/_/g, '') as
    | 'active'
    | 'canceled'
    | 'pastDue'
    | 'trialing'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('title')}</CardTitle>
          <Badge variant={getStatusVariant(subscription.status)}>
            {t(statusKey) || subscription.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          <span>Product ID: {subscription.productId}</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {t('currentPeriodEnd')}: {formatDate(subscription.currentPeriodEnd)}
          </span>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => polarCustomerId && openPortal(polarCustomerId)}
          disabled={!polarCustomerId || isPortalLoading}
          variant="outline"
        >
          {t('manageSubscription')}
        </Button>
      </CardFooter>
    </Card>
  )
}

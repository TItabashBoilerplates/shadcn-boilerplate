/**
 * プラン定義
 *
 * このファイルでプロジェクトの製品・価格を定義し、
 * `make polar-sync` で Polar.sh と同期します。
 *
 * 注意:
 * - POLAR_ORGANIZATION_ID は環境変数から取得
 * - Benefit は事前に Polar ダッシュボードで作成してください
 * - 同期後、mapping.json に Polar ID が記録されます
 */
import type { PlanDefinitions } from './types'

/**
 * プラン定義
 *
 * プロジェクトに合わせてカスタマイズしてください。
 * 以下はサンプルプランです。
 */
export const planDefinitions: PlanDefinitions = {
  // 環境変数から取得（sync スクリプト実行時に設定）
  organizationId: process.env.POLAR_ORGANIZATION_ID ?? '',

  products: [
    // ===== サブスクリプションプラン =====
    {
      key: 'starter',
      name: 'Starter Plan',
      description: 'For individuals getting started. Basic features included.',
      type: 'subscription',
      prices: [
        { amount: 900, currency: 'usd', recurringInterval: 'month' },
        { amount: 9000, currency: 'usd', recurringInterval: 'year' }, // 2ヶ月分お得
      ],
      metadata: {
        tier: 'starter',
        features: 'basic',
      },
    },
    {
      key: 'pro',
      name: 'Pro Plan',
      description: 'For professionals and small teams. All features included.',
      type: 'subscription',
      prices: [
        { amount: 2900, currency: 'usd', recurringInterval: 'month' },
        { amount: 29000, currency: 'usd', recurringInterval: 'year' }, // 2ヶ月分お得
      ],
      metadata: {
        tier: 'pro',
        features: 'all',
      },
    },
    {
      key: 'enterprise',
      name: 'Enterprise Plan',
      description: 'For large organizations. Priority support and custom features.',
      type: 'subscription',
      prices: [
        { amount: 9900, currency: 'usd', recurringInterval: 'month' },
        { amount: 99000, currency: 'usd', recurringInterval: 'year' }, // 2ヶ月分お得
      ],
      metadata: {
        tier: 'enterprise',
        features: 'all',
        support: 'priority',
      },
    },

    // ===== 単発購入プラン =====
    {
      key: 'lifetime',
      name: 'Lifetime Access',
      description: 'One-time purchase for lifetime access to all features.',
      type: 'one_time',
      prices: [{ amount: 49900, currency: 'usd' }],
      metadata: {
        tier: 'lifetime',
        features: 'all',
      },
    },
  ],
}

/**
 * プランキーから製品定義を取得
 */
export function getProductByKey(key: string) {
  return planDefinitions.products.find((p) => p.key === key)
}

/**
 * サブスクリプションプランのみ取得
 */
export function getSubscriptionProducts() {
  return planDefinitions.products.filter((p) => p.type === 'subscription')
}

/**
 * 単発購入プランのみ取得
 */
export function getOneTimeProducts() {
  return planDefinitions.products.filter((p) => p.type === 'one_time')
}

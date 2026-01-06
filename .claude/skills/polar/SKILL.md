# Polar.sh Integration Skill

Polar.sh を使用した課金・サブスクリプション管理のガイダンス。

## 概要

このプロジェクトでは Polar.sh を使用して以下の機能を提供：

- **サブスクリプション管理**: 月額/年額プランの自動更新
- **単発購入**: 一回きりの購入（ライフタイムライセンスなど）
- **顧客ポータル**: ユーザー自身でサブスク管理

## アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend       │ ──> │  API Routes     │ ──> │  Polar.sh       │
│  (Next.js)      │     │  (/api/*)       │     │  (External)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        v
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Edge Functions │ <── │  Webhooks       │
                        │  (polar-webhooks)│    │  (Events)       │
                        └─────────────────┘     └─────────────────┘
                                │
                                v
                        ┌─────────────────┐
                        │  Supabase DB    │
                        │  (subscriptions,│
                        │   orders)       │
                        └─────────────────┘
```

## ディレクトリ構成

```
frontend/packages/polar/          # 共通パッケージ
├── client/                       # Polar SDK クライアント
├── plans/                        # プラン定義（TypeScript）
├── hooks/                        # React Hooks
└── types/                        # 型定義

frontend/apps/web/
├── app/api/
│   ├── checkout/route.ts         # チェックアウト API
│   └── portal/route.ts           # 顧客ポータル API
└── src/features/
    ├── pricing/                  # 料金表示機能
    └── subscription/             # サブスク管理機能

supabase/functions/
└── polar-webhooks/               # Webhook ハンドラー

scripts/polar/
└── sync.ts                       # プラン同期スクリプト
```

## 環境変数

### env/secrets.env

```env
POLAR_ACCESS_TOKEN=       # Polar.sh Organization Access Token
POLAR_WEBHOOK_SECRET=     # Webhook署名検証用シークレット
POLAR_ORGANIZATION_ID=    # 組織ID
```

### env/frontend/local.env

```env
POLAR_SERVER=sandbox      # sandbox | production
```

## プラン定義

### 構造

```typescript
// frontend/packages/polar/plans/definitions.ts
export const planDefinitions: PlanDefinitions = {
  products: {
    starter: {
      name: 'Starter',
      description: '個人向けプラン',
      type: 'subscription',
      prices: [
        { type: 'recurring', amount: 990, currency: 'usd', interval: 'month' },
        { type: 'recurring', amount: 9900, currency: 'usd', interval: 'year' },
      ],
      benefits: ['feature_basic'],
    },
    // ...
  },
}
```

### 同期

```bash
# Dry run（変更確認）
make polar-sync-dry

# 実際に同期
make polar-sync
```

## 使用方法

### チェックアウト

```typescript
import { useCheckout } from '@workspace/polar/hooks'

function PricingButton({ productId, userId }) {
  const { checkout, isLoading } = useCheckout()

  return (
    <button
      onClick={() => checkout({
        productId,
        metadata: { user_id: userId },
      })}
      disabled={isLoading}
    >
      購入する
    </button>
  )
}
```

### サブスクリプション状態

```typescript
import { useSubscription } from '@workspace/polar/hooks'

function SubscriptionBadge() {
  const { subscription, isActive } = useSubscription()

  if (!subscription) return null

  return <span>{isActive ? 'アクティブ' : subscription.status}</span>
}
```

### 顧客ポータル

```typescript
import { useCustomerPortal } from '@workspace/polar/hooks'

function ManageButton({ customerId }) {
  const { openPortal, isLoading } = useCustomerPortal()

  return (
    <button onClick={() => openPortal(customerId)} disabled={isLoading}>
      サブスク管理
    </button>
  )
}
```

## データベーススキーマ

### subscriptions テーブル

| カラム               | 型        | 説明                   |
| -------------------- | --------- | ---------------------- |
| id                   | TEXT (PK) | Polar subscription ID  |
| user_id              | UUID (FK) | users.id               |
| polar_product_id     | TEXT      | Polar product ID       |
| polar_price_id       | TEXT      | Polar price ID         |
| status               | ENUM      | サブスク状態           |
| current_period_start | TIMESTAMP | 現在の期間開始         |
| current_period_end   | TIMESTAMP | 現在の期間終了         |
| cancel_at_period_end | INTEGER   | 期間終了時にキャンセル |

### orders テーブル

| カラム           | 型        | 説明            |
| ---------------- | --------- | --------------- |
| id               | TEXT (PK) | Polar order ID  |
| user_id          | UUID (FK) | users.id |
| polar_product_id | TEXT      | Polar product ID |
| polar_price_id   | TEXT      | Polar price ID  |
| status           | ENUM      | 注文状態        |
| amount           | INTEGER   | 金額（cents）   |
| currency         | TEXT      | 通貨            |

### user_profiles

| カラム            | 型   | 説明                |
| ----------------- | ---- | ------------------- |
| polar_customer_id | TEXT | Polar customer ID   |

## Webhook イベント

### サブスクリプション

- `subscription.created` - 新規作成
- `subscription.updated` - 更新
- `subscription.canceled` - キャンセル
- `subscription.active` - アクティブ化
- `subscription.revoked` - 取り消し
- `subscription.uncanceled` - キャンセル解除

### 注文（単発購入）

- `order.created` - 作成
- `order.paid` - 支払い完了
- `order.refunded` - 返金

### 顧客

- `customer.created` - 顧客作成
- `customer.updated` - 顧客更新

### チェックアウト

- `checkout.created` - チェックアウト開始
- `checkout.updated` - チェックアウト更新/完了

## RLS ポリシー

### subscriptions / orders

- `INSERT/UPDATE`: `service_role` のみ（Webhook 経由）
- `SELECT`: 認証済みユーザーが自分のレコードのみ閲覧可能

## コマンド一覧

| コマンド                  | 説明                         |
| ------------------------- | ---------------------------- |
| `make polar-sync-dry`     | プラン同期（Dry run）        |
| `make polar-sync`         | プラン同期（実行）           |
| `make deploy-polar-webhooks` | Webhook Function デプロイ |

## 注意事項

### Sandbox vs Production

- 開発中は `POLAR_SERVER=sandbox` を使用
- 本番環境では `POLAR_SERVER=production` に変更
- 環境ごとに異なる Organization Access Token が必要

### Webhook 署名検証

- すべての Webhook リクエストは署名検証必須
- `POLAR_WEBHOOK_SECRET` で検証

### Metadata の活用

チェックアウト時に `user_id` を metadata に含めることで、Webhook 処理時にユーザーを特定：

```typescript
// フロントエンド
const checkoutUrl = `/api/checkout?productId=${productId}&metadata[user_id]=${userId}`
```

## SDK 型定義

### PolarProduct 型の取得

SDK の Product 型を取得するには、`listProducts` のレスポンスから推論：

```typescript
// frontend/packages/polar/types/product.ts
import { listProducts } from '@polar-sh/sdk/funcs/products'

// SDK関数の戻り値から型を推論
export type PolarProduct = Awaited<
  ReturnType<typeof listProducts>
>['result']['items'][number]
```

### Product 型の主要プロパティ

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `id` | `string` | 製品ID |
| `name` | `string` | 製品名 |
| `description` | `string \| null` | 説明 |
| `isRecurring` | `boolean` | サブスクリプションか否か |
| `prices` | `ProductPrice[]` | 価格リスト |
| `benefits` | `Benefit[]` | 特典リスト |

**注意**: `isRecurringProduct` ではなく `isRecurring` を使用。

```typescript
// ✅ 正しい
const isSubscription = product.isRecurring

// ❌ 存在しない
const isSubscription = product.isRecurringProduct
```

### Benefit 型

全ての Benefit 型（`BenefitBase`, `BenefitCustom`, `BenefitDownloadables` など）は `description` プロパティを持つ：

```typescript
// ✅ 直接アクセス可能
<span>{benefit.description}</span>
```

---

## API Routes 実装

### CustomerPortal

`@polar-sh/nextjs` の `CustomerPortal` は `getCustomerId` または `getExternalCustomerId` が必須：

```typescript
// app/api/portal/route.ts
import { CustomerPortal } from '@polar-sh/nextjs'
import type { NextRequest } from 'next/server'

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_SERVER || 'sandbox') as 'sandbox' | 'production',
  getCustomerId: async (req: NextRequest) => {
    // クエリパラメータから customerId を取得
    const customerId = req.nextUrl.searchParams.get('customerId')
    if (!customerId) {
      throw new Error('customerId is required')
    }
    return customerId
  },
})
```

**使用例**:
```typescript
// クライアント側
window.location.href = `/api/portal?customerId=${polarCustomerId}`
```

---

## パッケージ設定

### tsconfig.json

`@workspace/polar` パッケージの TypeScript 設定：

```json
{
  "extends": "../../tooling/typescript/base.json",
  "compilerOptions": {
    "composite": true,
    "baseUrl": ".",
    "outDir": "./dist",
    "rootDir": ".",
    "declaration": true,
    "declarationMap": true,
    "types": ["node"]
  },
  "include": ["./**/*.ts", "./**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

**重要ポイント**:
- `extends`: `../../tooling/typescript/base.json` を使用（`esModuleInterop: true` が必要）
- `types`: `["node"]` で `process` 等の Node.js グローバル型を有効化

### 依存関係

```json
{
  "dependencies": {
    "@polar-sh/sdk": "^0.42.1"
  },
  "devDependencies": {
    "@types/node": "^22.x"
  }
}
```

---

## トラブルシューティング

### Webhook が動作しない

1. `POLAR_WEBHOOK_SECRET` が正しいか確認
2. Polar ダッシュボードで Webhook URL が正しいか確認
3. Edge Function のログを確認

### チェックアウトがエラー

1. `POLAR_ACCESS_TOKEN` が有効か確認
2. `POLAR_ORGANIZATION_ID` が正しいか確認
3. 製品が Polar ダッシュボードで公開されているか確認

### 型エラー: `Cannot find name 'process'`

`@workspace/polar` パッケージで発生する場合：

1. `@types/node` が devDependencies にあるか確認
2. `tsconfig.json` に `"types": ["node"]` があるか確認

### 型エラー: `isRecurringProduct does not exist`

SDK v0.42+ では `isRecurringProduct` → `isRecurring` に変更：

```typescript
// ✅ 正しい
product.isRecurring

// ❌ 旧API（存在しない）
product.isRecurringProduct
```

### CustomerPortal エラー: `getExternalCustomerId is required`

`CustomerPortal` には `getCustomerId` または `getExternalCustomerId` のいずれかが必須：

```typescript
export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: 'sandbox',
  getCustomerId: async (req) => {
    return req.nextUrl.searchParams.get('customerId')!
  },
})
```

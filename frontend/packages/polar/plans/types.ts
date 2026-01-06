/**
 * プラン定義の型
 *
 * プロジェクト内でプランを定義し、Polar.sh と同期するためのスキーマ
 */

/**
 * 課金間隔
 */
export type RecurringInterval = 'day' | 'week' | 'month' | 'year'

/**
 * 製品タイプ
 */
export type ProductType = 'subscription' | 'one_time'

/**
 * 価格定義
 */
export interface PriceDefinition {
  /** 価格（最小通貨単位: USD=セント, JPY=円） */
  amount: number
  /** 通貨コード */
  currency: 'usd' | 'jpy'
  /** サブスクリプションの場合の課金間隔 */
  recurringInterval?: RecurringInterval
}

/**
 * Benefit（特典）定義
 *
 * 注意: Benefit は事前に Polar ダッシュボードで作成し、ID を参照する
 */
export interface BenefitReference {
  /** Polar Benefit ID */
  id: string
  /** 表示名（参照用） */
  name: string
}

/**
 * 製品定義
 */
export interface ProductDefinition {
  /** ローカル識別子（コード管理用、スネークケース推奨） */
  key: string

  /** Polar Product ID（同期後に mapping.json から設定） */
  polarId?: string

  /** 製品名 */
  name: string

  /** 説明 */
  description: string

  /** 製品タイプ */
  type: ProductType

  /** 価格設定（複数可: 月額/年額など） */
  prices: PriceDefinition[]

  /** 関連する Benefits */
  benefits?: BenefitReference[]

  /** カスタムメタデータ */
  metadata?: Record<string, string | number | boolean>

  /** アーカイブ済み（非表示）かどうか */
  isArchived?: boolean
}

/**
 * プラン定義全体
 */
export interface PlanDefinitions {
  /** Polar Organization ID */
  organizationId: string

  /** 製品リスト */
  products: ProductDefinition[]
}

/**
 * 製品マッピング（ローカルキー → Polar ID）
 */
export interface ProductMapping {
  [key: string]: {
    /** Polar Product ID */
    polarId: string
    /** Price ID マッピング（interval → priceId） */
    priceIds: Record<string, string>
    /** 最終同期日時 */
    syncedAt: string
  }
}

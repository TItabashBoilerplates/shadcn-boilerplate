import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import type { z } from 'zod'
import { orders, subscriptions, userProfiles, users } from './schema/index.ts'

// Insert schemas (Form / API payload 用ベース)
export const usersInsertSchema = createInsertSchema(users)
export const userProfilesInsertSchema = createInsertSchema(userProfiles)
export const subscriptionsInsertSchema = createInsertSchema(subscriptions)
export const ordersInsertSchema = createInsertSchema(orders)

// Update schemas (PATCH 系で各フィールドを optional 化)
export const usersUpdateSchema = createUpdateSchema(users)
export const userProfilesUpdateSchema = createUpdateSchema(userProfiles)
export const subscriptionsUpdateSchema = createUpdateSchema(subscriptions)
export const ordersUpdateSchema = createUpdateSchema(orders)

// Select schemas (取得値の型安全用)
export const usersSelectSchema = createSelectSchema(users)
export const userProfilesSelectSchema = createSelectSchema(userProfiles)
export const subscriptionsSelectSchema = createSelectSchema(subscriptions)
export const ordersSelectSchema = createSelectSchema(orders)

// 推論型 (drizzle 側の InferSelectModel/InferInsertModel と等価だが zod 経由で揃える)
export type UsersInsert = z.infer<typeof usersInsertSchema>
export type UsersUpdate = z.infer<typeof usersUpdateSchema>
export type UsersSelect = z.infer<typeof usersSelectSchema>

export type UserProfilesInsert = z.infer<typeof userProfilesInsertSchema>
export type UserProfilesUpdate = z.infer<typeof userProfilesUpdateSchema>
export type UserProfilesSelect = z.infer<typeof userProfilesSelectSchema>

export type SubscriptionsInsert = z.infer<typeof subscriptionsInsertSchema>
export type SubscriptionsUpdate = z.infer<typeof subscriptionsUpdateSchema>
export type SubscriptionsSelect = z.infer<typeof subscriptionsSelectSchema>

export type OrdersInsert = z.infer<typeof ordersInsertSchema>
export type OrdersUpdate = z.infer<typeof ordersUpdateSchema>
export type OrdersSelect = z.infer<typeof ordersSelectSchema>

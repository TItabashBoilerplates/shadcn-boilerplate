import { sql } from "drizzle-orm";
import {
  integer,
  pgPolicy,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
// NOTE: Deno互換のため、拡張子を明示
import { orderStatusEnum, subscriptionStatusEnum } from "./types.ts";

// ===== Users テーブル（RLS付き） =====
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  accountName: text("account_name").notNull().unique(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
}).enableRLS();

// ===== Users RLS ポリシー =====

// Auth Hook用ポリシー（supabase_auth_admin専用）
export const insertPolicyUsers = pgPolicy("insert_policy_users", {
  for: "insert",
  to: "supabase_auth_admin",
  withCheck: sql`true`,
}).link(users);

// 全ユーザーが全usersを閲覧可能
export const selectOwnUser = pgPolicy("select_own_user", {
  for: "select",
  to: ["anon", "authenticated"],
  using: sql`true`,
}).link(users);

// 自分のユーザー情報のみ編集可能
export const editPolicyUsers = pgPolicy("edit_policy_users", {
  for: "all",
  to: "authenticated",
  using: sql`(SELECT auth.uid()) = id`,
  withCheck: sql`(SELECT auth.uid()) = id`,
}).link(users);

// ===== User Profiles テーブル（RLS付き） =====
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number"),
  // Polar.sh Customer ID (秘匿性が高いためprofileテーブルに配置)
  polarCustomerId: text("polar_customer_id").unique(),
}).enableRLS();

// ===== User Profiles RLS ポリシー =====

// 自分のプロフィールのみ閲覧可能
export const selectOwnProfile = pgPolicy("select_own_profile", {
  for: "select",
  to: "authenticated",
  using: sql`
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = user_id
      AND users.id = (SELECT auth.uid())
    )
  `,
}).link(userProfiles);

// 自分のプロフィールのみ編集可能
export const insertPolicyUserProfiles = pgPolicy(
  "insert_policy_user_profiles",
  {
    for: "all",
    to: "authenticated",
    using: sql`
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = user_id
      AND users.id = (SELECT auth.uid())
    )
  `,
    withCheck: sql`
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = user_id
      AND users.id = (SELECT auth.uid())
    )
  `,
  },
).link(userProfiles);

// ===== Subscriptions テーブル（Polar.sh, RLS付き） =====
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(), // Polar subscription ID
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  polarProductId: text("polar_product_id").notNull(),
  polarPriceId: text("polar_price_id").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("incomplete"),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
    precision: 3,
  }),
  currentPeriodEnd: timestamp("current_period_end", {
    withTimezone: true,
    precision: 3,
  }),
  cancelAtPeriodEnd: integer("cancel_at_period_end").notNull().default(0), // boolean as int for compatibility
  createdAt: timestamp("created_at", {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
}).enableRLS();

// ===== Subscriptions RLS ポリシー =====

// Edge Functions（Webhook）用ポリシー
export const insertPolicySubscriptions = pgPolicy(
  "insert_policy_subscriptions",
  {
    for: "insert",
    to: "service_role",
    withCheck: sql`true`,
  },
).link(subscriptions);

export const updatePolicySubscriptions = pgPolicy(
  "update_policy_subscriptions",
  {
    for: "update",
    to: "service_role",
    using: sql`true`,
    withCheck: sql`true`,
  },
).link(subscriptions);

// 自分のサブスクリプションのみ閲覧可能
export const selectPolicySubscriptions = pgPolicy(
  "select_policy_subscriptions",
  {
    for: "select",
    to: "authenticated",
    using: sql`(SELECT auth.uid()) = user_id`,
  },
).link(subscriptions);

// ===== Orders テーブル（Polar.sh 単発購入, RLS付き） =====
export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // Polar order ID
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  polarProductId: text("polar_product_id").notNull(),
  polarPriceId: text("polar_price_id").notNull(),
  status: orderStatusEnum("status").notNull().default("paid"),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").notNull().default("usd"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
}).enableRLS();

// ===== Orders RLS ポリシー =====

// Edge Functions（Webhook）用ポリシー
export const insertPolicyOrders = pgPolicy("insert_policy_orders", {
  for: "insert",
  to: "service_role",
  withCheck: sql`true`,
}).link(orders);

export const updatePolicyOrders = pgPolicy("update_policy_orders", {
  for: "update",
  to: "service_role",
  using: sql`true`,
  withCheck: sql`true`,
}).link(orders);

// 自分の注文のみ閲覧可能
export const selectPolicyOrders = pgPolicy("select_policy_orders", {
  for: "select",
  to: "authenticated",
  using: sql`(SELECT auth.uid()) = user_id`,
}).link(orders);

// ===== 型エクスポート（Inferで自動推論） =====
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// SELECT型（既存レコードの型）
export type User = InferSelectModel<typeof users>;
export type UserProfile = InferSelectModel<typeof userProfiles>;
export type Subscription = InferSelectModel<typeof subscriptions>;
export type Order = InferSelectModel<typeof orders>;

// INSERT型（新規作成時の型）
export type NewUser = InferInsertModel<typeof users>;
export type NewUserProfile = InferInsertModel<typeof userProfiles>;
export type NewSubscription = InferInsertModel<typeof subscriptions>;
export type NewOrder = InferInsertModel<typeof orders>;

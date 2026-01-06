import { sql } from 'drizzle-orm'
import {
  check,
  customType,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
// NOTE: Deno互換のため、拡張子を明示
import { chatTypeEnum, orderStatusEnum, subscriptionStatusEnum } from './types.ts'

// pgvector型のカスタム定義
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value)
  },
})

// ===== Organizations テーブル =====
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
})

// ===== Corporate Users テーブル（RLS付き） =====
export const corporateUsers = pgTable('corporate_users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull().default(''),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
}).enableRLS()

// ===== Users テーブル（RLS付き） =====
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull().default(''),
  accountName: text('account_name').notNull().unique(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
}).enableRLS()

// ===== Users RLS ポリシー =====

// Auth Hook用ポリシー（supabase_auth_admin専用）
export const insertPolicyUsers = pgPolicy('insert_policy_users', {
  for: 'insert',
  to: 'supabase_auth_admin',
  withCheck: sql`true`,
}).link(users)

// 全ユーザーが全usersを閲覧可能
export const selectOwnUser = pgPolicy('select_own_user', {
  for: 'select',
  to: ['anon', 'authenticated'],
  using: sql`true`,
}).link(users)

// 自分のユーザー情報のみ編集可能
export const editPolicyUsers = pgPolicy('edit_policy_users', {
  for: 'all',
  to: 'authenticated',
  using: sql`(SELECT auth.uid()) = id`,
  withCheck: sql`(SELECT auth.uid()) = id`,
}).link(users)

// ===== User Profiles テーブル（RLS付き） =====
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull().default(''),
  lastName: text('last_name').notNull().default(''),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  phoneNumber: text('phone_number'),
  // Polar.sh Customer ID (秘匿性が高いためprofileテーブルに配置)
  polarCustomerId: text('polar_customer_id').unique(),
}).enableRLS()

// ===== User Profiles RLS ポリシー =====

// 自分のプロフィールのみ閲覧可能
export const selectOwnProfile = pgPolicy('select_own_profile', {
  for: 'select',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = user_id
      AND users.id = (SELECT auth.uid())
    )
  `,
}).link(userProfiles)

// 自分のプロフィールのみ編集可能
export const insertPolicyUserProfiles = pgPolicy('insert_policy_user_profiles', {
  for: 'all',
  to: 'authenticated',
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
}).link(userProfiles)

// ===== Addresses テーブル（RLS付き） =====
export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  street: text('street').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').notNull(),
  profileId: integer('profile_id')
    .unique()
    .references(() => userProfiles.id, {
      onDelete: 'cascade',
    }),
}).enableRLS()

// ===== Chat Rooms テーブル（RLS付き） =====
export const chatRooms = pgTable('chat_rooms', {
  id: serial('id').primaryKey(),
  type: chatTypeEnum('type').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
}).enableRLS()

// ===== Chat Rooms RLS ポリシー =====

// 参加しているチャットルームのみ閲覧可能
export const selectPolicyChatRooms = pgPolicy('select_policy_chat_rooms', {
  for: 'select',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN users ON user_chats.user_id = users.id
      WHERE user_chats.chat_room_id = chat_rooms.id
      AND users.id = (SELECT auth.uid())
    )
  `,
}).link(chatRooms)

// 参加しているチャットルームのみ編集可能
export const modifyPolicyChatRooms = pgPolicy('modify_policy_chat_rooms', {
  for: 'all',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN users ON user_chats.user_id = users.id
      WHERE user_chats.chat_room_id = chat_rooms.id
      AND users.id = (SELECT auth.uid())
    )
  `,
  withCheck: sql`
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN users ON user_chats.user_id = users.id
      WHERE user_chats.chat_room_id = chat_rooms.id
      AND users.id = (SELECT auth.uid())
    )
  `,
}).link(chatRooms)

// ===== Virtual Users テーブル =====
export const virtualUsers = pgTable('virtual_users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
})

// ===== Messages テーブル（check制約+RLS付き） =====
export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    chatRoomId: integer('chat_room_id')
      .notNull()
      .references(() => chatRooms.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    virtualUserId: uuid('virtual_user_id').references(() => virtualUsers.id, {
      onDelete: 'cascade',
    }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  () => ({
    // Check制約: sender_idかvirtual_user_idのどちらか一方のみがNULLでないこと
    senderCheck: check(
      'sender_check',
      sql`(sender_id IS NOT NULL AND virtual_user_id IS NULL) OR (sender_id IS NULL AND virtual_user_id IS NOT NULL)`
    ),
  })
).enableRLS()

// ===== Messages RLS ポリシー =====

// 参加しているチャットルームのメッセージのみ閲覧可能
export const selectPolicyMessages = pgPolicy('select_policy_messages', {
  for: 'select',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN users ON user_chats.user_id = users.id
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND users.id = (SELECT auth.uid())
    )
  `,
}).link(messages)

// 参加しているチャットルームのメッセージのみ編集可能
export const modifyPolicyMessages = pgPolicy('modify_policy_messages', {
  for: 'all',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN users ON user_chats.user_id = users.id
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND users.id = (SELECT auth.uid())
    )
  `,
  withCheck: sql`
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN users ON user_chats.user_id = users.id
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND users.id = (SELECT auth.uid())
    )
  `,
}).link(messages)

// ===== User Chats テーブル（RLS付き） =====
export const userChats = pgTable(
  'user_chats',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    chatRoomId: integer('chat_room_id')
      .notNull()
      .references(() => chatRooms.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('user_chats_user_id_chat_room_id_key').on(table.userId, table.chatRoomId)]
).enableRLS()

// ===== User Chats RLS ポリシー =====

// 自分のチャット参加記録のみ閲覧可能
export const selectPolicyUserChats = pgPolicy('select_policy_user_chats', {
  for: 'select',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = user_chats.user_id
      AND users.id = (SELECT auth.uid())
    )
  `,
}).link(userChats)

// 自分のチャット参加記録のみ編集可能
export const modifyPolicyUserChats = pgPolicy('modify_policy_user_chats', {
  for: 'all',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = user_chats.user_id
      AND users.id = (SELECT auth.uid())
    )
  `,
  withCheck: sql`
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = user_chats.user_id
      AND users.id = (SELECT auth.uid())
    )
  `,
}).link(userChats)

// ===== Virtual User Chats テーブル =====
export const virtualUserChats = pgTable(
  'virtual_user_chats',
  {
    id: serial('id').primaryKey(),
    virtualUserId: uuid('virtual_user_id')
      .notNull()
      .references(() => virtualUsers.id, { onDelete: 'cascade' }),
    chatRoomId: integer('chat_room_id')
      .notNull()
      .references(() => chatRooms.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('virtual_user_chats_virtual_user_id_chat_room_id_key').on(
      table.virtualUserId,
      table.chatRoomId
    ),
  ]
)

// ===== Virtual User Profiles テーブル =====
export const virtualUserProfiles = pgTable('virtual_user_profiles', {
  id: serial('id').primaryKey(),
  personality: text('personality').notNull().default('friendly'),
  tone: text('tone').notNull().default('casual'),
  knowledgeArea: text('knowledge_area').array().notNull(),
  quirks: text('quirks').default(''),
  backstory: text('backstory').notNull().default(''),
  knowledge: jsonb('knowledge'),
  virtualUserId: uuid('virtual_user_id')
    .notNull()
    .references(() => virtualUsers.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
})

// ===== Embeddings テーブル（pgvector） =====
export const embeddings = pgTable('embeddings', {
  id: text('id').primaryKey(),
  // pgvector型（カスタム型定義）
  embedding: vector('embedding').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
})

// ===== Subscriptions テーブル（Polar.sh, RLS付き） =====
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(), // Polar subscription ID
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  polarProductId: text('polar_product_id').notNull(),
  polarPriceId: text('polar_price_id').notNull(),
  status: subscriptionStatusEnum('status').notNull().default('incomplete'),
  currentPeriodStart: timestamp('current_period_start', {
    withTimezone: true,
    precision: 3,
  }),
  currentPeriodEnd: timestamp('current_period_end', {
    withTimezone: true,
    precision: 3,
  }),
  cancelAtPeriodEnd: integer('cancel_at_period_end').notNull().default(0), // boolean as int for compatibility
  createdAt: timestamp('created_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
}).enableRLS()

// ===== Subscriptions RLS ポリシー =====

// Edge Functions（Webhook）用ポリシー
export const insertPolicySubscriptions = pgPolicy('insert_policy_subscriptions', {
  for: 'insert',
  to: 'service_role',
  withCheck: sql`true`,
}).link(subscriptions)

export const updatePolicySubscriptions = pgPolicy('update_policy_subscriptions', {
  for: 'update',
  to: 'service_role',
  using: sql`true`,
  withCheck: sql`true`,
}).link(subscriptions)

// 自分のサブスクリプションのみ閲覧可能
export const selectPolicySubscriptions = pgPolicy('select_policy_subscriptions', {
  for: 'select',
  to: 'authenticated',
  using: sql`(SELECT auth.uid()) = user_id`,
}).link(subscriptions)

// ===== Orders テーブル（Polar.sh 単発購入, RLS付き） =====
export const orders = pgTable('orders', {
  id: text('id').primaryKey(), // Polar order ID
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  polarProductId: text('polar_product_id').notNull(),
  polarPriceId: text('polar_price_id').notNull(),
  status: orderStatusEnum('status').notNull().default('paid'),
  amount: integer('amount').notNull(), // in cents
  currency: text('currency').notNull().default('usd'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
}).enableRLS()

// ===== Orders RLS ポリシー =====

// Edge Functions（Webhook）用ポリシー
export const insertPolicyOrders = pgPolicy('insert_policy_orders', {
  for: 'insert',
  to: 'service_role',
  withCheck: sql`true`,
}).link(orders)

export const updatePolicyOrders = pgPolicy('update_policy_orders', {
  for: 'update',
  to: 'service_role',
  using: sql`true`,
  withCheck: sql`true`,
}).link(orders)

// 自分の注文のみ閲覧可能
export const selectPolicyOrders = pgPolicy('select_policy_orders', {
  for: 'select',
  to: 'authenticated',
  using: sql`(SELECT auth.uid()) = user_id`,
}).link(orders)

// ===== 型エクスポート（Inferで自動推論） =====
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

// SELECT型（既存レコードの型）
export type Organization = InferSelectModel<typeof organizations>
export type CorporateUser = InferSelectModel<typeof corporateUsers>
export type User = InferSelectModel<typeof users>
export type UserProfile = InferSelectModel<typeof userProfiles>
export type Address = InferSelectModel<typeof addresses>
export type ChatRoom = InferSelectModel<typeof chatRooms>
export type Message = InferSelectModel<typeof messages>
export type UserChat = InferSelectModel<typeof userChats>
export type VirtualUser = InferSelectModel<typeof virtualUsers>
export type VirtualUserChat = InferSelectModel<typeof virtualUserChats>
export type VirtualUserProfile = InferSelectModel<typeof virtualUserProfiles>
export type Embedding = InferSelectModel<typeof embeddings>
export type Subscription = InferSelectModel<typeof subscriptions>
export type Order = InferSelectModel<typeof orders>

// INSERT型（新規作成時の型）
export type NewOrganization = InferInsertModel<typeof organizations>
export type NewCorporateUser = InferInsertModel<typeof corporateUsers>
export type NewUser = InferInsertModel<typeof users>
export type NewUserProfile = InferInsertModel<typeof userProfiles>
export type NewAddress = InferInsertModel<typeof addresses>
export type NewChatRoom = InferInsertModel<typeof chatRooms>
export type NewMessage = InferInsertModel<typeof messages>
export type NewUserChat = InferInsertModel<typeof userChats>
export type NewVirtualUser = InferInsertModel<typeof virtualUsers>
export type NewVirtualUserChat = InferInsertModel<typeof virtualUserChats>
export type NewVirtualUserProfile = InferInsertModel<typeof virtualUserProfiles>
export type NewEmbedding = InferInsertModel<typeof embeddings>
export type NewSubscription = InferInsertModel<typeof subscriptions>
export type NewOrder = InferInsertModel<typeof orders>

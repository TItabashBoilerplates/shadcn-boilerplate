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
import { chatTypeEnum } from './types.ts'

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

// ===== General Users テーブル（RLS付き） =====
export const generalUsers = pgTable('general_users', {
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

// ===== General Users RLS ポリシー =====

// Auth Hook用ポリシー（supabase_auth_admin専用）
export const insertPolicyGeneralUsers = pgPolicy('insert_policy_general_users', {
  for: 'insert',
  to: 'supabase_auth_admin',
  withCheck: sql`true`,
}).link(generalUsers)

// 全ユーザーが全general_usersを閲覧可能
export const selectOwnUser = pgPolicy('select_own_user', {
  for: 'select',
  to: ['anon', 'authenticated'],
  using: sql`true`,
}).link(generalUsers)

// 自分のユーザー情報のみ編集可能
export const editPolicyGeneralUsers = pgPolicy('edit_policy_general_users', {
  for: 'all',
  to: 'authenticated',
  using: sql`(SELECT auth.uid()) = id`,
  withCheck: sql`(SELECT auth.uid()) = id`,
}).link(generalUsers)

// ===== General User Profiles テーブル（RLS付き） =====
export const generalUserProfiles = pgTable('general_user_profiles', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull().default(''),
  lastName: text('last_name').notNull().default(''),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => generalUsers.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  phoneNumber: text('phone_number'),
}).enableRLS()

// ===== General User Profiles RLS ポリシー =====

// 自分のプロフィールのみ閲覧可能
export const selectOwnProfile = pgPolicy('select_own_profile', {
  for: 'select',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM general_users
      WHERE general_users.id = user_id
      AND general_users.id = (SELECT auth.uid())
    )
  `,
}).link(generalUserProfiles)

// 自分のプロフィールのみ編集可能
export const insertPolicyGeneralUserProfiles = pgPolicy('insert_policy_general_user_profiles', {
  for: 'all',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM general_users
      WHERE general_users.id = user_id
      AND general_users.id = (SELECT auth.uid())
    )
  `,
  withCheck: sql`
    EXISTS (
      SELECT 1
      FROM general_users
      WHERE general_users.id = user_id
      AND general_users.id = (SELECT auth.uid())
    )
  `,
}).link(generalUserProfiles)

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
    .references(() => generalUserProfiles.id, {
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
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = chat_rooms.id
      AND general_users.id = (SELECT auth.uid())
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
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = chat_rooms.id
      AND general_users.id = (SELECT auth.uid())
    )
  `,
  withCheck: sql`
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = chat_rooms.id
      AND general_users.id = (SELECT auth.uid())
    )
  `,
}).link(chatRooms)

// ===== Virtual Users テーブル =====
export const virtualUsers = pgTable('virtual_users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => generalUsers.id, { onDelete: 'cascade' }),
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
    senderId: uuid('sender_id').references(() => generalUsers.id, {
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
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND general_users.id = (SELECT auth.uid())
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
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND general_users.id = (SELECT auth.uid())
    )
  `,
  withCheck: sql`
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND general_users.id = (SELECT auth.uid())
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
      .references(() => generalUsers.id, { onDelete: 'cascade' }),
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
      FROM general_users
      WHERE general_users.id = user_chats.user_id
      AND general_users.id = (SELECT auth.uid())
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
      FROM general_users
      WHERE general_users.id = user_chats.user_id
      AND general_users.id = (SELECT auth.uid())
    )
  `,
  withCheck: sql`
    EXISTS (
      SELECT 1
      FROM general_users
      WHERE general_users.id = user_chats.user_id
      AND general_users.id = (SELECT auth.uid())
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

// ===== 型エクスポート（Inferで自動推論） =====
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

// SELECT型（既存レコードの型）
export type Organization = InferSelectModel<typeof organizations>
export type CorporateUser = InferSelectModel<typeof corporateUsers>
export type GeneralUser = InferSelectModel<typeof generalUsers>
export type GeneralUserProfile = InferSelectModel<typeof generalUserProfiles>
export type Address = InferSelectModel<typeof addresses>
export type ChatRoom = InferSelectModel<typeof chatRooms>
export type Message = InferSelectModel<typeof messages>
export type UserChat = InferSelectModel<typeof userChats>
export type VirtualUser = InferSelectModel<typeof virtualUsers>
export type VirtualUserChat = InferSelectModel<typeof virtualUserChats>
export type VirtualUserProfile = InferSelectModel<typeof virtualUserProfiles>
export type Embedding = InferSelectModel<typeof embeddings>

// INSERT型（新規作成時の型）
export type NewOrganization = InferInsertModel<typeof organizations>
export type NewCorporateUser = InferInsertModel<typeof corporateUsers>
export type NewGeneralUser = InferInsertModel<typeof generalUsers>
export type NewGeneralUserProfile = InferInsertModel<typeof generalUserProfiles>
export type NewAddress = InferInsertModel<typeof addresses>
export type NewChatRoom = InferInsertModel<typeof chatRooms>
export type NewMessage = InferInsertModel<typeof messages>
export type NewUserChat = InferInsertModel<typeof userChats>
export type NewVirtualUser = InferInsertModel<typeof virtualUsers>
export type NewVirtualUserChat = InferInsertModel<typeof virtualUserChats>
export type NewVirtualUserProfile = InferInsertModel<typeof virtualUserProfiles>
export type NewEmbedding = InferInsertModel<typeof embeddings>

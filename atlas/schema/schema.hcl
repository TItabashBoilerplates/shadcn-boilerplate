# Atlas スキーマ定義ファイル
# Prisma schema.prisma から変換

# スキーマ定義
schema "public" {
  comment = "公開スキーマ"
}

# Enum定義
enum "chat_type" {
  schema = schema.public
  values = ["PRIVATE", "GROUP"]
}

# ===== テーブル定義 =====

# 組織マスタ
table "organizations" {
  schema = schema.public

  column "id" {
    type = serial
    comment = "組織ID: 自動インクリメントされる一意の識別子"
  }

  column "name" {
    type = text
    null = false
    comment = "組織名"
  }

  column "created_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  column "updated_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  primary_key {
    columns = [column.id]
  }
}

# ユーザマスタ（企業ユーザー）
table "corporate_users" {
  schema = schema.public

  column "id" {
    type = uuid
    null = false
    comment = "ユーザID: ユニークな識別子"
  }

  column "name" {
    type    = text
    null    = false
    default = "''"
    comment = "ユーザ名"
  }

  column "organization_id" {
    type = integer
    null = false
    comment = "所属組織ID: Organizationテーブルのidを参照する外部キー"
  }

  column "created_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  column "updated_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "corporate_users_organization_id_fkey" {
    columns     = [column.organization_id]
    ref_columns = [table.organizations.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  index "corporate_users_id_key" {
    unique  = true
    columns = [column.id]
  }

  # Row Level Security有効化
  row_security {
    enabled = true
  }
}

# 一般ユーザマスタ
table "general_users" {
  schema = schema.public

  column "id" {
    type = uuid
    null = false
    comment = "認証用のユーザ識別子: ユニークな識別子"
  }

  column "display_name" {
    type    = text
    null    = false
    default = "''"
    comment = "表示するユーザ名"
  }

  column "account_name" {
    type    = text
    null    = false
    comment = "アカウント名: ユニークな識別子で検索に使用する。更新可能"
  }

  column "created_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  column "updated_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  primary_key {
    columns = [column.id]
  }

  index "general_users_id_key" {
    unique  = true
    columns = [column.id]
  }

  index "general_users_account_name_key" {
    unique  = true
    columns = [column.account_name]
  }

  # Row Level Security有効化
  row_security {
    enabled = true
  }
}

# ===== general_users テーブルのRLSポリシー =====

# Auth Hookのためのポリシー（supabase_auth_admin専用）
policy "insert_policy_general_users" {
  on         = table.general_users
  for        = INSERT
  to         = ["supabase_auth_admin"]
  with_check = "true"
}

# 全ユーザーが全general_usersを閲覧可能
policy "select_own_user" {
  on    = table.general_users
  for   = SELECT
  to    = ["anon", "authenticated"]
  using = "true"
}

# 自分のユーザー情報のみ編集可能
policy "edit_policy_general_users" {
  on         = table.general_users
  for        = ALL
  to         = ["authenticated"]
  using      = "(SELECT auth.uid()) = id"
  with_check = "(SELECT auth.uid()) = id"
}

# プライバシーデータ（一般ユーザープロフィール）
table "general_user_profiles" {
  schema = schema.public

  column "id" {
    type = serial
    comment = "プライバシーデータのID: 自動インクリメントされる一意の識別子"
  }

  column "first_name" {
    type    = text
    null    = false
    default = "''"
    comment = "ファーストネーム"
  }

  column "last_name" {
    type    = text
    null    = false
    default = "''"
    comment = "ラストネーム"
  }

  column "user_id" {
    type = uuid
    null = false
    comment = "ユーザID: 一意でGeneralUserと対応"
  }

  column "email" {
    type    = text
    null    = false
    comment = "メールアドレス: ユニークな識別子"
  }

  column "phone_number" {
    type    = text
    null    = true
    comment = "電話番号: オプショナル"
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "general_user_profiles_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.general_users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  index "general_user_profiles_id_key" {
    unique  = true
    columns = [column.id]
  }

  index "general_user_profiles_user_id_key" {
    unique  = true
    columns = [column.user_id]
  }

  index "general_user_profiles_email_key" {
    unique  = true
    columns = [column.email]
  }

  # Row Level Security有効化
  row_security {
    enabled = true
  }
}

# ===== general_user_profiles テーブルのRLSポリシー =====

# 自分のプロフィールのみ閲覧可能
policy "select_own_profile" {
  on    = table.general_user_profiles
  for   = SELECT
  to    = ["authenticated"]
  using = <<-SQL
    EXISTS (
      SELECT 1
      FROM general_users
      WHERE general_users.id = user_id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
}

# 自分のプロフィールのみ編集可能
policy "insert_policy_general_user_profiles" {
  on         = table.general_user_profiles
  for        = ALL
  to         = ["authenticated"]
  using      = <<-SQL
    EXISTS (
      SELECT 1
      FROM general_users
      WHERE general_users.id = user_id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
  with_check = <<-SQL
    EXISTS (
      SELECT 1
      FROM general_users
      WHERE general_users.id = user_id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
}

# 住所
table "addresses" {
  schema = schema.public

  column "id" {
    type = serial
  }

  column "street" {
    type = text
    null = false
  }

  column "city" {
    type = text
    null = false
  }

  column "state" {
    type = text
    null = false
  }

  column "postal_code" {
    type = text
    null = false
  }

  column "country" {
    type = text
    null = false
  }

  column "profile_id" {
    type = integer
    null = true
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "addresses_profile_id_fkey" {
    columns     = [column.profile_id]
    ref_columns = [table.general_user_profiles.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  index "addresses_id_key" {
    unique  = true
    columns = [column.id]
  }

  index "addresses_profile_id_key" {
    unique  = true
    columns = [column.profile_id]
  }

  # Row Level Security有効化
  row_security {
    enabled = true
  }
}

# ===== messages テーブルのRLSポリシー =====

# 参加しているチャットルームのメッセージのみ閲覧可能
policy "select_policy_messages" {
  on    = table.messages
  for   = SELECT
  to    = ["authenticated"]
  using = <<-SQL
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
}

# 参加しているチャットルームのメッセージのみ編集可能
policy "modify_policy_messages" {
  on         = table.messages
  for        = ALL
  to         = ["authenticated"]
  using      = <<-SQL
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
  with_check = <<-SQL
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
}

# チャットルーム
table "chat_rooms" {
  schema = schema.public

  column "id" {
    type = serial
  }

  column "type" {
    type = enum.chat_type
    null = false
    comment = "チャットの種類（一対一: PRIVATE, グループ: GROUP）"
  }

  column "created_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  primary_key {
    columns = [column.id]
  }

  index "chat_rooms_id_key" {
    unique  = true
    columns = [column.id]
  }

  # Row Level Security有効化
  row_security {
    enabled = true
  }
}

# ===== chat_rooms テーブルのRLSポリシー =====

# 参加しているチャットルームのみ閲覧可能
policy "select_policy_chat_rooms" {
  on    = table.chat_rooms
  for   = SELECT
  to    = ["authenticated"]
  using = <<-SQL
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = chat_rooms.id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
}

# 参加しているチャットルームのみ編集可能
policy "modify_policy_chat_rooms" {
  on         = table.chat_rooms
  for        = ALL
  to         = ["authenticated"]
  using      = <<-SQL
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = chat_rooms.id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
  with_check = <<-SQL
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = chat_rooms.id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
}

# チャットメッセージ
table "messages" {
  schema = schema.public

  column "id" {
    type = serial
  }

  column "chat_room_id" {
    type    = integer
    null    = false
    comment = "チャットルームのID"
  }

  column "sender_id" {
    type    = uuid
    null    = true
    comment = "メッセージを送信したユーザのID"
  }

  column "virtual_user_id" {
    type    = uuid
    null    = true
    comment = "仮想ユーザのID"
  }

  column "content" {
    type    = text
    null    = false
    comment = "メッセージの内容"
  }

  column "created_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "messages_chat_room_id_fkey" {
    columns     = [column.chat_room_id]
    ref_columns = [table.chat_rooms.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  foreign_key "messages_sender_id_fkey" {
    columns     = [column.sender_id]
    ref_columns = [table.general_users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  foreign_key "messages_virtual_user_id_fkey" {
    columns     = [column.virtual_user_id]
    ref_columns = [table.virtual_users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  index "messages_id_key" {
    unique  = true
    columns = [column.id]
  }

  # チェック制約: sender_idかvirtual_user_idのどちらか一方のみがNULLでないこと
  check "sender_check" {
    expr = "(sender_id IS NOT NULL AND virtual_user_id IS NULL) OR (sender_id IS NULL AND virtual_user_id IS NOT NULL)"
  }

  # Row Level Security有効化
  row_security {
    enabled = true
  }
}

# ユーザとチャットルームの関係
table "user_chats" {
  schema = schema.public

  column "id" {
    type = serial
  }

  column "user_id" {
    type = uuid
    null = false
  }

  column "chat_room_id" {
    type = integer
    null = false
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "user_chats_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.general_users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  foreign_key "user_chats_chat_room_id_fkey" {
    columns     = [column.chat_room_id]
    ref_columns = [table.chat_rooms.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  index "user_chats_id_key" {
    unique  = true
    columns = [column.id]
  }

  index "user_chats_user_id_chat_room_id_key" {
    unique  = true
    columns = [column.user_id, column.chat_room_id]
  }

  # Row Level Security有効化
  row_security {
    enabled = true
  }
}

# ===== user_chats テーブルのRLSポリシー =====

# 自分のチャット参加記録のみ閲覧可能
policy "select_policy_user_chats" {
  on    = table.user_chats
  for   = SELECT
  to    = ["authenticated"]
  using = <<-SQL
    EXISTS (
      SELECT 1
      FROM general_users
      WHERE general_users.id = user_chats.user_id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
}

# 自分のチャット参加記録のみ編集可能
policy "modify_policy_user_chats" {
  on         = table.user_chats
  for        = ALL
  to         = ["authenticated"]
  using      = <<-SQL
    EXISTS (
      SELECT 1
      FROM general_users
      WHERE general_users.id = user_chats.user_id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
  with_check = <<-SQL
    EXISTS (
      SELECT 1
      FROM general_users
      WHERE general_users.id = user_chats.user_id
      AND general_users.id = (SELECT auth.uid())
    )
  SQL
}

# 仮想ユーザモデル
table "virtual_users" {
  schema = schema.public

  column "id" {
    type = uuid
    null = false
  }

  column "name" {
    type = text
    null = false
  }

  column "owner_id" {
    type = uuid
    null = false
  }

  column "created_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  column "updated_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "virtual_users_owner_id_fkey" {
    columns     = [column.owner_id]
    ref_columns = [table.general_users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  index "virtual_users_id_key" {
    unique  = true
    columns = [column.id]
  }
}

# 仮想ユーザとチャットルームの関係
table "virtual_user_chats" {
  schema = schema.public

  column "id" {
    type = serial
  }

  column "virtual_user_id" {
    type = uuid
    null = false
  }

  column "chat_room_id" {
    type = integer
    null = false
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "virtual_user_chats_virtual_user_id_fkey" {
    columns     = [column.virtual_user_id]
    ref_columns = [table.virtual_users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  foreign_key "virtual_user_chats_chat_room_id_fkey" {
    columns     = [column.chat_room_id]
    ref_columns = [table.chat_rooms.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  index "virtual_user_chats_id_key" {
    unique  = true
    columns = [column.id]
  }

  index "virtual_user_chats_virtual_user_id_chat_room_id_key" {
    unique  = true
    columns = [column.virtual_user_id, column.chat_room_id]
  }
}

# 仮想ユーザプロフィール
table "virtual_user_profiles" {
  schema = schema.public

  column "id" {
    type = serial
  }

  column "personality" {
    type    = text
    null    = false
    default = "'friendly'"
    comment = "キャラクターの基本的な性格"
  }

  column "tone" {
    type    = text
    null    = false
    default = "'casual'"
    comment = "話し方のトーン"
  }

  column "knowledge_area" {
    type    = sql("text[]")
    null    = false
    comment = "得意分野や知識領域"
  }

  column "quirks" {
    type    = text
    null    = true
    default = "''"
    comment = "キャラクター特有の癖や特徴"
  }

  column "backstory" {
    type    = text
    null    = false
    default = "''"
    comment = "キャラクターの背景設定"
  }

  column "knowledge" {
    type    = jsonb
    null    = true
    comment = "知識データ（JSON形式）"
  }

  column "virtual_user_id" {
    type = uuid
    null = false
  }

  column "created_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  column "updated_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "virtual_user_profiles_virtual_user_id_fkey" {
    columns     = [column.virtual_user_id]
    ref_columns = [table.virtual_users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }

  index "virtual_user_profiles_id_key" {
    unique  = true
    columns = [column.id]
  }
}

# エンベディング（ベクトル検索）
table "embeddings" {
  schema = schema.public

  column "id" {
    type = text
    null = false
  }

  column "embedding" {
    type = sql("vector(1536)")
    null = false
    comment = "ベクトル埋め込み（pgvector）"
  }

  column "content" {
    type    = text
    null    = false
    comment = "コンテンツテキスト"
  }

  column "metadata" {
    type    = jsonb
    null    = false
    comment = "メタデータ（JSON形式）"
  }

  column "created_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  column "updated_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  primary_key {
    columns = [column.id]
  }

  index "embeddings_id_key" {
    unique  = true
    columns = [column.id]
  }
}

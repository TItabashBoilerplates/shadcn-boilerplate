-- Row-Level Securityポリシーの有効化

-- general_users
ALTER TABLE "general_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "general_user_profiles" ENABLE ROW LEVEL SECURITY;


-- Auth HookのためのRow-Level Securityポリシー
DROP POLICY IF EXISTS insert_policy_general_users ON public.general_users;
CREATE POLICY insert_policy_general_users
ON public.general_users
FOR INSERT
TO supabase_auth_admin
WITH CHECK (true);

-- general_user
DROP POLICY IF EXISTS select_own_user ON general_users;
CREATE POLICY select_own_user ON general_users
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS edit_policy_general_users ON general_users;
CREATE POLICY edit_policy_general_users ON general_users
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = id
)
WITH CHECK (
  (select auth.uid()) = id
);

-- general_user_profiles
DROP POLICY IF EXISTS select_own_profile ON general_user_profiles;
CREATE POLICY select_own_profile ON general_user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM general_users
    WHERE general_users.id = user_id
    AND (general_users.id = (select auth.uid()))
  )
);

DROP POLICY IF EXISTS insert_policy_general_user_profiles ON general_user_profiles;
CREATE POLICY insert_policy_general_user_profiles ON general_user_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM general_users
    WHERE general_users.id = user_id
    AND (general_users.id = (select auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM general_users
    WHERE general_users.id = user_id
    AND (general_users.id = (select auth.uid()))
  )
);

-- addresses
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;


-- corporate_users
ALTER TABLE "corporate_users" ENABLE ROW LEVEL SECURITY;

-- messagesテーブルのRow-Level Securityポリシーを追加
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
-- messagesテーブルに対するSELECTポリシー
DROP POLICY IF EXISTS select_policy_messages ON messages;
CREATE POLICY select_policy_messages
ON messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_chats
    JOIN general_users ON user_chats.user_id = general_users.id
    WHERE user_chats.chat_room_id = messages.chat_room_id
    AND (general_users.id = (select auth.uid()))
  )
);

-- messagesテーブルに対するALLポリシー
DROP POLICY IF EXISTS modify_policy_messages ON messages;
CREATE POLICY modify_policy_messages
ON messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_chats
    JOIN general_users ON user_chats.user_id = general_users.id
    WHERE user_chats.chat_room_id = messages.chat_room_id
    AND (general_users.id = (select auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_chats
    JOIN general_users ON user_chats.user_id = general_users.id
    WHERE user_chats.chat_room_id = messages.chat_room_id
    AND (general_users.id = (select auth.uid()))
  )
);

-- chat_roomsテーブルのRow-Level Securityポリシーを追加
ALTER TABLE "chat_rooms" ENABLE ROW LEVEL SECURITY;

-- chat_roomsテーブルに対するSELECTポリシー
DROP POLICY IF EXISTS select_policy_chat_rooms ON chat_rooms;
CREATE POLICY select_policy_chat_rooms
ON chat_rooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_chats
    JOIN general_users ON user_chats.user_id = general_users.id
    WHERE user_chats.chat_room_id = chat_rooms.id
    AND (general_users.id = (select auth.uid()))
  )
);

-- chat_roomsテーブルに対するALLポリシー
DROP POLICY IF EXISTS modify_policy_chat_rooms ON chat_rooms;
CREATE POLICY modify_policy_chat_rooms
ON chat_rooms
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_chats
    JOIN general_users ON user_chats.user_id = general_users.id
    WHERE user_chats.chat_room_id = chat_rooms.id
    AND (general_users.id = (select auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_chats
    JOIN general_users ON user_chats.user_id = general_users.id
    WHERE user_chats.chat_room_id = chat_rooms.id
    AND (general_users.id = (select auth.uid()))
  )
);

-- user_chatsテーブルのRow-Level Securityポリシーを追加
ALTER TABLE "user_chats" ENABLE ROW LEVEL SECURITY;

-- user_chatsテーブルに対するSELECTポリシー
DROP POLICY IF EXISTS select_policy_user_chats ON user_chats;
CREATE POLICY select_policy_user_chats
ON user_chats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM general_users
    WHERE general_users.id = user_chats.user_id
    AND (general_users.id = (select auth.uid()))
  )
);

-- user_chatsテーブルに対するALLポリシー
DROP POLICY IF EXISTS modify_policy_user_chats ON user_chats;
CREATE POLICY modify_policy_user_chats
ON user_chats
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM general_users
    WHERE general_users.id = user_chats.user_id
    AND (general_users.id = (select auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM general_users
    WHERE general_users.id = user_chats.user_id
    AND (general_users.id = (select auth.uid()))
  )
);

-- Auth Hookをself-hostedで利用するための設定

-- Auth Hookの設定
-- 新規ユーザーを作成するための関数を定義
create or replace function public.handle_new_user()
returns trigger
language plpgsql
as $$
declare
  -- ここに変数を挿入
begin
  -- 新規ユーザーのIDをgeneral_usersテーブルに挿入
  INSERT INTO public.general_users(id, account_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'account_name');
  RETURN NEW;
end;
$$;

-- Auth Hookのトリガー
-- auth.usersテーブルに新規レコードが挿入された後にhandle_new_user関数を実行するトリガーを作成
create or replace trigger auth_hook
after insert on auth.users
for each row
execute function public.handle_new_user();

-- supabase_auth_adminにpublicスキーマの使用権限を付与
grant usage on schema public to supabase_auth_admin;

-- supabase_auth_adminにhandle_new_user関数の実行権限を付与
grant execute
  on function public.handle_new_user
  to supabase_auth_admin;

-- supabase_auth_adminにgeneral_usersテーブルへのINSERT権限を付与
GRANT INSERT ON TABLE public.general_users TO supabase_auth_admin;

-- supabase_auth_adminにgeneral_users_id_seqシーケンスの使用と選択権限を付与
-- GRANT USAGE, SELECT ON SEQUENCE public.general_users_id_seq TO supabase_auth_admin;

-- authenticatedとanonからcustom_access_token_hook関数の実行権限を取り消す
revoke execute
  on function public.handle_new_user
  from authenticated, anon;


-- Install the extension from dbdev
-- select dbdev.install('langchain-embedding_search');
-- create extension "langchain-embedding_search"
--     version '1.0.0';

-- Create a function to search for documents
-- TODO: 参照テーブル(embeddings)は必要に応じて変更する
drop function if exists match_documents;
create function match_documents (
  query_embedding vector(1536),
  match_count int default null,
  filter jsonb DEFAULT '{}'
) returns table (
  id text,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  from embeddings
  where metadata @> filter
  order by embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;


-- RLSを有効にしたmatch_documents関数(※こちらの利用を推奨)
-- TODO: 参照テーブル(embeddings)は必要に応じて変更する
drop function if exists match_documents_with_rls;
create function match_documents_with_rls (
  query_embedding vector(1536),
  match_count int default null,
  filter jsonb DEFAULT '{}'
) returns table (
  id text,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  from embeddings
  where metadata @> filter
    and (metadata->>'user_id')::uuid = auth.uid()
  order by embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;

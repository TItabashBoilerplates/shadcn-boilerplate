-- このスクリプトはDatabase webhookを登録するためのSQLクエリを含んでいます。
-- Database webhookは、データベース内の特定のイベント（挿入、更新、削除など）が
-- 発生したときに自動的に実行されるHTTPリクエストを設定するために使用されます。

-- 以下のコメントアウトされたコードは、storage.objectsテーブルに新しい行が
-- 挿入されたときにトリガーを作成し、指定されたエンドポイントにHTTPリクエストを
-- 送信する例です。このような設定は、ファイルアップロードなどのイベントを
-- 検知し、関連する処理を自動的に実行するのに役立ちます。

-- 実際の使用時には、コメントを解除し、必要に応じてエンドポイントURLや
-- リクエストの詳細を調整してください。


-- drop trigger if exists "on_storage_object_inserted" on "storage"."objects";
-- create trigger "on_storage_object_inserted" after insert
-- on "storage"."objects" for each row
-- execute function "supabase_functions"."http_request"(
--   'http://backend-py:8000/purchase_history/purser',
--   'POST',
--   '{"Content-Type":"application/json"}',
--   '{}',
--   '1000'
-- );

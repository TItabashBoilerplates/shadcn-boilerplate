# 権限設定（GRANT文）
# Supabaseロール（anon, authenticated, service_role）への権限付与
#
# 注意: GRANT文はAtlas HCLに対応する宣言的構文が存在しないため、
# executeブロックを使用しています。これは適切な使用方法です。

# publicスキーマの使用権限を付与
execute {
  sql = <<-SQL
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  SQL
}

# publicスキーマ内の全テーブルへのアクセス権限を付与
execute {
  sql = <<-SQL
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
  SQL
}

# publicスキーマ内の全ルーチン（関数・プロシージャ）への実行権限を付与
execute {
  sql = <<-SQL
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
  SQL
}

# publicスキーマ内の全シーケンスへのアクセス権限を付与
execute {
  sql = <<-SQL
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  SQL
}

# デフォルト権限の設定: 今後作成されるテーブルに自動的に権限を付与
execute {
  sql = <<-SQL
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
  SQL
}

# デフォルト権限の設定: 今後作成されるルーチンに自動的に権限を付与
execute {
  sql = <<-SQL
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
  SQL
}

# デフォルト権限の設定: 今後作成されるシーケンスに自動的に権限を付与
execute {
  sql = <<-SQL
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  SQL
}

# データベース関数とトリガー
# Atlas HCLの宣言的な構文を使用

# ===== Auth Hook関数 =====

# 新規ユーザー作成時の処理関数
function "handle_new_user" {
  schema = schema.public
  lang   = PLpgSQL
  return = trigger
  as     = <<-SQL
    DECLARE
      -- ここに変数を挿入
    BEGIN
      -- 新規ユーザーのIDをgeneral_usersテーブルに挿入
      INSERT INTO public.general_users(id, account_name)
      VALUES (NEW.id, NEW.raw_user_meta_data ->> 'account_name');
      RETURN NEW;
    END;
  SQL
}

# Auth Hookトリガー
# auth.usersテーブルに新規レコードが挿入された後にhandle_new_user関数を実行
trigger "auth_hook" {
  on = table.auth_users
  after {
    insert = true
  }
  for_each = ROW
  execute {
    function = function.handle_new_user
  }
}

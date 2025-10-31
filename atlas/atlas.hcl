# Atlas スキーマ管理設定ファイル
# https://atlasgo.io/atlas-schema/projects

# 環境定義
env "local" {
  # スキーマソースディレクトリ
  src = "file://schema"

  # データベース接続URL（環境変数から取得）
  url = getenv("DATABASE_URL")

  # 開発用データベースURL（マイグレーション生成に使用）
  # ローカル環境では url と同じSupabase Local DBを使用
  dev = getenv("DATABASE_URL")

  # マイグレーションディレクトリ
  migration {
    dir = "file://migrations"
  }

  # スキーマ差分の表示形式
  diff {
    skip {
      # Supabaseが管理するスキーマをスキップ
      drop_schema = true
      drop_column = false
    }
  }
}

env "development" {
  src = "file://schema"
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://migrations"
  }

  diff {
    skip {
      drop_schema = true
      drop_column = false
    }
  }
}

env "staging" {
  src = "file://schema"
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://migrations"
  }

  diff {
    skip {
      drop_schema = true
      drop_column = false
    }
  }
}

env "production" {
  src = "file://schema"
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://migrations"
    # 本番環境では手動承認を必須にする
    baseline = "initial"
  }

  diff {
    skip {
      drop_schema = true
      drop_column = true # 本番ではカラム削除をスキップ
    }
  }
}

# Lintルール設定
lint {
  # 破壊的変更の検出
  destructive {
    error = true
  }

  # データ消失の可能性がある変更を検出
  data_depend {
    error = true
  }

  # 命名規則のチェック
  naming {
    match   = "^[a-z][a-z0-9_]*$"
    message = "テーブル名とカラム名は小文字のスネークケースにしてください"
  }
}

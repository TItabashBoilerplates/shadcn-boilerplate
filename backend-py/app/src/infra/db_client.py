"""このモジュールは、SQLModelを使用したデータベース接続とセッション管理を提供します.

FastAPIの依存性注入システムと統合し、リクエストごとに安全なデータベースセッションを提供します。
SQLModelの公式パターンに従った同期処理の実装です。
"""

import os
from collections.abc import Generator

from sqlmodel import Session, create_engine

# 環境変数からデータベースURLを取得
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    msg = "DATABASE_URL environment variable is not set"
    raise ValueError(msg)

# SQLModelエンジンの作成（同期処理）
# echo=Trueでクエリログを出力（本番環境ではFalseに設定）
engine = create_engine(
    DATABASE_URL,
    echo=True,
    pool_pre_ping=True,  # 接続の健全性チェック
)


def get_session() -> Generator[Session, None, None]:
    """FastAPI依存性注入用のセッション取得関数.

    この関数は、FastAPIのDependsシステムで使用されることを想定しています。
    各リクエストごとに新しいセッションを作成し、リクエスト終了時に自動的にクローズします。

    Usage:
        @app.get("/items/")
        def read_items(session: Session = Depends(get_session)):
            statement = select(Item)
            items = session.exec(statement).all()
            return items

    Yields:
        Session: データベースセッション
    """
    with Session(engine) as session:
        yield session

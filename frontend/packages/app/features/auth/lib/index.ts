// 認証関連のユーティリティ関数

export const tokenStorage = {
  // JWTトークンを保存
  saveToken: (token: string) => {
    // 実装（localStorageやAsyncStorageなどに保存）
  },

  // JWTトークンを取得
  getToken: (): string | null => {
    // 実装
    return null
  },

  // JWTトークンを削除
  removeToken: () => {
    // 実装
  },
}

export {}

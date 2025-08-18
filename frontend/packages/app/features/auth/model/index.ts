// 認証状態や認証関連のタイプを定義
export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
}

export interface User {
  id: string
  email: string
  name?: string
}

// 将来的には認証関連のstore, actions, selectors等をここに実装
export {}

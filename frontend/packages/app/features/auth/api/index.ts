// 認証に関するAPI呼び出しを実装

// 例: ログイン機能
export const login = async (email: string, password: string) => {
  // API呼び出し実装
  return { token: 'sample-token', user: { id: '1', email } }
}

// 例: ログアウト機能
export const logout = async () => {
  // API呼び出し実装
  return { success: true }
}

export {}

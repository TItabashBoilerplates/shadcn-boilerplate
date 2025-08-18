// ユーザー管理関連のユーティリティ関数

// 例: ユーザーロールによる権限チェック
export const hasPermission = (role: 'admin' | 'user', permission: string) => {
  if (role === 'admin') {
    return true // 管理者はすべての権限を持つ
  }

  // 一般ユーザーの権限チェックロジック
  const userPermissions = ['read', 'comment']
  return userPermissions.includes(permission)
}

export {}

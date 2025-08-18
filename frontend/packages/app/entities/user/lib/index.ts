// ユーザーエンティティに関するユーティリティ関数

// ユーザー名のフォーマット
export const formatUserName = (name?: string) => {
  if (!name) return 'Anonymous'
  return name
}

// ユーザーIDからアバター画像URLを生成
export const getUserAvatar = (userId: string) => {
  return `https://ui-avatars.com/api/?name=${userId}&background=random`
}

export {}

// ユーザーエンティティの基本モデル
export interface User {
  id: string
  name?: string
}

// ユーザーエンティティのドメインモデル
export interface UserWithDetails extends User {
  email?: string
  avatar?: string
}

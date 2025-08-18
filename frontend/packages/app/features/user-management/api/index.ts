// ユーザー管理に関するAPI呼び出し
import { UserListItem, UserProfile } from '../model'

// ユーザー一覧を取得
export const getUsers = async (): Promise<UserListItem[]> => {
  // API呼び出し実装
  return [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
  ]
}

// ユーザープロフィールを取得
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  // API呼び出し実装
  return {
    id: userId,
    name: 'John Doe',
    email: 'john@example.com',
    bio: 'Software developer',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: '2023-01-01',
  }
}

export {}

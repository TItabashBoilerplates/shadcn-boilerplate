// ユーザー管理機能のモデル
import { User } from '../../auth/model'

export interface UserListItem {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
}

export interface UserProfile extends User {
  bio?: string
  avatarUrl?: string
  createdAt: string
}

export {}

import { User } from '../../../entities/user'

// ユーザー詳細ページのモデル
export interface UserDetailPageProps {
  id: string
}

// ページの状態管理
export interface UserDetailPageState {
  user: User | null
  isLoading: boolean
  error: Error | null
}

export {}

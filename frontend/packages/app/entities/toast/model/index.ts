// トーストエンティティのモデル
export interface Toast {
  id: string
  title: string
  message?: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

// トーストの状態管理
export interface ToastState {
  toasts: Toast[]
}

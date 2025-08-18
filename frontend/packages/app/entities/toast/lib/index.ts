// トーストエンティティのユーティリティ関数

// トーストIDの生成
export const generateToastId = () => {
  return `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export {}

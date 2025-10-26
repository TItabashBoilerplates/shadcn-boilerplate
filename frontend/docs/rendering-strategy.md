# レンダリング戦略ガイド

このドキュメントでは、Next.js 16 + FSD アーキテクチャにおけるレンダリング戦略（SSR/SSG/CSR）の使い分けについて説明します。

## 概要

Next.js 16 の App Router では、以下の3つのレンダリング戦略を使用できます：

- **SSG（Static Site Generation）**: ビルド時にHTMLを生成
- **SSR（Server-Side Rendering）**: リクエストごとにサーバーでHTMLを生成
- **CSR（Client-Side Rendering）**: ブラウザでJavaScriptを実行してコンテンツを生成

## レンダリング戦略の選択基準

### SSG（Static Site Generation）

**使用ケース:**
- ログインを必要としないパブリックページ
- コンテンツがビルド時に確定している
- 高速なページロードが必要
- SEO対策が重要

**メリット:**
- 最高のパフォーマンス
- CDNでキャッシュ可能
- サーバー負荷が最小
- 優れたSEO

**実装方法:**

```tsx
// src/views/home/ui/HomePage.tsx
import { getTranslations } from 'next-intl/server'

/**
 * ホームページ（Server Component - SSG）
 */
export default async function HomePage() {
  const t = await getTranslations('HomePage')

  return (
    <div>
      <h1>{t('title')}</h1>
      {/* ... */}
    </div>
  )
}
```

**特徴:**
- `'use client'` ディレクティブを**使用しない**
- `async` 関数として実装
- `getTranslations` などのサーバー専用APIを使用
- ビルド出力: `●  (SSG)     prerendered as static HTML`

### SSR（Server-Side Rendering）

**使用ケース:**
- リクエストごとに異なるコンテンツを表示
- リアルタイムデータが必要
- ユーザー認証後のページ
- 動的なパーソナライゼーション

**メリット:**
- 常に最新のデータを表示
- SEO対策が可能
- 初回ロードが高速

**実装方法:**

```tsx
// src/views/dashboard/ui/DashboardPage.tsx
import { getServerSession } from 'next-auth'

/**
 * ダッシュボードページ（Server Component - SSR）
 */
export default async function DashboardPage() {
  // リクエストごとに実行される
  const session = await getServerSession()
  const user = await fetchUserData(session.user.id)

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      {/* ... */}
    </div>
  )
}
```

**特徴:**
- `'use client'` ディレクティブを**使用しない**
- `async` 関数として実装
- 動的データフェッチを使用
- ビルド出力: `ƒ  (Dynamic)  server-rendered on demand`

### CSR（Client-Side Rendering）

**使用ケース:**
- ユーザーインタラクションが多い
- リアルタイム更新が必要
- ブラウザAPIを使用
- 高度なアニメーション

**メリット:**
- インタラクティブなUI
- リアルタイム更新
- ブラウザAPIへのアクセス

**実装方法:**

```tsx
// src/features/chat/ui/ChatBox.tsx
'use client'

import { useState, useEffect } from 'react'

/**
 * チャットボックス（Client Component - CSR）
 */
export function ChatBox() {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    // WebSocketなどでリアルタイム更新
  }, [])

  return (
    <div>
      {/* ... */}
    </div>
  )
}
```

**特徴:**
- `'use client'` ディレクティブを**使用**
- React Hooks（useState, useEffect等）を使用
- ブラウザAPIへアクセス可能

## ハイブリッド戦略

実際のアプリケーションでは、Server ComponentsとClient Componentsを組み合わせて使用します。

### 推奨パターン

```tsx
// src/views/home/ui/HomePage.tsx (Server Component)
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from './LanguageSwitcher'

export default async function HomePage() {
  const t = await getTranslations('HomePage')

  return (
    <div>
      <h1>{t('title')}</h1>

      {/* インタラクティブな部分はClient Componentに分離 */}
      <LanguageSwitcher />
    </div>
  )
}
```

```tsx
// src/views/home/ui/LanguageSwitcher.tsx (Client Component)
'use client'

import { Link } from '@/shared/lib/i18n'

export function LanguageSwitcher() {
  return (
    <div>
      <Link href="/" locale="en">English</Link>
      <Link href="/" locale="ja">日本語</Link>
    </div>
  )
}
```

## プロジェクトにおける実装ガイドライン

### 基本原則

1. **デフォルトはServer Component（SSG/SSR）**
   - `'use client'`を使用しない
   - 可能な限りサーバーサイドでレンダリング

2. **必要な場合のみClient Component（CSR）**
   - ユーザーインタラクションが必要な部分のみ
   - `'use client'`を明示的に宣言

3. **パブリックページは必ずSSG**
   - ログイン不要のページはSSGで実装
   - SEO対策とパフォーマンスの両立

4. **認証後のページはSSR**
   - ユーザー固有のデータを表示
   - リクエストごとに動的生成

### FSDレイヤーごとの推奨戦略

#### Views レイヤー（`src/views/`）

- **パブリックページ**: SSG（Server Component）
- **認証後ページ**: SSR（Server Component）
- インタラクティブな部分は別のClient Componentに分離

#### Features レイヤー（`src/features/`）

- **基本**: Client Component（`'use client'`）
- ユーザーアクションを処理するため、通常はCSRが適切

#### Widgets レイヤー（`src/widgets/`）

- **ケースバイケース**: Server ComponentまたはClient Component
- 静的なヘッダー/フッター: Server Component
- インタラクティブなナビゲーション: Client Component

#### Entities レイヤー（`src/entities/`）

- **表示専用**: Server Component
- **インタラクティブ**: Client Component

#### Shared レイヤー（`src/shared/ui/`）

- **基本**: 両方に対応できるように設計
- shadcn/uiコンポーネント: Client Componentとして実装されている

## ビルド出力の確認

ビルド時に表示される記号の意味：

```
Route (app)
┌ ○ /                    # Static（SSG）
├ ●  /[locale]           # SSG with generateStaticParams
├ ƒ  /dashboard          # Dynamic（SSR）
└ ○  /_not-found         # Static（SSG）

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand
```

## パフォーマンス最適化

### SSGの最適化

```tsx
// generateStaticParams を使用して事前生成
export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'ja' },
  ]
}
```

### SSRの最適化

```tsx
// キャッシュを活用
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 60 } // 60秒ごとに再検証
})
```

### CSRの最適化

```tsx
'use client'

import dynamic from 'next/dynamic'

// 動的インポートでバンドルサイズを削減
const HeavyComponent = dynamic(() => import('./HeavyComponent'))
```

## トラブルシューティング

### 「'use client'が必要」エラー

**エラー:**
```
Error: useState can only be used in Client Components
```

**解決策:**
- コンポーネントの先頭に`'use client'`を追加
- または、React Hooksを使用している部分を別のClient Componentに分離

### SSGなのにSSRになる

**原因:**
- 動的データフェッチを使用している
- リクエストヘッダーやクッキーを読み取っている

**解決策:**
- `generateStaticParams`を使用
- キャッシュ設定を見直す

### パフォーマンスが悪い

**原因:**
- Client Componentを過度に使用
- バンドルサイズが大きい

**解決策:**
- Server Componentを優先
- 動的インポートを使用
- バンドルサイズを分析（`bun run build`で確認）

## ベストプラクティス

1. **Server Component を優先する**
   - デフォルトでServer Component
   - 必要な場合のみClient Component

2. **境界を明確にする**
   - Server ComponentとClient Componentの境界を明確に
   - `'use client'`の配置を最小限に

3. **データフェッチを最適化する**
   - Server Componentでデータを取得
   - Client Componentにpropsとして渡す

4. **パフォーマンスを測定する**
   - ビルド出力を確認
   - Lighthouse等でパフォーマンスを測定

5. **ドキュメント化する**
   - 各ページのレンダリング戦略を明記
   - コメントで理由を説明

## 参考資料

- [Next.js 16 App Router](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [Static Site Generation](https://nextjs.org/docs/app/building-your-application/rendering/static-and-dynamic)

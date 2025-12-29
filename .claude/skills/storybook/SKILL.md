---
name: storybook
description: Storybook 10 によるコンポーネントカタログ管理ガイダンス。ストーリー作成、React Native Web（gluestack-ui）対応、Docker起動、サイドバー構成についての質問に使用。モノレポ全体のコンポーネント可視化支援を提供。
---

# Storybook スキル

このプロジェクトは **Storybook 10** を使用して、モノレポ全体のコンポーネントカタログを管理しています。

## 構成

| 項目 | 場所 |
|------|------|
| Storybook 設定 | `frontend/.storybook/main.ts` |
| グローバルデコレーター | `frontend/.storybook/preview.tsx` |
| Docker 設定 | `docker-compose.frontend.yaml` |
| Dockerfile | `frontend/docker/Dockerfile` |

## 技術スタック

| 項目 | バージョン/技術 |
|------|----------------|
| **Storybook** | 10.1.10 |
| **Framework** | @storybook/nextjs |
| **React Native Web** | @storybook/addon-react-native-web |
| **Node** | >=20.19.0 |
| **Bun** | >=1.2.0 |

## 起動方法

### Docker で起動（推奨）

```bash
# プロジェクトルートで実行
make run

# Storybook: http://localhost:6006
```

### ローカル開発

```bash
cd frontend
bun run storybook
```

## サイドバー構成

Storybook のサイドバーは**モノレポ・FSD 構成に対応**しています：

```
📦 PACKAGES
├── 📁 UI Web
│   ├── 📁 Components    # packages/ui/web/components/
│   └── 📁 MagicUI       # packages/ui/web/magicui/
└── 📁 UI Mobile
    ├── 📁 Components    # packages/ui/mobile/components/
    └── 📁 Layout        # packages/ui/mobile/layout/

📦 SHARED              # apps/web/src/shared/ui/

📦 ENTITIES            # apps/web/src/entities/*/ui/

📦 FEATURES            # apps/web/src/features/*/ui/

📦 WIDGETS             # apps/web/src/widgets/*/ui/

📦 VIEWS               # apps/web/src/views/*/ui/
```

## ストーリーファイルの作成

### 配置ルール

| コンポーネント種別 | ストーリー配置場所 |
|-------------------|-------------------|
| Web UI コンポーネント | `packages/ui/web/components/*.stories.tsx` |
| MagicUI コンポーネント | `packages/ui/web/magicui/*.stories.tsx` |
| Mobile UI コンポーネント | `packages/ui/mobile/components/*/*.stories.tsx` |
| Shared UI | `apps/web/src/shared/ui/**/*.stories.tsx` |
| Entity UI | `apps/web/src/entities/*/ui/*.stories.tsx` |
| Feature UI | `apps/web/src/features/*/ui/*.stories.tsx` |
| Widget UI | `apps/web/src/widgets/*/ui/*.stories.tsx` |
| View UI | `apps/web/src/views/*/ui/*.stories.tsx` |

### ファイル命名規則

```
ComponentName.stories.tsx
```

### 基本テンプレート

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { ComponentName } from './ComponentName'

const meta = {
  component: ComponentName,
  parameters: { layout: 'centered' },  // or 'fullscreen' for large components
  tags: ['autodocs'],                   // Optional: auto-generate docs
  argTypes: {
    // コントロールの定義
    variant: {
      control: 'select',
      options: ['default', 'outline', 'ghost'],
    },
  },
} satisfies Meta<typeof ComponentName>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Button',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <ComponentName variant="default">Default</ComponentName>
      <ComponentName variant="outline">Outline</ComponentName>
    </div>
  ),
}
```

### 重要: title プロパティは指定しない

`main.ts` の `titlePrefix` 設定により、自動的にサイドバー構造が決定されます。

```typescript
// ❌ Bad: 明示的な title 指定
const meta = {
  title: 'UI/Components/Button',  // 指定しない
  component: Button,
}

// ✅ Good: title を省略（titlePrefix から自動生成）
const meta = {
  component: Button,
  parameters: { layout: 'centered' },
}
```

## Web コンポーネント（shadcn/ui）

### ストーリー例

```typescript
// packages/ui/web/components/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta = {
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'Button', variant: 'default' },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
}
```

## Mobile コンポーネント（gluestack-ui + NativeWind）

### React Native Web 対応

Mobile コンポーネントは **React Native Web** 経由でブラウザ表示されます。

`main.ts` で以下の設定が適用されています：

```typescript
{
  name: '@storybook/addon-react-native-web',
  options: {
    modulesToTranspile: [
      'nativewind',
      'react-native-css-interop',
      'react-native-reanimated',
      '@gluestack-ui/button',
      '@gluestack-ui/core',
      '@gluestack-ui/nativewind-utils',
      '@gluestack-ui/overlay',
      '@gluestack-ui/toast',
      '@gluestack-ui/utils',
    ],
    babelPresetReactOptions: {
      jsxImportSource: 'nativewind',
    },
    babelPresets: ['nativewind/babel'],
    babelPlugins: ['react-native-reanimated/plugin'],
  },
}
```

### GluestackUIProvider デコレーター

`preview.tsx` で Mobile ストーリーには自動的に `GluestackUIProvider` がラップされます：

```typescript
(Story: React.ComponentType, context) => {
  const isMobileStory = context.title.startsWith('Packages/UI Mobile')
  if (isMobileStory) {
    return (
      <GluestackUIProvider mode="light">
        <Story />
      </GluestackUIProvider>
    )
  }
  return <Story />
}
```

### Mobile ストーリー例

```typescript
// packages/ui/mobile/components/button/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button, ButtonText } from './index'

const meta = {
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    action: {
      control: 'select',
      options: ['primary', 'secondary', 'positive', 'negative'],
    },
    variant: {
      control: 'select',
      options: ['solid', 'outline', 'link'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    isDisabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Button {...args}>
      <ButtonText>Button</ButtonText>
    </Button>
  ),
  args: {
    action: 'primary',
    variant: 'solid',
    size: 'md',
  },
}

export const AllActions: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
      <Button action="primary">
        <ButtonText>Primary</ButtonText>
      </Button>
      <Button action="secondary">
        <ButtonText>Secondary</ButtonText>
      </Button>
      <Button action="positive">
        <ButtonText>Positive</ButtonText>
      </Button>
      <Button action="negative">
        <ButtonText>Negative</ButtonText>
      </Button>
    </div>
  ),
}
```

### Mobile スタイリングの注意点

Mobile ストーリーでは、TailwindCSS クラスの代わりに **inline style** を使用：

```typescript
// ✅ Good: inline style を使用（React Native Web 互換）
<div style={{ display: 'flex', gap: '16px' }}>

// ❌ Bad: TailwindCSS クラス（Mobile では動作しない場合がある）
<div className="flex gap-4">
```

## フック・コンテキストのモック（必須）

UI コンポーネントが使用するフックや動的な値は、**すべてモックまたはデコレーターで提供**する必要があります。

### モックが必要なもの

| カテゴリ | フック/値 | モック方法 |
|---------|----------|-----------|
| **認証** | `useAuth`, `useSession`, `getUser()` | デコレーター or args |
| **i18n** | `useTranslations`, `getTranslations` | `@storybook/nextjs` 自動対応 |
| **ルーティング** | `useRouter`, `usePathname`, `useParams` | `parameters.nextjs` |
| **データ取得** | `useQuery`, Supabase クエリ | MSW or モックデータ |
| **状態管理** | Zustand stores | デコレーター |

### Next.js ルーティングのモック

```typescript
// preview.tsx で設定済み
parameters: {
  nextjs: {
    appDirectory: true,
  },
},

// 個別ストーリーでルートをモック
export const WithParams: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/users/[id]',
        query: { id: '123' },
      },
    },
  },
}
```

### 認証状態のモック

```typescript
// デコレーターでモックユーザーを提供
import type { Meta, StoryObj } from '@storybook/react'
import { AuthProvider } from '@/shared/lib/auth'

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
}

const meta = {
  component: UserProfile,
  decorators: [
    (Story) => (
      <AuthProvider value={{ user: mockUser, isAuthenticated: true }}>
        <Story />
      </AuthProvider>
    ),
  ],
} satisfies Meta<typeof UserProfile>

// 複数の認証状態をストーリーで表現
export const LoggedIn: Story = {
  decorators: [
    (Story) => (
      <AuthProvider value={{ user: mockUser, isAuthenticated: true }}>
        <Story />
      </AuthProvider>
    ),
  ],
}

export const LoggedOut: Story = {
  decorators: [
    (Story) => (
      <AuthProvider value={{ user: null, isAuthenticated: false }}>
        <Story />
      </AuthProvider>
    ),
  ],
}
```

### i18n のモック

`@storybook/nextjs` が `next-intl` を自動的にモックします。追加設定は不要：

```typescript
// useTranslations は自動的に動作
// キーがそのまま表示される（例: "HomePage.title"）

// 実際の翻訳を表示したい場合はデコレーターで提供
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/shared/config/i18n/messages/ja.json'

const meta = {
  component: LocalizedComponent,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="ja" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
}
```

### TanStack Query のモック

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
})

// グローバルデコレーター（preview.tsx に追加可能）
const meta = {
  component: DataComponent,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
}

// モックデータを使用するストーリー
export const WithData: Story = {
  args: {
    initialData: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ],
  },
}
```

### Zustand ストアのモック

```typescript
import { useUserStore } from '@/entities/user/model/store'

// ストアの初期状態をモック
export const WithUserData: Story = {
  decorators: [
    (Story) => {
      // ストーリー表示前に状態をセット
      useUserStore.setState({
        user: { id: '123', name: 'Test User' },
        isLoading: false,
      })
      return <Story />
    },
  ],
}

export const Loading: Story = {
  decorators: [
    (Story) => {
      useUserStore.setState({
        user: null,
        isLoading: true,
      })
      return <Story />
    },
  ],
}
```

### Supabase クライアントのモック

```typescript
// モックデータを props で渡すパターン（推奨）
export const WithPosts: Story = {
  args: {
    posts: [
      { id: 1, title: 'Post 1', content: 'Content 1' },
      { id: 2, title: 'Post 2', content: 'Content 2' },
    ],
  },
}

// コンポーネント設計: データ取得と表示を分離
// ❌ Bad: コンポーネント内でデータ取得
function PostList() {
  const { data } = await supabase.from('posts').select()
  return <div>{data.map(...)}</div>
}

// ✅ Good: データは props で受け取る（Storybook でテストしやすい）
function PostList({ posts }: { posts: Post[] }) {
  return <div>{posts.map(...)}</div>
}
```

### グローバルデコレーターの設定

`preview.tsx` で共通のモック/プロバイダーを設定：

```typescript
// frontend/.storybook/preview.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../apps/web/src/shared/config/i18n/messages/ja.json'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
})

const preview: Preview = {
  decorators: [
    // 既存のデコレーター...

    // TanStack Query
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),

    // i18n（必要な場合）
    (Story) => (
      <NextIntlClientProvider locale="ja" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
}
```

### 画像・静的アセットのモック

```typescript
// ✅ Good: プレースホルダー画像を使用
export const WithAvatar: Story = {
  args: {
    user: {
      name: 'Test User',
      avatarUrl: 'https://placehold.co/100x100',  // プレースホルダー
    },
  },
}

// ✅ Good: Storybook の staticDirs から読み込み
// main.ts で設定: staticDirs: ['../apps/web/public']
export const WithLocalImage: Story = {
  args: {
    imageUrl: '/images/sample.png',  // public/ からの相対パス
  },
}

// ✅ Good: Base64 データ URL（小さい画像）
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjwvc3ZnPg=='

export const WithPlaceholder: Story = {
  args: {
    imageUrl: PLACEHOLDER_IMAGE,
  },
}
```

### 推奨プレースホルダーサービス

| サービス | URL | 用途 |
|---------|-----|------|
| **placehold.co** | `https://placehold.co/300x200` | 汎用プレースホルダー |
| **picsum.photos** | `https://picsum.photos/300/200` | ランダム写真 |
| **ui-avatars.com** | `https://ui-avatars.com/api/?name=Test` | アバター |

```typescript
// アバターのモック例
const mockUsers = [
  { id: 1, name: 'Alice', avatar: 'https://ui-avatars.com/api/?name=Alice&background=random' },
  { id: 2, name: 'Bob', avatar: 'https://ui-avatars.com/api/?name=Bob&background=random' },
]

// 商品画像のモック例
const mockProducts = [
  { id: 1, name: 'Product 1', image: 'https://picsum.photos/seed/product1/400/300' },
  { id: 2, name: 'Product 2', image: 'https://picsum.photos/seed/product2/400/300' },
]
```

### Next.js Image コンポーネントのモック

```typescript
// next/image は @storybook/nextjs で自動モックされる
// 追加設定は不要

// ただし、外部ドメインの画像を使用する場合は next.config.ts で許可が必要
// Storybook では通常の <img> タグとしてレンダリングされる
```

### Supabase Storage 画像のモック

```typescript
// ❌ Bad: 実際の Supabase Storage URL を使用
export const WithRealImage: Story = {
  args: {
    imageUrl: 'https://xxx.supabase.co/storage/v1/object/public/...',
  },
}

// ✅ Good: プレースホルダーに置き換え
export const WithImage: Story = {
  args: {
    imageUrl: 'https://placehold.co/400x300?text=Product+Image',
  },
}

// ✅ Good: ローカルのサンプル画像を使用
// apps/web/public/storybook/ にサンプル画像を配置
export const WithSampleImage: Story = {
  args: {
    imageUrl: '/storybook/sample-product.png',
  },
}
```

### モック設計の原則

1. **Props 優先**: データは可能な限り props で渡す設計にする
2. **分離**: データ取得ロジックと UI を分離する
3. **デコレーター**: グローバルな依存はデコレーターで提供
4. **状態バリエーション**: Loading, Error, Empty, WithData など複数ストーリーを用意
5. **外部依存排除**: 画像・アセットはプレースホルダーまたはローカルファイルを使用

```typescript
// 推奨パターン: 複数の状態をストーリーで表現
export const Default: Story = { args: { data: mockData } }
export const Loading: Story = { args: { isLoading: true } }
export const Empty: Story = { args: { data: [] } }
export const Error: Story = { args: { error: new Error('Failed') } }
export const NoImage: Story = { args: { imageUrl: null } }
```

## Widget / FSD レイヤーのストーリー

### Widget ストーリー例

```typescript
// apps/web/src/widgets/header/ui/Header.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Header } from './Header'

const meta = {
  component: Header,
  parameters: {
    layout: 'fullscreen',  // Widget は fullscreen が適切
  },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

## 新しい gluestack-ui コンポーネント追加時

新しい gluestack-ui コンポーネントを追加する場合、`main.ts` の `modulesToTranspile` への追加が必要な場合があります：

```typescript
modulesToTranspile: [
  // 既存
  'nativewind',
  'react-native-css-interop',
  '@gluestack-ui/button',
  // 新規追加
  '@gluestack-ui/NEW_COMPONENT',
],
```

## Docker 設定

### Dockerfile

```dockerfile
FROM oven/bun:1.2.8-alpine AS base
WORKDIR /app

FROM base AS dev
EXPOSE 6006
CMD ["sh", "-c", "bun install && bun run storybook -- --host 0.0.0.0"]
```

### docker-compose.frontend.yaml

```yaml
services:
  storybook:
    container_name: storybook
    build:
      context: ./frontend
      dockerfile: docker/Dockerfile
    ports:
      - 6006:6006
    volumes:
      - ./frontend:/app
      - storybook_node_modules:/app/node_modules
    tty: true
    hostname: storybook
    working_dir: /app

volumes:
  storybook_node_modules:
```

## トラブルシューティング

### Mobile コンポーネントが表示されない

1. `modulesToTranspile` に必要なパッケージが含まれているか確認
2. `GluestackUIProvider` がデコレーターで適用されているか確認
3. `context.title.startsWith('Packages/UI Mobile')` の条件を確認

### Docker でビルドエラー

```bash
# node_modules を再構築
docker-compose -f docker-compose.frontend.yaml down -v
docker-compose -f docker-compose.frontend.yaml up --build
```

### ストーリーがサイドバーに表示されない

1. ファイル名が `*.stories.tsx` になっているか確認
2. `main.ts` の `stories` 設定でパスが正しいか確認
3. `files` パターンがファイル配置と一致しているか確認

## チェックリスト

### ファイル・構成

- [ ] ストーリーファイルは `*.stories.tsx` で命名
- [ ] `title` プロパティは指定しない（titlePrefix を使用）
- [ ] Web コンポーネントは TailwindCSS クラスを使用
- [ ] Mobile コンポーネントは inline style を使用
- [ ] Mobile ストーリーは `Packages/UI Mobile` で始まる
- [ ] 新しい gluestack-ui パッケージは `modulesToTranspile` に追加

### モック（必須）

- [ ] 認証状態（useAuth, useSession）はデコレーターでモック
- [ ] ルーティング（useRouter, useParams）は `parameters.nextjs` でモック
- [ ] データ取得は props 経由でモックデータを渡す
- [ ] Zustand ストアは `setState` でモック
- [ ] 画像は**プレースホルダー**または**ローカルファイル**を使用
- [ ] 外部 API / Supabase への依存は排除
- [ ] 複数状態（Loading, Error, Empty, WithData）のストーリーを用意

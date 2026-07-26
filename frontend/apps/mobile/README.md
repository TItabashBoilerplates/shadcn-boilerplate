# Mobile App

Expo 57 React Native application with gluestack-ui and NativeWind styling.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Expo 57, React Native 0.86 |
| **Routing** | Expo Router (file-based) |
| **UI Library** | gluestack-ui |
| **Styling** | NativeWind 5 (TailwindCSS for React Native) |
| **State** | TanStack Query, Zustand |
| **Icons** | @expo/vector-icons / expo-symbols |

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router (file-based routing)
│   ├── (tabs)/             # Tab navigation
│   ├── _layout.tsx         # Root layout
│   └── +not-found.tsx      # 404 page
├── src/                    # FSD layers (app / views / widgets / features / entities / shared)
├── global.css              # CSS entry (imports @workspace/tokens/native.css)
└── metro.config.js         # Metro + NativeWind v5
```

> NativeWind v5 / TailwindCSS v4 は **CSS-first 設定**なので `tailwind.config.ts` は存在しない。
> スキャン対象は `global.css` の `@source` で宣言する。

## UI Components

This app uses **gluestack-ui** components from `@workspace/native-ui`:

```typescript
import { Button, ButtonText, GluestackUIProvider } from '@workspace/native-ui/components'
```

`variant` / `size` の値は `@workspace/tokens/contract` が正本で、Web の
`@workspace/ui` の Button とまったく同じ API になっている
（`variant`: `default` / `secondary` / `destructive` / `outline` / `ghost` / `link`、
`size`: `sm` / `default` / `lg` / `icon`）。

### Adding New Components

```bash
# From frontend directory
bun run ui:add:mobile button card input

# Or directly from this directory
bunx gluestack-ui@latest add button --use-bun
```

Components are installed to `packages/native-ui/components/`.

### Available Components

- Button, Card, Input, Text
- Modal, Toast, Overlay
- Box, HStack, VStack, Center
- And more...

## Development

### Prerequisites

- Node.js 20+
- Bun 1.2+
- Expo Go app (iOS/Android) or emulator

### Getting Started

```bash
# Install dependencies (from frontend root)
cd frontend
bun install

# Start Expo development server
cd apps/mobile
bun run start

# Or with specific platform
bun run ios      # iOS Simulator
bun run android  # Android Emulator
bun run web      # Web browser
```

### Common Commands

```bash
bun run start              # Start Expo dev server
bun run ios                # Run on iOS Simulator
bun run android            # Run on Android Emulator
bun run web                # Run in web browser
bun run type-check         # TypeScript type check
```

## Styling with NativeWind

NativeWind brings TailwindCSS utility classes to React Native:

```tsx
import { View, Text } from 'react-native'

export function MyComponent() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-foreground text-xl font-bold">
        Hello World
      </Text>
    </View>
  )
}
```

### CSS Variables

Use CSS variables for theming (defined in `global.css`):

```tsx
// Colors automatically adapt to light/dark mode
<View className="bg-background border-border">
  <Text className="text-foreground">Primary text</Text>
  <Text className="text-muted-foreground">Secondary text</Text>
</View>
```

## Design Tokens

Shared tokens from `@workspace/tokens`:

```typescript
import { colors, radius } from '@workspace/tokens'
```

## State Management

### TanStack Query (Server State)

```typescript
import { useQuery } from '@tanstack/react-query'

function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  })
}
```

### Zustand (Global State)

```typescript
import { useUserStore } from '@/stores/user'

function MyComponent() {
  const user = useUserStore((state) => state.user)
}
```

## File-Based Routing (Expo Router)

```
app/
├── _layout.tsx           # Root layout
├── index.tsx             # Home screen (/)
├── (tabs)/               # Tab group
│   ├── _layout.tsx       # Tab layout
│   ├── index.tsx         # First tab
│   └── explore.tsx       # Second tab
└── +not-found.tsx        # 404 screen
```

## Authentication

Uses `@workspace/auth` for Supabase authentication:

```typescript
import { useAuth } from '@workspace/auth'

function MyComponent() {
  const { user, signIn, signOut } = useAuth()
}
```

## Environment Variables

Set in `env/frontend/.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note**: Expo uses `EXPO_PUBLIC_` prefix (not `NEXT_PUBLIC_`).

## Troubleshooting

### Metro Bundler Issues

```bash
# Clear Metro cache
bun run start --clear
```

### NativeWind Not Working

1. Ensure `nativewind-env.d.ts` exists in `apps/mobile/` and `packages/native-ui/`
2. Check that `global.css` の `@source` に該当パッケージが含まれているか
   （`packages/native-ui` / `packages/tokens/src`）
3. `metro.config.js` が `withNativewind` を使っているか（v4 の `withNativeWind` は deprecated）
4. Restart Metro bundler (`bunx expo start --clear`)

### Type Errors

```bash
# Run type check
bun run type-check
```

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [gluestack-ui Documentation](https://gluestack.io/ui/docs)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [TailwindCSS](https://tailwindcss.com/)

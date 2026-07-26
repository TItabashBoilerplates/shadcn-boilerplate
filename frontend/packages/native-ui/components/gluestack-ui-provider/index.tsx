import { OverlayProvider } from '@gluestack-ui/core/overlay/creator'
import { ToastProvider } from '@gluestack-ui/core/toast/creator'
import type { PropsWithChildren } from 'react'

/**
 * gluestack-ui のオーバーレイ / トーストのポータルを提供する。
 *
 * デザイントークン（`--background` / `--primary` ...）はこのプロバイダーではなく
 * `@workspace/tokens` が生成する CSS（mobile は `global.css` 経由）が single source of truth。
 * ライト / ダークの切り替えは `@media (prefers-color-scheme: dark)` で行われるため、
 * ここで色を注入したり color scheme を制御したりはしない。
 *
 * @see `.claude/rules/supabase-config.md` と同じ思想で「設定は 1 箇所」に寄せている
 */
export function GluestackUIProvider({ children }: PropsWithChildren) {
  return (
    <OverlayProvider>
      <ToastProvider>{children}</ToastProvider>
    </OverlayProvider>
  )
}

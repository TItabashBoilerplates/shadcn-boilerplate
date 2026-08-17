/**
 * User Entity - Public API（Web / Mobile / Desktop 共有）
 *
 * UI（アバター等）はプラットフォーム固有（shadcn/ui と gluestack-ui で実体が違う）なので
 * 各アプリの `entities/user/ui/` に置く。ここが持つのは型・ストア・フックだけ。
 */

export { useAuthUser, useUser, useUserActions } from './model/hooks'
export type { UserState } from './model/store'
export { useUserStore } from './model/store'
export type { AuthUser, User } from './model/types'
export { toAuthUser } from './model/types'

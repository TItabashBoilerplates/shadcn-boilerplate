/**
 * User Entity - Public API（Mobile）
 *
 * 型・ストア・フックは **`@workspace/app` が正本**（Web / Mobile / Desktop 共有）。
 * ここではそれを再 export し、Mobile 固有の UI だけを足す。
 * **アプリ側で `User` を手書きし直さないこと**（DB スキーマから乖離する）。
 */

export type { AuthUser, User } from '@workspace/app'
export { toAuthUser, useAuthUser, useUser, useUserActions, useUserStore } from '@workspace/app'

// UI Components（gluestack-ui ベースなので Mobile 固有）
export { UserAvatar } from './ui/UserAvatar'

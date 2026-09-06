/**
 * 推奨 / 強制アップデート feature の Public API
 *
 * 判断の正本は `.claude/skills/app-update/`、運用手順は
 * `docs/mobile/app-update-runbook.md`、方針データは `app_release_policies`
 * （`drizzle/schema/app-release-policies.ts`）。
 *
 * ## 設計の 1 行まとめ
 *
 * **判断できない材料が 1 つでもあればブロックしない。** 強制アップデートは
 * こちらから取り消せない操作で、誤発動するとユーザーはアプリを開けず、
 * アプリ内で何かを直させることもできなくなる。
 */
export {
  fetchReleasePolicy,
  type ReleasePolicyQuery,
  type ReleasePolicyQueryResult,
} from './api/fetchReleasePolicy'
export { releasePolicyQuery } from './api/releasePolicyQuery'
export { decideUpdateAction } from './model/decide'
export { pickReleaseNote } from './model/releaseNote'
export type {
  AppPlatform,
  DecideUpdateActionInput,
  ReleasePolicy,
  UpdateAction,
  UpdateDecision,
  UpdateDecisionReason,
} from './model/types'
export { type UseAppUpdateResult, useAppUpdate } from './model/useAppUpdate'
export { compareVersions, parseVersion } from './model/version'
export { UpdateAvailableNotice } from './ui/UpdateAvailableNotice'
export { UpdateRequiredScreen } from './ui/UpdateRequiredScreen'

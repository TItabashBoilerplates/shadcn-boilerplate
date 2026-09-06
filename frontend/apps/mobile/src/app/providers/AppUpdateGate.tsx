import type { PropsWithChildren } from 'react'
import {
  pickReleaseNote,
  UpdateAvailableNotice,
  UpdateRequiredScreen,
  useAppUpdate,
} from '@/features/app-update'
import { useI18n } from '@/shared/hooks'

/**
 * アップデート判定を UI に繋ぐ唯一の場所。
 *
 * ## 描画の順序が安全性そのもの
 *
 * 1. 判定が終わるまでは **`children` をそのまま描く**（初期値は `none`）。
 *    ここで待つ設計にすると、応答が返らないネットワークでアプリが永久に開かない。
 * 2. `forced` になったら `children` を**描かずに**全画面へ差し替える。
 *    上に重ねるだけだと、裏の画面が操作可能なまま残る実装（モーダルの外タップ、
 *    Android の戻る、アクセシビリティ操作）を作り込んでしまう余地がある。
 * 3. `recommended` は下部カードを**重ねる**だけ。作業を止めない。
 *
 * ## ここを消すと静かに壊れる
 *
 * 強制アップデートは平時 1 度も発火しないので、**外しても誰も気づかない**。
 * `src/features/app-update/model/gate.policy.test.ts` が配線を静的に守っている
 * （`.claude/rules/store-review.md` §7 と同じ考え方）。
 */
export function AppUpdateGate({ children }: PropsWithChildren) {
  const { decision, openStore, dismiss } = useAppUpdate()
  const { locale } = useI18n()

  const releaseNote = pickReleaseNote(decision.releaseNotes, locale)

  if (decision.action === 'forced') {
    return (
      <UpdateRequiredScreen
        latestVersion={decision.latestVersion}
        releaseNote={releaseNote}
        onUpdate={openStore}
      />
    )
  }

  return (
    <>
      {children}
      {decision.action === 'recommended' ? (
        <UpdateAvailableNotice
          latestVersion={decision.latestVersion}
          releaseNote={releaseNote}
          onUpdate={openStore}
          onDismiss={dismiss}
        />
      ) : null}
    </>
  )
}

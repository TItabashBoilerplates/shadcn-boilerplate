import { Box } from '@workspace/native-ui/components'
import { UpdatePrompt } from './UpdatePrompt'

/**
 * 推奨アップデートの案内（画面下部のカード。**閉じられる**）。
 *
 * 全画面モーダルにしないのは、推奨アップデートが**ユーザーの作業を止めてよい理由が無い**
 * ため。下部に出すのは親指の到達範囲（`.claude/rules/mobile-uiux.md`）に合わせるため。
 *
 * 「後で」を押した版は記憶され、**さらに新しい版が出るまで再表示しない**
 * （`lib/dismissal.ts`）。毎起動で出すと、ユーザーは内容を読まずに閉じる癖がつき、
 * 本当に必要になったときの強制アップデートも「またか」で処理される。
 */
export function UpdateAvailableNotice({
  latestVersion,
  releaseNote,
  onUpdate,
  onDismiss,
}: {
  latestVersion: string | null
  releaseNote?: string | null
  onUpdate: () => Promise<boolean>
  onDismiss: () => void
}) {
  return (
    <Box
      accessibilityRole="alert"
      className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border bg-background p-6 pb-10 shadow-lg"
    >
      <UpdatePrompt
        tone="available"
        latestVersion={latestVersion}
        releaseNote={releaseNote}
        onUpdate={onUpdate}
        onDismiss={onDismiss}
      />
    </Box>
  )
}

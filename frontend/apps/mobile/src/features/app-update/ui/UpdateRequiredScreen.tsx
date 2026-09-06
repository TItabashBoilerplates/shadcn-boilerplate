import { Box, SafeAreaView } from '@workspace/native-ui/components'
import { UpdatePrompt } from './UpdatePrompt'

/**
 * 強制アップデート画面（全画面・**閉じられない**）。
 *
 * ## 閉じる手段を一切置かない
 *
 * 「後で」も戻るもタブも出さない。ここに逃げ道を作ると、下限を上げた意味が無くなる。
 * その代わり、**この画面を出す条件は極端に慎重**にしてある（`model/decide.ts` は
 * 材料が 1 つでも欠けたら出さない）。
 *
 * ## ストア審査で落ちないために
 *
 * 「更新してください」しか無い画面は、それ単体だと Apple の 4.2（Minimum Functionality）
 * に見える。**審査担当者がこの画面に到達しないこと**が唯一の対策で、それは
 * `minimum_version` の運用で担保する — **審査に出している版を下限にしない**
 * （ストアで公開済みになってから上げる）。`docs/mobile/app-update-runbook.md` §3。
 *
 * また、ストアへ誘導するリンクは**アプリ外の Web ページではなく自分のストアページ**
 * なので、3.1.1（外部購入への誘導）には当たらない。
 */
export function UpdateRequiredScreen({
  latestVersion,
  releaseNote,
  onUpdate,
}: {
  latestVersion: string | null
  releaseNote?: string | null
  onUpdate: () => Promise<boolean>
}) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Box className="flex-1 justify-center p-6">
        <UpdatePrompt
          tone="required"
          latestVersion={latestVersion}
          releaseNote={releaseNote}
          onUpdate={onUpdate}
        />
      </Box>
    </SafeAreaView>
  )
}

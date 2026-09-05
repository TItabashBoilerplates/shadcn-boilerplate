import { downloadPercent } from '../model/updateFlow'
import { useAppUpdate } from '../model/useAppUpdate'
import { UpdateBannerView } from './UpdateBannerView'

/**
 * 自動更新の通知（接続済み）。見た目は `UpdateBannerView`。
 *
 * **文言はここだけに置く。** このアプリはまだ i18n を入れていないので直書きしているが、
 * View は labels を props で受ける形にしてあるので、i18n を入れるときは
 * **この 1 ファイルを差し替えるだけ**で済む（`.claude/rules/i18n.md`）。
 */
const LABELS = {
  title: '新しいバージョンがあります',
  install: '更新して再起動',
  later: 'あとで',
  installed: 'インストールしました。再起動しています…',
  error: '更新をインストールできませんでした。',
  retry: '再試行',
  dismiss: '閉じる',
} as const

export function UpdateBanner() {
  const { status, install, dismiss } = useAppUpdate()
  const version = status.phase === 'idle' ? '' : (status.version ?? '')
  const percent = downloadPercent(status)

  return (
    <UpdateBannerView
      status={status}
      labels={{
        ...LABELS,
        description: `${version} をインストールできます`,
        downloading: percent === null ? 'ダウンロード中…' : `ダウンロード中… ${percent}%`,
      }}
      onInstall={install}
      onDismiss={dismiss}
    />
  )
}

import { Button } from '@workspace/ui'
import { cn } from '@workspace/ui/lib/utils'
import { Download, X } from 'lucide-react'
import { downloadPercent, type UpdateStatus } from '../model/updateFlow'

/**
 * 文言は接続側（`UpdateBanner`）が渡す。View は取得も翻訳もしない（Storybook で
 * 状態を全部描けるようにするため）。アプリに i18n を入れたら接続側だけ差し替える。
 */
export interface UpdateBannerLabels {
  /** 「新しいバージョンがあります」 */
  title: string
  /** 「{version} をインストールできます」（version 込みで渡す） */
  description: string
  install: string
  later: string
  /** ダウンロード中の行（割合込み。合計が不明なら割合なしの文言を渡す） */
  downloading: string
  installed: string
  error: string
  retry: string
  dismiss: string
}

export interface UpdateBannerViewProps {
  status: UpdateStatus
  labels: UpdateBannerLabels
  onInstall: () => void
  onDismiss: () => void
}

/**
 * 自動更新の通知（右下に浮くカード）。
 *
 * **モーダルにしない。** 更新は作業の邪魔をしない副次情報で、ユーザーが押すまで
 * 何も起きない（`useAppUpdate` の方針）。画面の上に被せる必要があるので `fixed`。
 * トーストより上に出ないよう z-index は控えめにする。
 *
 * 状態: available（更新 / あとで）→ downloading（進捗バー）→ installed（再起動中）。
 * 失敗したら error（再試行 / 閉じる）。idle は何も描かない。
 */
export function UpdateBannerView({ status, labels, onInstall, onDismiss }: UpdateBannerViewProps) {
  if (status.phase === 'idle') return null
  const percent = downloadPercent(status)

  return (
    <output
      aria-live="polite"
      className="fixed right-4 bottom-4 z-40 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Download className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">{labels.title}</p>
          <p className="text-muted-foreground text-xs">
            {status.phase === 'error'
              ? labels.error
              : status.phase === 'installed'
                ? labels.installed
                : status.phase === 'downloading'
                  ? labels.downloading
                  : labels.description}
          </p>
          {status.phase === 'error' ? (
            <p className="mt-1 break-words text-[11px] text-destructive">{status.message}</p>
          ) : null}
        </div>
        {status.phase === 'available' || status.phase === 'error' ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={labels.dismiss}
            // 見た目は 24px だが、ヒットエリアは疑似要素で 44px まで広げる
            className='relative flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground after:absolute after:-inset-2.5 after:content-[""] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {status.phase === 'downloading' ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              'h-full rounded-full bg-primary transition-[width] duration-200',
              // 合計が不明（Content-Length 無し）なら不定表示
              percent === null && 'w-1/3 animate-pulse'
            )}
            style={percent === null ? undefined : { width: `${percent}%` }}
          />
        </div>
      ) : null}

      {status.phase === 'available' ? (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            {labels.later}
          </Button>
          <Button size="sm" onClick={onInstall}>
            {labels.install}
          </Button>
        </div>
      ) : null}
      {status.phase === 'error' ? (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onInstall}>
            {labels.retry}
          </Button>
        </div>
      ) : null}
    </output>
  )
}

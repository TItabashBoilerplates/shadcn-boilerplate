import type { Update } from '@tauri-apps/plugin-updater'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isTauriRuntime } from '@/shared/lib/tauri'
import { checkForUpdate, relaunchApp } from '../api/updater'
import {
  applyDownloadEvent,
  beginDownload,
  canCheckNow,
  nextStatusForFoundUpdate,
  shouldCheckForUpdates,
  UPDATE_CHECK_INTERVAL_MS,
  type UpdateStatus,
} from './updateFlow'

/**
 * 起動時と 1 時間ごとに更新を確認し、ユーザーの操作でダウンロード → インストール → 再起動する。
 *
 * **起動しっぱなしでも気づけること。** デスクトップアプリは開いたまま何日も使われるので、
 * 起動時 1 回だけの確認だと、そのあいだに配信された版が届かない（`UPDATE_CHECK_INTERVAL_MS`）。
 *
 * **勝手に入れ替えない。** 編集中の作業がある状態で突然再起動されると内容が
 * 飛ぶので、「更新して再起動」はユーザーが押す（Slack / VS Code と同じ）。
 * 確認の失敗（オフライン等）は起動を止めないし、**画面も変えない**
 * （一時的な圏外のたびに赤い帯を出さない）。ただし黙らせもしない（console.error）。
 */
export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateStatus>({ phase: 'idle' })
  const updateRef = useRef<Update | null>(null)
  // 定期確認は最新の状態を見る必要があるが、間隔タイマーは張り直したくないので ref で読む
  const statusRef = useRef<UpdateStatus>(status)
  const dismissedVersionRef = useRef<string | null>(null)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    if (
      !shouldCheckForUpdates({
        isTauri: isTauriRuntime(),
        isDev: process.env.NODE_ENV !== 'production',
      })
    ) {
      return
    }
    let cancelled = false

    const runCheck = () => {
      if (!canCheckNow(statusRef.current)) return
      checkForUpdate()
        .then((update) => {
          if (cancelled || !update) return
          const next = nextStatusForFoundUpdate({
            current: statusRef.current,
            version: update.version,
            notes: update.body ?? null,
            dismissedVersion: dismissedVersionRef.current,
          })
          if (!next) return
          updateRef.current = update
          setStatus(next)
        })
        .catch((error: unknown) => {
          console.error('Failed to check for updates:', error)
        })
    }

    runCheck()
    const timer = setInterval(runCheck, UPDATE_CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const install = useCallback(async () => {
    const update = updateRef.current
    if (!update) return
    setStatus(beginDownload(update.version))
    try {
      await update.downloadAndInstall((event) => {
        setStatus((current) => applyDownloadEvent(current, event))
      })
      setStatus({ phase: 'installed', version: update.version })
      await relaunchApp()
    } catch (error: unknown) {
      console.error('Failed to install update:', error)
      setStatus({
        phase: 'error',
        version: update.version,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  // 「あとで」= その版はこのセッションでは出さない（定期確認で 1 時間後に復活させない）。
  // より新しい版が出れば通知するし、次回起動でもまた確認する
  const dismiss = useCallback(() => {
    const current = statusRef.current
    if (current.phase !== 'idle') dismissedVersionRef.current = current.version ?? null
    setStatus({ phase: 'idle' })
  }, [])

  return { status, install, dismiss }
}

/**
 * 自動更新の状態と遷移（純粋関数）。
 *
 * 実際の確認・ダウンロード・再起動は `@tauri-apps/plugin-updater` /
 * `@tauri-apps/plugin-process` が行い、ここは「画面が何を出すか」だけを決める。
 */
export type UpdateStatus =
  | { phase: 'idle' }
  /** 新しい版がある。ユーザーが「更新して再起動」を押すまで待つ */
  | { phase: 'available'; version: string; notes: string | null }
  | { phase: 'downloading'; version: string; downloaded: number; total: number | null }
  /** インストール済み。再起動を待っている（macOS は relaunch が要る） */
  | { phase: 'installed'; version: string }
  | { phase: 'error'; version: string | null; message: string }

/** `update.downloadAndInstall()` のコールバックに来るイベント（plugin-updater と同じ形） */
export type DownloadEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished' }

/**
 * 更新を確認してよいか。
 *
 * - ブラウザで `vite dev` を開いているとき（Tauri の外）は plugin が無く、呼ぶと
 *   未処理 rejection になる
 * - `tauri dev` は version が本番と食い違う（開発中の番号）ので、確認すると
 *   毎回「更新があります」になる
 */
export function shouldCheckForUpdates({
  isTauri,
  isDev,
}: {
  isTauri: boolean
  isDev: boolean
}): boolean {
  return isTauri && !isDev
}

/**
 * 定期確認の間隔。
 *
 * **起動時 1 回だけでは足りない。** デスクトップアプリは開きっぱなしで使われるので、
 * 起動後に配信された版は次に立ち上げ直すまで永久に届かない。読むのは Storage の
 * 静的 JSON 1 本なので、この頻度で配信側に負荷はかからない（VS Code / Chrome も同程度）。
 */
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * いま確認してよいか。**通知が出ている / 入れ替え中は確認しない。**
 *
 * 表示中に確認し直すと、ユーザーが見て押した版と実際に入る版が食い違いうる。
 * `error` を除くのは、再試行できるように失敗表示を残すため（次の確認で黙って消さない）。
 */
export function canCheckNow(status: UpdateStatus): boolean {
  return status.phase === 'idle'
}

/**
 * 見つかった更新を画面に出すべきか。出すなら次の状態、出さないなら null。
 *
 * `dismissedVersion` は「あとで」で閉じた版。定期確認でそれを出し直すと 1 時間ごとに
 * 同じ通知が復活するので、**より新しい版が出るまで黙る**（次回起動でまた確認する）。
 */
export function nextStatusForFoundUpdate({
  current,
  version,
  notes,
  dismissedVersion,
}: {
  current: UpdateStatus
  version: string
  notes: string | null
  dismissedVersion: string | null
}): UpdateStatus | null {
  if (!canCheckNow(current)) return null
  if (version === dismissedVersion) return null
  return { phase: 'available', version, notes }
}

export function beginDownload(version: string): UpdateStatus {
  return { phase: 'downloading', version, downloaded: 0, total: null }
}

export function applyDownloadEvent(status: UpdateStatus, event: DownloadEvent): UpdateStatus {
  if (status.phase !== 'downloading') return status
  switch (event.event) {
    case 'Started':
      return { ...status, total: event.data.contentLength ?? null }
    case 'Progress':
      return { ...status, downloaded: status.downloaded + event.data.chunkLength }
    case 'Finished':
      // 合計が分かっているなら 100% に揃える（Content-Length と実受信量の端数差を吸収）
      return status.total === null ? status : { ...status, downloaded: status.total }
  }
}

/** 進捗の割合（0–100）。合計が不明なら null（バーは不定表示にする） */
export function downloadPercent(status: UpdateStatus): number | null {
  if (status.phase !== 'downloading' || status.total === null || status.total <= 0) return null
  return Math.min(100, Math.round((status.downloaded / status.total) * 100))
}

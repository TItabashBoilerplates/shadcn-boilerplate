import { describe, expect, it } from 'vitest'
import {
  applyDownloadEvent,
  beginDownload,
  canCheckNow,
  downloadPercent,
  nextStatusForFoundUpdate,
  shouldCheckForUpdates,
  UPDATE_CHECK_INTERVAL_MS,
  type UpdateStatus,
} from './updateFlow'

describe('shouldCheckForUpdates', () => {
  it('Tauri の中で、かつ本番ビルドのときだけ確認する', () => {
    expect(shouldCheckForUpdates({ isTauri: true, isDev: false })).toBe(true)
  })

  // ブラウザで vite dev を開いているときは plugin が無い（呼ぶと未処理 rejection になる）
  it('ブラウザ（Tauri の外）では確認しない', () => {
    expect(shouldCheckForUpdates({ isTauri: false, isDev: false })).toBe(false)
  })

  // dev のウィンドウは version が本番と食い違うので、確認すると毎回「更新があります」になる
  it('tauri dev では確認しない', () => {
    expect(shouldCheckForUpdates({ isTauri: true, isDev: true })).toBe(false)
  })
})

describe('ダウンロードの進捗', () => {
  it('開始時は 0 / 合計不明', () => {
    expect(beginDownload('0.2.0')).toEqual({
      phase: 'downloading',
      version: '0.2.0',
      downloaded: 0,
      total: null,
    })
  })

  it('Started で合計、Progress で累積、Finished で合計に揃える', () => {
    let status = beginDownload('0.2.0')
    status = applyDownloadEvent(status, { event: 'Started', data: { contentLength: 100 } })
    expect(status).toMatchObject({ downloaded: 0, total: 100 })
    status = applyDownloadEvent(status, { event: 'Progress', data: { chunkLength: 30 } })
    status = applyDownloadEvent(status, { event: 'Progress', data: { chunkLength: 30 } })
    expect(status).toMatchObject({ downloaded: 60, total: 100 })
    expect(downloadPercent(status)).toBe(60)
    status = applyDownloadEvent(status, { event: 'Finished' })
    expect(status).toMatchObject({ downloaded: 100, total: 100 })
    expect(downloadPercent(status)).toBe(100)
  })

  // サーバーが Content-Length を返さないと合計が分からない。割合は出せないが落ちない
  it('合計が不明なら割合は null', () => {
    let status = beginDownload('0.2.0')
    status = applyDownloadEvent(status, { event: 'Started', data: {} })
    status = applyDownloadEvent(status, { event: 'Progress', data: { chunkLength: 10 } })
    expect(status).toMatchObject({ downloaded: 10, total: null })
    expect(downloadPercent(status)).toBeNull()
  })

  it('ダウンロード中でない状態にイベントが来ても変えない', () => {
    const idle: UpdateStatus = { phase: 'idle' }
    expect(applyDownloadEvent(idle, { event: 'Progress', data: { chunkLength: 1 } })).toBe(idle)
    expect(downloadPercent(idle)).toBeNull()
  })

  it('割合は 100 を超えない（合計の申告が小さくても）', () => {
    let status = beginDownload('0.2.0')
    status = applyDownloadEvent(status, { event: 'Started', data: { contentLength: 10 } })
    status = applyDownloadEvent(status, { event: 'Progress', data: { chunkLength: 25 } })
    expect(downloadPercent(status)).toBe(100)
  })
})

describe('定期確認', () => {
  it('間隔は 1 時間', () => {
    expect(UPDATE_CHECK_INTERVAL_MS).toBe(60 * 60 * 1000)
  })

  it('何も出ていないときだけ確認する', () => {
    expect(canCheckNow({ phase: 'idle' })).toBe(true)
    // 通知が出ている / 入れ替え中に確認し直すと、押した版と入る版が食い違う
    expect(canCheckNow({ phase: 'available', version: '0.3.0', notes: null })).toBe(false)
    expect(canCheckNow(beginDownload('0.3.0'))).toBe(false)
    expect(canCheckNow({ phase: 'installed', version: '0.3.0' })).toBe(false)
    // 失敗表示は再試行のために残す（次の確認で黙って消さない）
    expect(canCheckNow({ phase: 'error', version: '0.3.0', message: 'boom' })).toBe(false)
  })

  it('起動しっぱなしでも、あとから配信された版を通知する', () => {
    expect(
      nextStatusForFoundUpdate({
        current: { phase: 'idle' },
        version: '0.3.0',
        notes: 'fixes',
        dismissedVersion: null,
      })
    ).toEqual({ phase: 'available', version: '0.3.0', notes: 'fixes' })
  })

  // 「あとで」を押した版を 1 時間ごとに出し直すのは、ただの嫌がらせになる
  it('「あとで」で閉じた版は出し直さない', () => {
    expect(
      nextStatusForFoundUpdate({
        current: { phase: 'idle' },
        version: '0.3.0',
        notes: null,
        dismissedVersion: '0.3.0',
      })
    ).toBeNull()
  })

  it('閉じたあとにさらに新しい版が出たら通知する', () => {
    expect(
      nextStatusForFoundUpdate({
        current: { phase: 'idle' },
        version: '0.3.1',
        notes: null,
        dismissedVersion: '0.3.0',
      })
    ).toEqual({ phase: 'available', version: '0.3.1', notes: null })
  })

  it('ダウンロード中に見つかっても割り込まない', () => {
    expect(
      nextStatusForFoundUpdate({
        current: beginDownload('0.3.0'),
        version: '0.3.1',
        notes: null,
        dismissedVersion: null,
      })
    ).toBeNull()
  })
})

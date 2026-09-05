import type { Update } from '@tauri-apps/plugin-updater'

/**
 * 更新の確認。`plugins.updater.endpoints`（本番 Storage の latest.json）を読み、
 * 自分の版より新しければ `Update` を返す（同じか古ければ null）。
 *
 * plugin は Tauri の中でしか動かないので **動的 import**（トップレベルで読むと
 * ブラウザで `vite dev` を開いた瞬間に落ちる）。呼ぶ前の判定は `shouldCheckForUpdates`。
 */
export async function checkForUpdate(): Promise<Update | null> {
  const { check } = await import('@tauri-apps/plugin-updater')
  return check()
}

/**
 * 新版で起動し直す。Windows はインストーラが自分で再起動するが、macOS は
 * インストール後にこれを呼ばないと古いプロセスのまま動き続ける。
 */
export async function relaunchApp(): Promise<void> {
  const { relaunch } = await import('@tauri-apps/plugin-process')
  await relaunch()
}

/**
 * Tauri の WebView の中で動いているか。
 *
 * `@tauri-apps/api` とプラグインは **Tauri の WebView の中でしか動かない**
 * （ブラウザで開いた Vite の dev server には IPC が無い）。トップレベルで import すると
 * `bun run dev` をブラウザで開いた瞬間に落ちるので、**必ずこの判定を通してから
 * 動的 import する**。
 */
export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

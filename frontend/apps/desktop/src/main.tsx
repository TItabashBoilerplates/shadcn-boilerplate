import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { UpdateBanner } from '@/features/app-update'
import { HomePage } from '@/views/home'
import './app/styles/globals.css'

const container = document.getElementById('root')

// 握りつぶさない（`.claude/rules/error-handling.md`）。
// index.html の #root が消えた場合は静かに空画面になるのではなく落とす。
if (!container) {
  throw new Error('#root が見つからない。index.html を確認すること。')
}

createRoot(container).render(
  <StrictMode>
    <HomePage />
    {/*
      自動更新の通知。画面に依存しないので最上位に 1 つだけ置く
      （どの画面を開いていても届く）。Tauri の外（ブラウザで開いた dev server）と
      開発ビルドでは `useAppUpdate` が何もしないので、そのまま置いてよい。
    */}
    <UpdateBanner />
  </StrictMode>
)

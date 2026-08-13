/**
 * shared/ui - アプリ横断で使う汎用 UI
 *
 * デザインシステムのプリミティブは `@workspace/ui`（shadcn/ui）にある。
 * ここに置くのは **このアプリ固有の事情**を吸収するラッパー（例: Supabase Storage の画像変換）。
 *
 * @packageDocumentation
 */

export { SupabaseImage, type SupabaseImageProps } from './supabase-image/SupabaseImage'

import type { EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient as createClient } from '@/shared/lib/supabase'

/**
 * メールリンクの着地点（PKCE フローのトークン交換）
 *
 * `recovery` / `email_change` / `signup` などのメールに埋め込んだ
 * `?token_hash=...&type=...` をここで `verifyOtp` に渡してセッションを確立する。
 *
 * ## なぜ `{{ .ConfirmationURL }}` ではなくこの経路を使うか
 *
 * `@supabase/ssr` は PKCE フローを使うため、**セッションはサーバー側で確立**する
 * 必要がある。既定の `ConfirmationURL` はセッションを URL フラグメントで返すので、
 * サーバーからは読めない。したがってメールテンプレート側を
 *
 * ```html
 * <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/update-password">
 * ```
 *
 * の形にしておくこと（`supabase/templates/email/`）。
 *
 * ## `next` はオープンリダイレクトにしない
 *
 * 外部 URL を渡されるとフィッシングの踏み台になるため、**自サイト内の絶対パスのみ**
 * 許可する。`//evil.com` のようなプロトコル相対 URL も弾く。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = sanitizeNext(searchParams.get('next'))

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    // 期限切れ・使用済み・スパム対策によるリンク事前消費のいずれか。
    // 握りつぶさずログに残したうえで、再送できる画面へ送る。
    console.error('Failed to verify email link:', { code: error.code, message: error.message })
    return NextResponse.redirect(new URL('/forgot-password?error=link_invalid', request.url))
  }

  return NextResponse.redirect(new URL(next, request.url))
}

/** 自サイト内の絶対パスだけを許可する（オープンリダイレクト防止） */
function sanitizeNext(value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//')) {
    return '/'
  }
  return value
}

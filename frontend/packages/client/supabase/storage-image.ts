/**
 * Supabase Storage の画像変換（Image Transformations）ユーティリティ
 *
 * **フロントエンドで表示する Supabase Storage の画像は、必ずここを通して変換する。**
 * 元画像をそのまま配ると、表示 40px のアバターのために 4MB の JPEG が転送される、という
 * 事故がそのまま egress とユーザーの待ち時間になる。Storage の変換 API を通すと
 *
 *  - 表示サイズちょうどにリサイズされる
 *  - クライアントが対応していれば **WebP に自動変換**される（コード変更不要）
 *
 * ため、egress と LCP の両方が下がる。
 *
 * ## 前提
 * - Image Transformations は **Pro Plan 以上**の機能で、Dashboard の
 *   Storage > Settings > *Enable Image Transformations* が有効である必要がある。
 * - 課金は「変換した **元画像（origin image）の数**」に対して発生する。同じ元画像を
 *   何サイズに変換しても origin images は 1。**サイズを増やすことは課金を増やさない**が、
 *   サイズがバラつくと CDN のキャッシュヒット率が落ちるので、幅は
 *   {@link IMAGE_WIDTH_LADDER} の段に丸める（{@link snapImageWidth}）。
 *
 * ## 制限（公式）
 * - `width` / `height` は **1〜2500 の整数**
 * - `quality` は **20〜100**（既定 80）
 * - 元画像は 25MB / 50MP まで
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 * @see https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations
 *
 * @packageDocumentation
 */

/** Supabase Storage の画像変換 API が受け付ける値の範囲（公式ドキュメント準拠） */
export const IMAGE_TRANSFORM_LIMITS = {
  minDimension: 1,
  maxDimension: 2500,
  minQuality: 20,
  maxQuality: 100,
  defaultQuality: 80,
} as const

/** リサイズモード。既定は `cover`（アスペクト比を保ったまま指定サイズを埋め、はみ出しを切る） */
export type StorageImageResize = 'cover' | 'contain' | 'fill'

/**
 * 変換オプション（`@supabase/storage-js` の `TransformOptions` と同形）
 *
 * `format` に `origin` を渡したときだけ自動 WebP 変換が無効になる。
 * 指定しないのが既定（= WebP 最適化を効かせる）。
 */
export interface StorageImageTransform {
  width?: number
  height?: number
  resize?: StorageImageResize
  quality?: number
  format?: 'origin'
}

/**
 * 生成しうる画像幅の段（px）
 *
 * Next.js の `images.imageSizes` + `images.deviceSizes` に対応する。既定の `deviceSizes` は
 * 3840 を含むが Supabase の上限は 2500 なので、末尾を 2500 に置き換えてある
 * （`apps/web/next.config.ts` の値と一致させること。ズレると srcset に配信できない幅が並ぶ）。
 */
export const IMAGE_WIDTH_LADDER = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 2500,
] as const

/**
 * 要求幅を {@link IMAGE_WIDTH_LADDER} の段へ丸める（要求幅以上で最小の段）
 *
 * 段に丸めるのは **CDN キャッシュヒット率**のため。1px 刻みの幅をそのまま投げると
 * 実質すべてキャッシュミスになり、変換のたびにオリジンへ取りに行く。
 *
 * @throws 幅が有限の正数でない場合（呼び出し側の実装バグ）
 */
export function snapImageWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error(`snapImageWidth: width must be a positive finite number, received ${width}`)
  }

  const requested = Math.ceil(width)
  return IMAGE_WIDTH_LADDER.find((step) => step >= requested) ?? IMAGE_TRANSFORM_LIMITS.maxDimension
}

function assertFinite(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`normalizeImageTransform: ${field} must be a finite number, received ${value}`)
  }
  return value
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 変換オプションを Supabase が受け付ける形へ正規化する
 *
 * - `width` / `height`: 整数へ丸めて 1〜2500 にクランプ
 * - `quality`: 整数へ丸めて 20〜100 にクランプ（未指定なら省略 = Supabase 既定の 80）
 *
 * 範囲外の値をクランプするのは、`deviceSizes` の 3840 や DPR 倍した値のように
 * **正当な計算結果が上限を超える**ケースがあるため。一方 `NaN` / `Infinity` は
 * 計算ミス以外にありえないので throw する。
 */
export function normalizeImageTransform(transform: StorageImageTransform): StorageImageTransform {
  const normalized: StorageImageTransform = {}

  if (transform.width !== undefined) {
    normalized.width = clamp(
      Math.round(assertFinite(transform.width, 'width')),
      IMAGE_TRANSFORM_LIMITS.minDimension,
      IMAGE_TRANSFORM_LIMITS.maxDimension
    )
  }

  if (transform.height !== undefined) {
    normalized.height = clamp(
      Math.round(assertFinite(transform.height, 'height')),
      IMAGE_TRANSFORM_LIMITS.minDimension,
      IMAGE_TRANSFORM_LIMITS.maxDimension
    )
  }

  if (transform.resize !== undefined) {
    normalized.resize = transform.resize
  }

  if (transform.quality !== undefined) {
    normalized.quality = clamp(
      Math.round(assertFinite(transform.quality, 'quality')),
      IMAGE_TRANSFORM_LIMITS.minQuality,
      IMAGE_TRANSFORM_LIMITS.maxQuality
    )
  }

  if (transform.format !== undefined) {
    normalized.format = transform.format
  }

  return normalized
}

function assertResized(transform: StorageImageTransform, caller: string): StorageImageTransform {
  const normalized = normalizeImageTransform(transform)

  if (normalized.width === undefined && normalized.height === undefined) {
    throw new Error(
      `${caller}: transform requires width and/or height. ` +
        '無変換で配信すると元画像がそのまま転送される（.claude/rules/supabase-first.md）。'
    )
  }

  return normalized
}

function toQueryString(transform: StorageImageTransform): string {
  const params = new URLSearchParams()
  if (transform.width !== undefined) params.set('width', String(transform.width))
  if (transform.height !== undefined) params.set('height', String(transform.height))
  if (transform.resize !== undefined) params.set('resize', transform.resize)
  if (transform.quality !== undefined) params.set('quality', String(transform.quality))
  if (transform.format !== undefined) params.set('format', transform.format)
  return params.toString()
}

function encodePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

/**
 * レスポンシブ表示（`fill` / CSS で伸縮）のときに `sizes` があるかを検査する
 *
 * **transform を通していても、要求する幅が表示サイズより大きければ最適化されていない。**
 * `next/image` は `sizes` が無いとブラウザに「ビューポート幅いっぱい（100vw）」と解釈させるため、
 * 小さな枠に置いた画像でも srcset の最大幅（本リポジトリでは 2500px）が落ちてくる。
 *
 * > 公式: 「If `sizes` is missing, the browser assumes the image will be as wide as the viewport
 * > (`100vw`). This can cause unnecessarily large images to be downloaded.」
 * > 「`sizes` should be used when: The image is using the `fill` prop / CSS is used to make the
 * > image responsive」
 *
 * 固定幅（`width` / `height` 指定）の画像は `sizes` 無しでも 1x / 2x の srcset に収まるので対象外。
 * CSS で伸縮させる場合は静的に判定できないため、`.claude/rules/storage-images.md` の規約で担保する。
 *
 * @throws `fill` を使っているのに `sizes` が無い（または空）場合
 * @see https://nextjs.org/docs/app/api-reference/components/image#sizes
 */
export function assertResponsiveSizes(
  props: { fill?: boolean; sizes?: string },
  caller: string
): void {
  if (props.fill !== true) return
  if (props.sizes !== undefined && props.sizes.trim() !== '') return

  throw new Error(
    `${caller}: fill を使う画像には sizes が必要です。` +
      'sizes が無いとブラウザは 100vw と解釈し、小さな枠でも最大幅の画像を落としてくる' +
      '（.claude/rules/storage-images.md）。例: sizes="(max-width: 768px) 100vw, 384px"'
  )
}

/** Storage の URL 断片（`/storage/v1/{object|render/image}/public/<bucket>/<path>`） */
const STORAGE_PUBLIC_PATH = /^\/storage\/v1\/(?:object|render\/image)\/public\/([^/]+)\/(.+)$/
const STORAGE_PREFIX = '/storage/v1/'

/**
 * public バケットの画像に対する変換済み URL を組み立てる
 *
 * 署名が不要な public バケット専用。private バケット（本リポジトリの既定）では
 * {@link createSignedStorageImageUrl} を使う。
 *
 * @example
 * ```ts
 * buildStorageImageUrl({
 *   supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
 *   bucket: 'avatars',
 *   path: 'users/1/avatar.png',
 *   transform: { width: 96, height: 96 },
 * })
 * // → https://<ref>.supabase.co/storage/v1/render/image/public/avatars/users/1/avatar.png?width=96&height=96
 * ```
 *
 * @throws 変換指定が無い（= 元画像がそのまま配られる）場合、および引数が空の場合
 */
export function buildStorageImageUrl(params: {
  supabaseUrl: string
  bucket: string
  path: string
  transform: StorageImageTransform
}): string {
  const { supabaseUrl, bucket, path, transform } = params

  if (!supabaseUrl.trim()) {
    throw new Error(
      'buildStorageImageUrl: supabaseUrl is empty. NEXT_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL を確認してください。'
    )
  }

  const encodedBucket = encodePath(bucket)
  const encodedPath = encodePath(path)

  if (!encodedBucket) throw new Error('buildStorageImageUrl: bucket is empty')
  if (!encodedPath) throw new Error('buildStorageImageUrl: path is empty')

  const origin = supabaseUrl.trim().replace(/\/+$/, '')
  const query = toQueryString(assertResized(transform, 'buildStorageImageUrl'))

  return `${origin}/storage/v1/render/image/public/${encodedBucket}/${encodedPath}?${query}`
}

/** Supabase Storage が配信する URL かどうか */
export function isStorageObjectUrl(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith(STORAGE_PREFIX)
  } catch {
    // URL として解釈できない = Storage の URL ではない（相対パス・空文字など）
    return false
  }
}

/**
 * 既に保存されている Storage の public URL を、変換済み URL へ書き換える
 *
 * DB に `/storage/v1/object/public/...` の完全な URL を持っている既存データ向け。
 * 新規実装では bucket / path を保存し {@link buildStorageImageUrl} を使うほうがよい
 * （URL ごと保存するとプロジェクト移行やドメイン変更で全行が壊れる）。
 *
 * @throws 署名済み URL（署名後に transform を差し替えられない）と Storage 以外の URL
 */
export function toStorageImageUrl(url: string, transform: StorageImageTransform): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`toStorageImageUrl: not a Supabase Storage URL: ${url}`)
  }

  if (parsed.pathname.includes('/sign/')) {
    throw new Error(
      'toStorageImageUrl: signed URL の transform は署名時に固定される。' +
        'createSignedStorageImageUrl で最初から transform 付きで署名すること。'
    )
  }

  const matched = parsed.pathname.match(STORAGE_PUBLIC_PATH)
  if (!matched) {
    throw new Error(`toStorageImageUrl: not a Supabase Storage public object URL: ${url}`)
  }

  const [, bucket, path] = matched

  return buildStorageImageUrl({
    supabaseUrl: parsed.origin,
    bucket: decodeURIComponent(bucket),
    path: path.split('/').map(decodeURIComponent).join('/'),
    transform,
  })
}

/** `createSignedUrl` だけを要求する最小のクライアント型（テストで実クライアントを立てないため） */
export interface StorageSigningClient {
  storage: {
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number,
        options?: { transform?: StorageImageTransform }
      ): Promise<{
        data: { signedUrl: string } | null
        error: { message: string } | null
      }>
    }
  }
}

/**
 * private バケットの画像に対する **変換済み署名 URL** を発行する
 *
 * 本リポジトリの既定は private バケット（`.claude/rules/supabase-first.md`）なので、
 * 画像表示のほとんどはこちらを通る。
 *
 * **transform は署名トークンに埋め込まれ、発行後に変更できない**。そのため
 * レスポンシブに複数幅を出したい場合は幅ごとに署名 URL を発行する
 * （幅は {@link snapImageWidth} で段に丸めること）。
 *
 * @throws Supabase がエラーを返した場合・URL が得られなかった場合・無変換指定の場合
 */
export async function createSignedStorageImageUrl(
  client: StorageSigningClient,
  params: {
    bucket: string
    path: string
    expiresIn: number
    transform: StorageImageTransform
  }
): Promise<string> {
  const { bucket, path, expiresIn, transform } = params

  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error(
      `createSignedStorageImageUrl: expiresIn must be a positive number of seconds, received ${expiresIn}`
    )
  }

  const normalized = assertResized(transform, 'createSignedStorageImageUrl')

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, { transform: normalized })

  if (error) {
    console.error('Failed to create signed image URL:', { bucket, path, error })
    throw new Error(`createSignedStorageImageUrl: ${bucket}/${path}: ${error.message}`)
  }

  if (!data?.signedUrl) {
    throw new Error(`createSignedStorageImageUrl: no signed URL returned for ${bucket}/${path}`)
  }

  return data.signedUrl
}

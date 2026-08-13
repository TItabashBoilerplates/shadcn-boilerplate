import { describe, expect, it, vi } from 'vitest'
import {
  buildStorageImageUrl,
  createSignedStorageImageUrl,
  IMAGE_TRANSFORM_LIMITS,
  IMAGE_WIDTH_LADDER,
  isStorageObjectUrl,
  normalizeImageTransform,
  snapImageWidth,
  toStorageImageUrl,
} from './storage-image'

const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co'

describe('IMAGE_TRANSFORM_LIMITS', () => {
  it('公式ドキュメントの制限値と一致する（width/height 1-2500・quality 20-100・既定 80）', () => {
    // @see https://supabase.com/docs/guides/storage/serving/image-transformations#limits
    expect(IMAGE_TRANSFORM_LIMITS).toEqual({
      minDimension: 1,
      maxDimension: 2500,
      minQuality: 20,
      maxQuality: 100,
      defaultQuality: 80,
    })
  })
})

describe('IMAGE_WIDTH_LADDER', () => {
  it('昇順で重複が無い', () => {
    expect([...IMAGE_WIDTH_LADDER].sort((a, b) => a - b)).toEqual([...IMAGE_WIDTH_LADDER])
    expect(new Set(IMAGE_WIDTH_LADDER).size).toBe(IMAGE_WIDTH_LADDER.length)
  })

  it('すべて Supabase の上限（2500）以内に収まっている', () => {
    for (const width of IMAGE_WIDTH_LADDER) {
      expect(width).toBeGreaterThanOrEqual(IMAGE_TRANSFORM_LIMITS.minDimension)
      expect(width).toBeLessThanOrEqual(IMAGE_TRANSFORM_LIMITS.maxDimension)
    }
  })
})

describe('snapImageWidth', () => {
  it('要求幅以上で最小の段に丸める（縮小されてぼやけないようにする）', () => {
    expect(snapImageWidth(1)).toBe(16)
    expect(snapImageWidth(64)).toBe(64)
    expect(snapImageWidth(65)).toBe(96)
    expect(snapImageWidth(700)).toBe(750)
  })

  it('上限（2500）を超える要求は 2500 に丸める（Next.js の deviceSizes 3840 等）', () => {
    expect(snapImageWidth(3840)).toBe(IMAGE_TRANSFORM_LIMITS.maxDimension)
  })

  it('小数は切り上げてから丸める（DPR 倍した値が小数になるため）', () => {
    expect(snapImageWidth(64.1)).toBe(96)
  })

  it('段の値は必ず ladder に含まれる', () => {
    for (const requested of [1, 100, 500, 1000, 2000, 5000]) {
      expect(IMAGE_WIDTH_LADDER).toContain(snapImageWidth(requested))
    }
  })

  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('不正な幅は実装バグなので throw する: %s', (width) => {
    expect(() => snapImageWidth(width)).toThrow(/width/i)
  })
})

describe('normalizeImageTransform', () => {
  it('width / height を整数に丸める', () => {
    expect(normalizeImageTransform({ width: 100.4, height: 200.6 })).toEqual({
      width: 100,
      height: 201,
    })
  })

  it('範囲外の width / height は Supabase の許容範囲へクランプする', () => {
    expect(normalizeImageTransform({ width: 9999, height: 0.2 })).toEqual({
      width: 2500,
      height: 1,
    })
  })

  it('範囲外の quality はクランプする（20-100）', () => {
    expect(normalizeImageTransform({ width: 100, quality: 5 }).quality).toBe(20)
    expect(normalizeImageTransform({ width: 100, quality: 300 }).quality).toBe(100)
  })

  it('quality は指定が無ければ省略する（Supabase 既定の 80 に任せる）', () => {
    expect(normalizeImageTransform({ width: 100 })).toEqual({ width: 100 })
  })

  it('resize / format はそのまま保持する', () => {
    expect(normalizeImageTransform({ width: 100, resize: 'contain', format: 'origin' })).toEqual({
      width: 100,
      resize: 'contain',
      format: 'origin',
    })
  })

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])('有限数でない値は実装バグなので throw する: %s', (value) => {
    expect(() => normalizeImageTransform({ width: value })).toThrow()
  })
})

describe('buildStorageImageUrl', () => {
  it('render エンドポイント（/storage/v1/render/image/public）の URL を組み立てる', () => {
    const url = buildStorageImageUrl({
      supabaseUrl: SUPABASE_URL,
      bucket: 'avatars',
      path: 'users/1/avatar.png',
      transform: { width: 200, height: 200 },
    })

    expect(url).toBe(
      `${SUPABASE_URL}/storage/v1/render/image/public/avatars/users/1/avatar.png?width=200&height=200`
    )
  })

  it('resize / quality / format をクエリに載せる', () => {
    const url = buildStorageImageUrl({
      supabaseUrl: SUPABASE_URL,
      bucket: 'avatars',
      path: 'a.png',
      transform: { width: 200, resize: 'contain', quality: 50, format: 'origin' },
    })

    const query = new URL(url).searchParams
    expect(query.get('width')).toBe('200')
    expect(query.get('resize')).toBe('contain')
    expect(query.get('quality')).toBe('50')
    expect(query.get('format')).toBe('origin')
  })

  it('supabaseUrl の末尾スラッシュを吸収する', () => {
    const url = buildStorageImageUrl({
      supabaseUrl: `${SUPABASE_URL}/`,
      bucket: 'avatars',
      path: 'a.png',
      transform: { width: 200 },
    })

    expect(url).toBe(`${SUPABASE_URL}/storage/v1/render/image/public/avatars/a.png?width=200`)
  })

  it('パスの先頭スラッシュを吸収する（// で 404 にならないように）', () => {
    const url = buildStorageImageUrl({
      supabaseUrl: SUPABASE_URL,
      bucket: 'avatars',
      path: '/users/1/a.png',
      transform: { width: 200 },
    })

    expect(url).toBe(
      `${SUPABASE_URL}/storage/v1/render/image/public/avatars/users/1/a.png?width=200`
    )
  })

  it('パスの各セグメントをエンコードする（スラッシュは区切りとして保持）', () => {
    const url = buildStorageImageUrl({
      supabaseUrl: SUPABASE_URL,
      bucket: 'avatars',
      path: 'users/1/プロフィール 写真.png',
      transform: { width: 200 },
    })

    expect(url).toBe(
      `${SUPABASE_URL}/storage/v1/render/image/public/avatars/users/1/${encodeURIComponent(
        'プロフィール 写真.png'
      )}?width=200`
    )
  })

  it('width も height も無い指定は無変換（=ポリシー違反）なので throw する', () => {
    expect(() =>
      buildStorageImageUrl({
        supabaseUrl: SUPABASE_URL,
        bucket: 'avatars',
        path: 'a.png',
        transform: { quality: 50 },
      })
    ).toThrow(/width|height/i)
  })

  it.each([
    ['bucket 未指定', { bucket: '', path: 'a.png' }],
    ['path 未指定', { bucket: 'avatars', path: '' }],
  ])('%s は throw する', (_label, params) => {
    expect(() =>
      buildStorageImageUrl({
        supabaseUrl: SUPABASE_URL,
        ...params,
        transform: { width: 200 },
      })
    ).toThrow()
  })

  it('supabaseUrl が空なら環境変数の設定漏れとして throw する', () => {
    expect(() =>
      buildStorageImageUrl({
        supabaseUrl: '',
        bucket: 'avatars',
        path: 'a.png',
        transform: { width: 200 },
      })
    ).toThrow(/supabase/i)
  })
})

describe('isStorageObjectUrl', () => {
  it.each([
    `${SUPABASE_URL}/storage/v1/object/public/avatars/a.png`,
    `${SUPABASE_URL}/storage/v1/render/image/public/avatars/a.png?width=200`,
    'http://127.0.0.1:54321/storage/v1/object/public/avatars/a.png',
  ])('Supabase Storage の URL を判定できる: %s', (url) => {
    expect(isStorageObjectUrl(url)).toBe(true)
  })

  it.each([
    'https://example.com/a.png',
    '/local/a.png',
    'avatars/a.png',
    '',
  ])('Storage 以外の URL は false: %s', (url) => {
    expect(isStorageObjectUrl(url)).toBe(false)
  })
})

describe('toStorageImageUrl', () => {
  it('保存済みの public object URL を render URL へ書き換える', () => {
    const url = toStorageImageUrl(`${SUPABASE_URL}/storage/v1/object/public/avatars/a.png`, {
      width: 300,
    })

    expect(url).toBe(`${SUPABASE_URL}/storage/v1/render/image/public/avatars/a.png?width=300`)
  })

  it('既に render URL ならクエリを差し替える（transform が二重に付かない）', () => {
    const url = toStorageImageUrl(
      `${SUPABASE_URL}/storage/v1/render/image/public/avatars/a.png?width=100&quality=30`,
      { width: 300 }
    )

    expect(url).toBe(`${SUPABASE_URL}/storage/v1/render/image/public/avatars/a.png?width=300`)
  })

  it('ローカル開発（127.0.0.1:54321）の URL でも動く', () => {
    const url = toStorageImageUrl('http://127.0.0.1:54321/storage/v1/object/public/avatars/a.png', {
      width: 300,
    })

    expect(url).toBe(
      'http://127.0.0.1:54321/storage/v1/render/image/public/avatars/a.png?width=300'
    )
  })

  it('署名済み URL は署名後に transform を変えられないので throw する', () => {
    expect(() =>
      toStorageImageUrl(`${SUPABASE_URL}/storage/v1/object/sign/avatars/a.png?token=xxx`, {
        width: 300,
      })
    ).toThrow(/sign/i)
  })

  it('Storage 以外の URL は throw する（誤って外部画像に付けない）', () => {
    expect(() => toStorageImageUrl('https://example.com/a.png', { width: 300 })).toThrow(/storage/i)
  })
})

describe('createSignedStorageImageUrl', () => {
  function createFakeClient(result: {
    data: { signedUrl: string } | null
    error: { message: string } | null
  }) {
    const createSignedUrl = vi.fn().mockResolvedValue(result)
    return {
      client: { storage: { from: vi.fn().mockReturnValue({ createSignedUrl }) } },
      createSignedUrl,
    }
  }

  it('transform 付きで createSignedUrl を呼び、署名済み URL を返す', async () => {
    const { client, createSignedUrl } = createFakeClient({
      data: { signedUrl: 'https://signed.example/a.png?token=x' },
      error: null,
    })

    const url = await createSignedStorageImageUrl(client, {
      bucket: 'documents',
      path: 'users/1/a.png',
      expiresIn: 60,
      transform: { width: 300.4, quality: 500 },
    })

    expect(url).toBe('https://signed.example/a.png?token=x')
    expect(client.storage.from).toHaveBeenCalledWith('documents')
    // 正規化された transform が渡ること（丸め + クランプ）
    expect(createSignedUrl).toHaveBeenCalledWith('users/1/a.png', 60, {
      transform: { width: 300, quality: 100 },
    })
  })

  it('error を握りつぶさず throw する', async () => {
    const { client } = createFakeClient({ data: null, error: { message: 'Object not found' } })

    await expect(
      createSignedStorageImageUrl(client, {
        bucket: 'documents',
        path: 'a.png',
        expiresIn: 60,
        transform: { width: 300 },
      })
    ).rejects.toThrow(/Object not found/)
  })

  it('error は無いが URL が返らない異常系も throw する', async () => {
    const { client } = createFakeClient({ data: null, error: null })

    await expect(
      createSignedStorageImageUrl(client, {
        bucket: 'documents',
        path: 'a.png',
        expiresIn: 60,
        transform: { width: 300 },
      })
    ).rejects.toThrow()
  })

  it('無変換（width / height 無し）は throw する', async () => {
    const { client } = createFakeClient({ data: { signedUrl: 'x' }, error: null })

    await expect(
      createSignedStorageImageUrl(client, {
        bucket: 'documents',
        path: 'a.png',
        expiresIn: 60,
        transform: { quality: 50 },
      })
    ).rejects.toThrow(/width|height/i)
  })

  it('expiresIn が正の数でなければ throw する', async () => {
    const { client } = createFakeClient({ data: { signedUrl: 'x' }, error: null })

    await expect(
      createSignedStorageImageUrl(client, {
        bucket: 'documents',
        path: 'a.png',
        expiresIn: 0,
        transform: { width: 300 },
      })
    ).rejects.toThrow(/expiresIn/i)
  })
})

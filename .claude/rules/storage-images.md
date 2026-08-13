# Storage 画像ポリシー（Supabase Storage の画像は必ず transform 経由で表示する）

**CRITICAL / NON-NEGOTIABLE**: **フロントエンド（Web / Mobile）で表示する画像のうち、
Supabase Storage に置いてあるものは、必ず Storage の Image Transformation API 経由で配信する。**
元画像の URL（`/storage/v1/object/public/...` や無変換の署名 URL）を `<img>` /
`next/image` / `expo-image` にそのまま渡してはならない。

実装は既に用意してある。**新しく書くのは呼び出し側だけ**で、URL の組み立てを自作しない。

| 対象 | 使うもの |
|---|---|
| Web（Next.js） | `@/shared/ui` の **`SupabaseImage`** |
| Mobile（Expo） | `@/shared/ui` の **`SupabaseImage`** |
| URL だけ欲しい（OGP・メール・API レスポンス等） | `@workspace/client-supabase/storage-image` の `buildStorageImageUrl` / `createSignedStorageImageUrl` / `toStorageImageUrl` |

---

## 0. なぜ強制するか

画像は**アプリの egress の大半を占める**。元画像をそのまま配ると、

- 表示 40px のアバターのために 4MB の JPEG が転送される（そのまま Supabase の egress 課金になる）
- LCP が落ちる（モバイル回線ほど致命的）
- 端末側でのデコード・リサイズも無駄に走る

変換 API を通すだけで、**表示サイズちょうどにリサイズ**され、さらに**クライアントが対応していれば
自動で WebP に変換**される（コード変更不要）。公式も「Images typically make up most of your egress」
として最初に挙げている最適化である。

そして**この不具合はレビューで見つからない**。無変換でも画面は正しく表示され、ビルドも型チェックも
lint も通る。気づけるのは請求が上がったとき、あるいは「遅い」と報告されたときだけなので、
**書く時点で強制する**（＋ `storage-image.policy.test.ts` が CI で止める）。

**課金の形も理解しておく**: 課金対象は「変換した**元画像（origin image）の数**」であって
変換回数ではない。同じ画像を 5 サイズに変換しても origin images は 1。
つまり**サイズを増やしても課金は増えない**（増えるのは CDN キャッシュミス）。
逆に「課金が怖いから無変換で配る」は、egress を増やすだけで完全に逆効果。

---

## 1. 前提（Pro Plan 以上・制限値）

| 項目 | 値 |
|---|---|
| プラン | **Pro Plan 以上**。Dashboard の Storage > Settings > *Enable Image Transformations* が有効であること |
| `width` / `height` | **1〜2500 の整数**（超えると 400） |
| `quality` | **20〜100**（既定 80） |
| `resize` | `cover`（既定） / `contain` / `fill` |
| `format` | 指定しないと自動 WebP。`origin` で元フォーマットを強制 |
| 元画像 | 25MB / 50MP まで |
| 出力できないフォーマット | **HEIC は入力のみ**（出力不可）。iOS からの直アップロードを扱うなら注意 |

**ローカル開発**: `supabase start` の imgproxy は `config.toml` で有効化する。
書いていないと変換 URL がローカルだけ 404 / 400 になり、「本番では動くのにローカルで壊れる」
という切り分けの難しい症状になる（設定変更後は `stop && supabase-start` で再起動が必要）。

```toml
[storage.image_transformation]
enabled = true
```

> boilerplate 本体には `config.toml` を置いていない（`.claude/rules/supabase-config.md` §0）。
> 派生プロジェクトで `config.toml` を作る時点から、この 2 行を必ず入れる。

---

## 2. 実装の入口（バケットの公開設定で分かれる）

本リポジトリの既定は **private バケット**（`.claude/rules/supabase-first.md`）なので、
実際には署名 URL のパターンが主になる。

| バケット | Web | Mobile |
|---|---|---|
| **private（既定）** | サーバー側で `createSignedStorageImageUrl()` → `<SupabaseImage signedUrl={...} />` | 同左 |
| **public**（明示的に public にしたものだけ） | `<SupabaseImage bucket="..." path="..." />` | 同左 |

### 2.1 Web（public バケット）

```tsx
import { SupabaseImage } from '@/shared/ui'

<SupabaseImage
  bucket="public-assets"
  path="hero/cover.jpg"
  width={1200}
  height={630}
  sizes="(max-width: 768px) 100vw, 1200px"
  alt=""
/>
```

`next/image` が生成する srcset の各幅が、そのまま Storage の変換 URL になる
（`supabaseImageLoader`）。`/_next/image` を経由しないので **Vercel の画像最適化枠を消費しない**。

### 2.2 Web（private バケット）

**署名は必ずサーバー側**（Server Component / Server Action / Route Handler）で行う。

```tsx
import { createSignedStorageImageUrl } from '@workspace/client-supabase/storage-image'
import { createServerClient } from '@/shared/lib/supabase'
import { SupabaseImage } from '@/shared/ui'

const supabase = await createServerClient()
const signedUrl = await createSignedStorageImageUrl(supabase, {
  bucket: 'avatars',
  path: `users/${userId}/avatar.png`,
  expiresIn: 60 * 60,
  transform: { width: 96, height: 96 },
})

return <SupabaseImage signedUrl={signedUrl} width={96} height={96} alt="" />
```

**署名 URL は transform が署名トークンに焼き込まれ、発行後に変更できない**。
そのため srcset は作れない（`SupabaseImage` は `unoptimized` で 1 枚だけ出す）。
複数幅が要るなら**幅ごとに署名 URL を発行する**。

### 2.3 Mobile（Expo）

モバイルには srcset が無いので、**表示サイズ（dp）× 端末の DPR** を実ピクセル幅として 1 枚要求する。
`SupabaseImage` が `PixelRatio` を掛けて幅の段に丸めるところまでやる。

```tsx
import { SupabaseImage } from '@/shared/ui'

<SupabaseImage bucket="public-assets" path="hero/cover.jpg" width={320} height={180} />
```

---

## 3. 幅は「段」に丸める（CDN キャッシュのため）

`@workspace/client-supabase/storage-image` の **`IMAGE_WIDTH_LADDER`** が生成しうる幅の全集合で、
`snapImageWidth()` が要求幅を「要求以上で最小の段」に丸める。

1px 刻みの幅をそのまま投げると実質すべてキャッシュミスになり、変換のたびにオリジンへ取りに行く
（速度も egress も悪化する）。**幅を自分で計算して渡さない**。

この段は `apps/web/next.config.ts` の `images.imageSizes` + `images.deviceSizes` と
**一致していなければならない**（Next.js の既定 `deviceSizes` は 3840 を含み、Supabase の上限
2500 を超えるので置き換えてある）。ズレたら `storage-image.policy.test.ts` が落ちる。

---

## 4. `next.config.ts` の `loaderFile` は使わない

公式ドキュメントは `images.loader: 'custom'` + `loaderFile` を案内しているが、これは
**アプリ内のすべての `next/image` に適用されるグローバル設定**である。本リポジトリには
`/next.svg` のようなローカル静的画像も、将来的に外部ドメインの画像もありうるので、
これらまで Storage の URL に書き換えられて全部 404 になる。

したがって **`loader` prop で Supabase の画像だけに適用**する（＝ `SupabaseImage`）。
`loaderFile` を書き足す変更は却下する（policy テストが検知する）。

---

## 5. URL の保存方法

**DB には `bucket` と `path` を保存する。完全な URL を保存しない。**

URL ごと保存すると、プロジェクト移行・カスタムドメイン変更・public/private の切り替えで
**全行が一斉に壊れる**。既に URL で持っている既存データには `toStorageImageUrl()` を使う
（`/object/public/...` → `/render/image/public/...` へ書き換える）。

---

## 6. 禁止パターン

```tsx
// ❌ 元画像の public URL をそのまま表示する（無変換 = 元サイズが転送される）
const { data } = supabase.storage.from('avatars').getPublicUrl(path)
<img src={data.publicUrl} />
<Image src={data.publicUrl} width={40} height={40} alt="" />

// ❌ transform 無しで署名して表示する
const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600)
<Image src={data.signedUrl} ... />

// ❌ URL を文字列で組み立てる
const url = `${supabaseUrl}/storage/v1/object/public/avatars/${path}`

// ❌ next.config.ts に images.loaderFile を足す（ローカル静的画像まで壊れる）

// ❌ 幅を段に丸めずに渡す（CDN キャッシュが効かない）
transform: { width: containerWidth * devicePixelRatio }

// ❌ 署名 URL を発行してから transform を付け直そうとする（署名時に固定される）

// ❌ クライアント側で service_role や secret key を使って署名する
// ❌ 完全な URL を DB に保存する（移行・ドメイン変更で全行が壊れる）
```

---

## 7. チェックリスト（画像を表示する実装をしたら必ず）

| # | 確認 |
|---|---|
| 1 | Storage の画像を `SupabaseImage` 以外で表示していないか |
| 2 | private バケットの署名は**サーバー側**か。`transform` を渡しているか |
| 3 | `width` / `height` は表示サイズに基づいているか（元サイズを丸投げしていないか） |
| 4 | 幅を自前計算せず `snapImageWidth` / `SupabaseImage` に任せているか |
| 5 | DB に保存しているのは `bucket` / `path` か（完全な URL でないか） |
| 6 | 派生プロジェクトなら `config.toml` に `[storage.image_transformation] enabled = true` があるか |
| 7 | `next.config.ts` の `imageSizes` / `deviceSizes` が `IMAGE_WIDTH_LADDER` と一致しているか |
| 8 | 新しい表示状態を足したなら Storybook のストーリーがあるか（`.claude/rules/ui-testing.md`） |
| 9 | `unit-test` が通るか（`storage-image.test.ts` / `storage-image.policy.test.ts`） |

---

## 8. 実装の置き場所

```
frontend/packages/client/supabase/
├── storage-image.ts              # 変換 URL の組み立て・正規化・署名（共通・単体テスト必須）
├── storage-image.test.ts
└── storage-image.policy.test.ts  # 本ポリシーの静的検査（消さない）

frontend/apps/web/src/shared/
├── lib/supabase-image/loader.ts  # next/image 用ローダー
└── ui/supabase-image/SupabaseImage.tsx

frontend/apps/mobile/src/shared/ui/supabase-image/SupabaseImage.tsx
```

---

## 9. 強制事項

このポリシーは**交渉の余地なし**。

- **Storage の画像を無変換で表示する実装はレビューで却下**する。
- **`storage-image.policy.test.ts` の無効化・削除も却下**する（この不具合は静的検査でしか止まらない）。
- 「開発者から指示が無かった」は理由にならない。**指示を待たずに最初から transform を通す**。
- 変換が使えない事情（プランが Free、元画像が HEIC で出力できない等）が判明した場合は、
  黙って無変換にせず**ユーザーに判断をあおぐ**。

## 参考

- [Supabase: Storage Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations) — `getPublicUrl` / `createSignedUrl` の `transform`、制限値、自動 WebP、Next.js ローダー
- [Supabase: Manage Storage Image Transformations usage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations) — 課金は origin 画像単位
- [Supabase: Storage Optimizations](https://supabase.com/docs/guides/storage/production/scaling) — egress の大半は画像
- [Next.js: Image `loader` prop / `deviceSizes` / `imageSizes`](https://nextjs.org/docs/app/api-reference/components/image)
- `.claude/rules/supabase-first.md`（Storage Policy） / `.claude/rules/supabase-config.md` / `.claude/rules/ui-testing.md`

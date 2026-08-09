# List Pagination Policy（一覧はページング前提で作る）

**MANDATORY / NON-NEGOTIABLE**: **件数が増えうる一覧は、開発者からの指示を待たずに最初からページング付きで実装する。**
さらに **UI パターン（ページ番号 / もっと見る / 無限スクロール）は、プラットフォームとそのサービスの
利用文脈に応じてエージェント自身が選定する**。「言われなかったので全件取得にした」は不可。

「今はデータが少ないから」は理由にならない。seed データでは絶対に顕在化せず、**本番でレコードが
増えた時点で初めて壊れる**（レスポンス肥大・DB 全件スキャン・メモリ・初期描画の遅延）。
一覧を作る時点でしか安く入れられない設計なので、後回しは禁止する。

---

## 0. 適用判定（一覧を書き始める前に必ず実行）

以下を順に確認する。**1 つでも「はい」ならページング必須**。

| # | 判定 |
|---|---|
| 1 | 時間の経過とともに行が増えるか？（投稿・注文・ログ・通知・メッセージ・履歴・監査） |
| 2 | ユーザー / テナント / 組織が増えると行が増えるか？ |
| 3 | 外部データ（インポート・同期・Webhook）で行が入るか？ |
| 4 | 件数の上限が**スキーマまたは仕様でハードに保証されていない**か？ |

**ページングが不要なのは、上限が構造的に保証されている場合のみ**（例: 「1 ユーザーの所属組織は最大 5」
「enum 由来の固定マスタ」）。その場合も **`limit` は必ず付け**、上限が保証される根拠をコード上の
コメントに 1 行残す。

> 既存コードで未ページングの一覧を見つけたら、担当タスクの範囲内なら直す。範囲外なら**報告する**
> （黙って放置しない）。

---

## 1. 原則: 無制限クエリの禁止（全レイヤー共通）

**取得件数の上限が無いクエリを書いてはならない。** フロント / Edge Functions / backend-py のすべてで、
一覧取得には必ず件数制限を付ける。

```ts
// ❌ 禁止: 全件取得してからクライアントで切る
const { data } = await supabase.from('items').select('*')
const page = data.slice(offset, offset + 20)

// ✅ DB 側で切る
const { data } = await supabase
  .from('items')
  .select('*')
  .order('created_at', { ascending: false })
  .order('id', { ascending: false })   // 決定的ソートのための tiebreaker（必須）
  .range(from, from + PAGE_SIZE - 1)   // range は 0-based / 両端含む
```

- **ページングは常にサーバー（DB）側**で行う。クライアント側 `slice` / `filter` での擬似ページングは禁止。
- **API の `limit` はサーバー側でクランプする**（既定 20 / 最大 100 など）。クライアントが渡した値を
  そのまま DB へ流さない（`?limit=100000` で落とせてしまう）。
- **ページサイズはマジックナンバーにしない**。`PAGE_SIZE` として一覧のスライス（または `shared/config`）に
  定数で置き、UI とクエリで同じ値を参照する。

---

## 2. UI パターンの選定（エージェントが自分で決める）

### 2.1 まず既定表を見る

指示が無い場合の**既定**。ここから外すときだけ理由を説明する。

| 画面の性格 | 既定パターン |
|---|---|
| Web の管理画面 / データテーブル / 検索結果（目的志向・比較・並べ替え・絞り込みがある） | **ページ番号 + URL 同期**（`?page=2`） |
| Web の公開一覧で SEO・共有・被リンクが要る（記事一覧・商品一覧・公開ディレクトリ） | **ページ番号 + URL 同期** |
| Web の探索的なカードグリッド / ギャラリー / フィード（モバイル比率が高い） | **「もっと見る」ボタン** |
| Mobile（Expo / React Native）のリスト全般 | **無限スクロール**（`onEndReached`）＋ 明示的な再試行 UI |
| チャット / タイムライン / 通知（時系列で端が最新、前方に行が挿入される） | **カーソル（keyset）ページング**＋方向付きの追加読み込み |
| 上限が構造的に保証された少数リスト | ページング UI 不要（`limit` は付ける） |

### 2.2 迷ったときの判断軸

| 軸 | ページ番号が有利 | 「もっと見る」が有利 | 無限スクロールが有利 |
|---|---|---|---|
| ユーザーの目的 | 探す・比較する・戻る | 中間（軽い探索） | 眺める・消費する |
| 位置の共有 / ブックマーク / ディープリンク | ✅ URL に載る | △ | ❌ 失われる |
| SEO・クローラビリティ | ✅ 各ページが実 URL | ❌ | ❌ |
| フッター（法務リンク・サイトマップ等）がある | ✅ | ✅ | ❌ フッターに到達できない |
| キーボード / スクリーンリーダー | ✅ | ✅ | △ 追加実装が必須 |
| 詳細へ遷移して戻る動線が多い | ✅ 位置が URL で復元 | △ | ❌ 位置復元が難しい |
| 入力デバイスがタッチ主体 | △ | ✅ | ✅ |
| 「あと何件あるか」を見せたい | ✅ 総数を出せる | △ | ❌ |

**迷ったら「もっと見る」を選ぶ。** 失敗コストが最も小さく（フッターに到達でき、キーボードで進められ、
後から IntersectionObserver を足せば無限スクロールに移行できる）、逆方向の移行も容易。

**無限スクロールを選ぶ場合の必須条件**（1 つでも満たせないなら「もっと見る」にする）:

1. その画面に**フッター（またはリスト後方の到達必須要素）が無い**こと
2. **「もっと見る」ボタンを DOM 上に残し**、IntersectionObserver での自動発火はその上乗せにすること
   （＝キーボード操作でも必ず次ページへ進める）
3. **スクロール位置の復元**（詳細へ遷移 → 戻る）が担保されていること
4. 読み込み中・末尾到達・失敗のいずれも視覚的に判別できること

> Google のクローラは**ユーザー操作を必要とする JavaScript を実行しない**ため、SEO 対象の一覧を
> 「もっと見る」/ 無限スクロールだけで構成してはならない（各ページが `<a href>` で辿れる実 URL を持つこと）。

### 2.3 選定理由を残す

一覧を実装したら、**PR 説明またはユーザーへの報告に 1 行**で「どのパターンを選び、なぜか」を書く
（例: 「管理画面のテーブルなので、URL 共有と戻る操作を優先してページ番号方式にした」）。
判断が割れる要件（SEO の必要有無など、後から変えると URL 設計ごと壊れるもの）は、
**実装前にユーザーへ確認**する。

---

## 3. Web 実装 — ページ番号方式

### 3.1 URL が正（`?page=`）

- ページ状態は **`useState` ではなく URL のクエリパラメータ**に置く（共有・ブックマーク・戻る操作・
  リロードのすべてが自然に成立する）。
- フラグメント（`#page=2`）は使わない（クローラが無視する）。
- ページ間の移動は **`<a href>`**（`next/link` または `@/shared/lib/i18n` の `Link`）。`onClick` だけの
  `<button>` は禁止（`.claude/rules/page-navigation.md` ルール 5 と整合）。

```tsx
// app/[locale]/items/page.tsx（Server Component）
const PAGE_SIZE = 20

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const parsed = Number.parseInt(page ?? '1', 10)
  const current = Number.isFinite(parsed) && parsed > 0 ? parsed : 1   // 不正値は 1 に丸める
  const from = (current - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data, count, error } = await supabase
    .from('items')
    .select('*', { count: 'estimated' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (error) {
    console.error('Failed to load items:', error)
    throw new Error(error.message)   // 握りつぶさない（error-handling.md）
  }

  return <ItemsPage items={data} page={current} pageSize={PAGE_SIZE} total={count ?? 0} />
}
```

- **総件数**が要る（「全 N 件」「最終ページ番号」）ときだけ `count` を取る。
  大きなテーブルは `count: 'estimated'`（`'exact'` は `COUNT(*)` 相当で重い）。**正確な総数が
  UI 要件でないなら `count` を取らない**。
- 範囲外ページ（`page` が最終ページ超）は空リストではなく**最終ページへリダイレクト、または明示的な
  「該当なし」表示**にする。無言の空白は禁止。

### 3.2 ページャ UI は共有コンポーネント

**独自のページャを画面ごとに書かない**（`.claude/rules/clean-code.md` の重複禁止）。
`@workspace/ui` に無ければ shadcn の `pagination` を追加して共有する。

```bash
# 例: packages/ui へ追加（shadcn MCP / CLI 経由）
```

- `<nav aria-label>` を持ち、現在ページに `aria-current="page"` を付ける。
- ラベル（「前へ」「次へ」「全 {total} 件中 {from}–{to} 件」）は **next-intl 必須**（`.claude/rules/i18n.md`）。

---

## 4. Web 実装 — 「もっと見る」/ 無限スクロール

TanStack Query v5 の `useInfiniteQuery` を使う（`@workspace/query` から import）。
v5 は **`initialPageParam` が必須**で、`getNextPageParam` が `undefined` を返すと `hasNextPage === false`。

```ts
// entities/item/api/useItemsInfinite.ts
'use client'
import { useInfiniteQuery } from '@workspace/query'
import { createClient } from '@workspace/client-supabase/client'
import { itemKeys } from '../model/keys'

const PAGE_SIZE = 20
type Cursor = { createdAt: string; id: string }

export function useItemsInfinite() {
  const supabase = createClient()

  return useInfiniteQuery({
    queryKey: itemKeys.list('infinite'),
    initialPageParam: null as Cursor | null,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE)

      if (pageParam) {
        // keyset: (created_at, id) < (cursor.createdAt, cursor.id)
        query = query.or(
          `created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`,
        )
      }

      const { data, error } = await query
      if (error) {
        console.error('Failed to load items page:', error)
        throw new Error(error.message)
      }
      return data
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined   // 末尾に到達
      const last = lastPage[lastPage.length - 1]
      return { createdAt: last.created_at, id: last.id }
    },
  })
}
```

- **`fetchNextPage` は多重発火させない**: `hasNextPage && !isFetchingNextPage` を必ずガードする。
- 長大なフィードでメモリが問題になる場合は `maxPages` でキャッシュ保持ページ数を制限する
  （双方向にできるよう `getPreviousPageParam` も併せて定義する）。
- 無限スクロールにするときも、**トリガーは「もっと見る」ボタンの可視化**にする:

```tsx
// ボタンは常に DOM に置き、IntersectionObserver は「自動で押す」役にすぎない
<Button ref={sentinelRef} onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
  {t('loadMore')}
</Button>
```

- 追加読み込み後は **`aria-live="polite"` で「{n} 件追加しました」を通知**するか、追加分の先頭へ
  フォーカスを移す（スクリーンリーダー利用者が増加に気づけるようにする）。
- 読み込み失敗時はリストを消さず、**末尾に再試行ボタン**を出す（自動リトライの無限ループにしない）。

---

## 5. Mobile 実装（Expo / React Native）

- リストは必ず**仮想化されたリスト**（`FlatList` / `SectionList`。導入済みなら `FlashList`）を使う。
  `ScrollView` に `.map()` で全件流すのは禁止。
- 追加読み込みは `onEndReached` + `onEndReachedThreshold`。**`keyExtractor` 必須**。

```tsx
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  onEndReachedThreshold={0.5}
  onEndReached={() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }}
  ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
  ListEmptyComponent={<EmptyState />}
  refreshing={isRefetching}
  onRefresh={refetch}
/>
```

- **Pull-to-refresh を付ける**（モバイルでは最新化の標準操作）。
- 失敗時はフッターに再試行 UI を出す（`ListFooterComponent`）。無言で止めない。
- `@workspace/query` を mobile で使う場合は、アプリの `package.json` に workspace 依存として追加する
  （現状 mobile 未導入なら追加もタスクに含める）。

---

## 6. データ層の規約（Supabase / Drizzle / API）

### 6.1 決定的な並び順（必須）

一意でない列だけで `order` するとページ間で**行の重複・欠落**が起きる。
**必ず一意列（`id` など）を tiebreaker として最後に付ける**。

```ts
.order('created_at', { ascending: false })
.order('id', { ascending: false })   // ← 必須
```

### 6.2 offset(range) と keyset(cursor) の使い分け

| 方式 | 使う場面 | 注意 |
|---|---|---|
| **offset / `range()`** | ページ番号 UI、総数と最終ページが要る、深いページへ飛ぶ需要がある | 深いページほど遅くなる（OFFSET は読み飛ばしのコストが線形に増える）。数千行規模を超える一覧では上限ページ数や絞り込み前提を検討 |
| **keyset / cursor** | 無限スクロール・「もっと見る」・フィード・チャット・新着が前方に挿入される一覧 | ソートキーに対応する index が必須。「N ページ目へジャンプ」はできない |

**新着が先頭に挿入される一覧を offset でページングしない**（読み込み中に行がずれ、同じ項目が
2 回出る / 抜ける）。この形は keyset を選ぶ。

### 6.3 index と RLS

- ページングのソートキーには**複合 index**を張る（例: `(created_at desc, id desc)`、テナント分割が
  あるなら `(organization_id, created_at desc, id desc)`）。index は Drizzle スキーマ側に定義する
  （`.claude/rules/database.md` / `drizzle/schema/`）。
- RLS 有効テーブルではポリシー式も実行計画に乗る。ポリシー側の列にも index を張る
  （`.claude/skills/rls/` のパフォーマンス指針に従う）。

### 6.4 バックエンド API のレスポンス契約

Edge Functions / backend-py が一覧を返すときは、**次ページの取り方をレスポンス自身が示す**こと。

```jsonc
// cursor 方式
{ "items": [/* ... */], "nextCursor": "…" }      // 末尾なら null

// page 方式
{ "items": [/* ... */], "page": 3, "pageSize": 20, "total": 1234, "totalIsEstimate": true }
```

- `limit` は**サーバー側でクランプ**（既定値・最大値を定数化）。
- cursor は**不透明な文字列**として扱い、クライアントで組み立てさせない。
- 総数が概算なら `totalIsEstimate` のように**概算であることを型で表す**（UI の「約 N 件」表記に対応）。

---

## 7. 必須の UI 状態

一覧には以下 5 状態をすべて用意する（どれか 1 つでも欠けたら未完成）。

| 状態 | 要件 |
|---|---|
| **初回ローディング** | 共有 `Skeleton` で実寸に近い骨格を出す（`.claude/rules/page-navigation.md` ルール 6） |
| **追加ローディング** | 既存リストを消さず、末尾（またはページャ付近）にインジケータ |
| **空** | 「該当なし」＋次のアクション（絞り込み解除・新規作成）。空白のままにしない |
| **エラー** | ログ出力＋再試行導線。フォールバックで空配列を返して成功に見せるのは禁止（`.claude/rules/error-handling.md`） |
| **末尾到達** | 「すべて表示しました」等の終端表示（無限スクロールでは特に必須） |

すべてのテキストは **next-intl**（`en.json` / `ja.json` 両方）。

---

## 8. 既存ポリシーとの関係

| 関連ルール | 効き方 |
|---|---|
| `.claude/rules/page-navigation.md` | 一覧の初期データは `loading.tsx` + `<Suspense>` でストリーミング。ページ遷移はリンクで |
| `.claude/rules/render-optimization.md` | ページ状態・クエリはスライス内に閉じる。`invalidateQueries` はそのリストのキーにピンポイント |
| `.claude/rules/error-handling.md` | `{ error }` の握りつぶし禁止。空配列フォールバック禁止 |
| `.claude/rules/clean-code.md` | ページャ UI・カーソル生成・`PAGE_SIZE` を画面ごとにコピペしない |
| `.claude/rules/i18n.md` | ページャ・空・末尾・エラーの全文言を i18n |
| `.claude/rules/tdd.md` / `ui-testing.md` | `getNextPageParam`・cursor 生成・ページ番号のパースは**単体テスト必須**。UI は Storybook で 5 状態を網羅 |

---

## 9. チェックリスト（一覧を追加・変更したら必ず）

| # | 確認 |
|---|---|
| 1 | §0 の適用判定を行い、ページングの要否を判断したか |
| 2 | クエリに `limit` / `range` があり、全件取得が無いか |
| 3 | ページングが DB 側で行われているか（クライアント `slice` でないか） |
| 4 | UI パターンを §2 の既定表に沿って選び、理由を 1 行残したか |
| 5 | ページ番号方式なら状態が URL にあり、リンクが `<a href>` か |
| 6 | 無限スクロールなら「もっと見る」ボタンが DOM に残り、フッターを潰していないか |
| 7 | `order` に一意列の tiebreaker があるか |
| 8 | 新着が前方に挿入される一覧を offset でページングしていないか |
| 9 | ソートキー（＋テナント列）に index があるか |
| 10 | `count` は本当に必要か（不要なら取らない / 大テーブルは `estimated`） |
| 11 | 5 つの UI 状態（初回・追加・空・エラー・末尾）が揃っているか |
| 12 | ページャ UI と `PAGE_SIZE` が共有化されているか |
| 13 | 文言が i18n 化されているか（en / ja 両方） |
| 14 | ページングのロジックに単体テスト、UI に Storybook があるか |

---

## 10. 禁止パターン

```ts
// ❌ 全件取得（件数上限が保証されていない一覧）
const { data } = await supabase.from('orders').select('*')

// ❌ クライアント側で擬似ページング
const visible = allRows.slice((page - 1) * 20, page * 20)

// ❌ ページ状態を useState だけで持つ（共有・戻る・リロードで壊れる）
const [page, setPage] = useState(1)

// ❌ tiebreaker の無い order（ページ間で重複・欠落する）
.order('created_at', { ascending: false }).range(from, to)

// ❌ 新着が先頭に入るフィードを offset でページング
// ❌ クライアントの limit をそのまま DB へ流す
// ❌ 無限スクロールでフッターに到達不能にする / キーボードで次ページへ進めない
// ❌ 大テーブルで毎ページ count: 'exact' を取る（総数を表示しないのに取る）
// ❌ 取得失敗時に catch して [] を返し「0 件」として表示する
```

---

## 11. 強制事項

このポリシーは**交渉の余地なし**。

- 件数が増えうる一覧を**未ページングで実装した PR はレビューで却下**する。
- 「ユーザーから指示が無かった」は理由にならない。**パターン選定はエージェントの責務**。
- 後戻りが高くつく分岐（SEO 要件の有無、URL 設計、cursor 契約の公開）だけは、
  推測で進めず**ユーザーに確認**する（`.claude/rules/research.md` / feedback ポリシー）。

## 参考

- [NN/g: Infinite Scrolling: When to Use It, When to Avoid It](https://www.nngroup.com/articles/infinite-scrolling-tips/)
- [NN/g: 3 Alternatives to Infinite Scrolling](https://www.nngroup.com/videos/alternatives-to-infinite-scrolling/)
- [Google Search Central: Pagination and incremental page loading](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)
- [Supabase: `range()` / `count` option](https://supabase.com/docs/reference/javascript/range)
- [TanStack Query v5: Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- `.claude/skills/tanstack-query/` / `.claude/skills/rls/` / `.claude/skills/shadcn-ui/`

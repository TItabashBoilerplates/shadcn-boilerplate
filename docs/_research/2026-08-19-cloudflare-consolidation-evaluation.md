# Cloudflare 統一構成の実現性・コスト評価（vs Vercel + Supabase）

- **調査日**: 2026-08-19
- **対象**: 本リポジトリ（shadcn-boilerplate）の現構成 **Vercel（Web ホスティング）+ Supabase（DB / Auth / Storage / Edge Functions）** を、**Cloudflare 単一プラットフォーム**へ統一することの実現性とコスト妥当性
- **性質**: 意思決定のための調査。実装・移行は含まない
- **価格はすべて 2026-08 時点の公式ドキュメント記載値**（USD、月額）。出典は §8

---

## 0. 結論（先に 3 行）

1. **「Cloudflare のみに統一」は 2026-08 時点では技術的に成立しない。** Cloudflare には **マネージド Postgres が無く**（PlanetScale との提携＝第三者、ただし Cloudflare 請求）、**エンドユーザー向け認証サービスも無い**（Access は社内向け Zero Trust）。統一するとは実質「**D1(SQLite) + 自前認証 + 自前リアルタイム**」を選ぶことであり、BaaS からセルフビルドへの後退を伴う。
2. **コストメリットは「規模に強く依存」する。** 小〜中規模では月 $50〜400 程度の差にとどまるが、**転送量が TB 級／MAU が 10 万を超えると差が 3〜4 倍（月 $4,000 超）に開く**。効いているのは Cloudflare の **egress 無料**と **MAU 課金が無いこと**、逆に Vercel の Fast Data Transfer / Edge Requests と Supabase の MAU・egress 課金。
3. **したがって推奨は「全面統一しない・段階的に配信層だけ寄せる」。** 本リポジトリ固有の移行コストは **概算 70〜130 人日**（§4）で、シナリオ A/B では回収に 10 年以上かかる。**一方、画像配信を Supabase Storage 変換から外すのは規模に関係なく即効性がある**（Supabase の画像変換は $5 / 1,000 **オリジン画像**と、比較対象の中で突出して高い）。

---

## 1. 前提と調査方法

### 1.1 本リポジトリの現状（コードから確認）

| 項目 | 実装 |
|---|---|
| Web | Next.js 16.3 / React 19.2（`frontend/apps/web`）+ Vercel |
| Mobile / Desktop | Expo（`apps/mobile`）/ Tauri（`apps/desktop`）※ 本件の影響小 |
| DB | Supabase Postgres、**Drizzle が source of truth**、`pgPolicy` による **RLS をスキーマと同時に定義**（`drizzle/schema/schema.ts`）、pgTAP テスト（`supabase/tests/`） |
| Auth | Supabase Auth（`@workspace/client-supabase` / `@workspace/auth`）。**メール＋パスワード必須・再設定/メール変更/削除導線必須**（`.claude/rules/auth.md` / `store-review.md`） |
| Storage | Supabase Storage（private 既定）+ **Image Transformation 必須**（`.claude/rules/storage-images.md`、`SupabaseImage`、CI の policy テスト） |
| サーバ処理 | Supabase Edge Functions（Deno、3 関数 + shared）→ 足りなければ backend-py |
| backend-py | FastAPI + LangChain 系（`apps/api`, `apps/mcp`, `packages/core`、uv workspace） |
| その他 | Doppler（シークレット）/ OneSignal / Sentry / EAS — **いずれも Cloudflare 移行の影響を受けない** |
| Supabase 参照箇所 | コード・設定・ドキュメント計 **213 ファイル**（node_modules 除く） |

**重要**: 認可設計が **RLS 中心**であり、`.claude/rules/` の複数ルール（rls / database / supabase-first / supabase-config / storage-images / auth / mcp-supabase）と skills 群がその前提で書かれている。これは「アプリコードの移行コスト」に加えて「**AI 運用資産の書き換えコスト**」が発生することを意味する（§4）。

### 1.2 調査方法

Cloudflare / Vercel / Supabase / PlanetScale / OpenNext の**公式ドキュメントを一次情報として直接取得**（§8 に URL）。ブログ・第三者記事は単独の根拠にしていない。価格は各社の公開レートカードの数値をそのまま使い、シナリオ計算での**仮定は明示**した。

---

## 2. 「Cloudflare のみ」は成立するか — 機能ギャップ

### 2.1 ギャップ一覧

| 現構成の機能 | Cloudflare での代替 | 判定 |
|---|---|---|
| **マネージド Postgres** | **一次サービス無し**。選択肢は ① D1（SQLite、**1 DB 10GB 上限**）② **PlanetScale Postgres**（提携。CF ダッシュボード/API から作成でき**請求も Cloudflare に寄せられる**が、運用主体は PlanetScale）③ 外部 PG（Neon 等）に Hyperdrive 経由 | ❌ **統一不可** |
| **RLS（`auth.uid()` によるDB側認可）** | D1/SQLite に RLS は無い。Postgres を残しても、Hyperdrive のコネクションプーリング下で per-request の JWT クレーム注入は素直に成立しない | ❌ **アプリ層へ移設が必要** |
| **エンドユーザー認証**（サインアップ / パスワード再設定 / メール変更 / 管理 API） | **一次サービス無し**。Cloudflare Access は社内アプリ向け Zero Trust。現実解は **Better Auth を自前ホスト**（1.5 で D1 をネイティブサポート）か Clerk 等の第三者 | ❌ **統一不可（自前 or 第三者）** |
| Realtime（Postgres 変更のブロードキャスト） | Durable Objects + WebSocket で**自作** | △ |
| Storage | **R2**（egress 無料） | ✅ **むしろ優位** |
| 画像変換 | **Cloudflare Images**（$0.50 / 1,000 ユニーク変換） | ✅ **大幅に優位**（§3.4） |
| Edge Functions（Deno） | **Workers**（3 関数程度なら移植は軽い） | ✅ |
| backend-py（FastAPI / LangChain） | **Python Workers**（2026 に大幅改善。FastAPI / LangChain / Pydantic をサポート、スナップショットでコールドスタート ~1s）／長時間処理は **Containers** or **Workflows** | △ → ✅ |
| pgvector | Vectorize（別プロダクト）or PlanetScale の pgvector / pgvectorscale | △ |
| Next.js ホスティング | **Workers + `@opennextjs/cloudflare`**（Next 16 全マイナー対応、SSR/SSG/ISR/PPR/`use cache`/`after()`/Turbopack 対応）。**Node Middleware は未対応**、Worker 圧縮サイズ上限 **10MiB（Paid）** | △ |
| プレビュー環境（PR ごと） | Workers の Preview URLs / Versions（Vercel ほど作り込まれていない） | △ |
| **Vercel Microfrontends** | **相当品なし**（Workers routes で自作） | ❌ |
| DB ブランチ（Supabase Branching） | PlanetScale のブランチ | ✅ |
| pgTAP による DB テスト | 無し（D1 の場合は破棄） | ❌ |

### 2.2 「統一」の 3 つの解釈と成否

| 解釈 | 構成 | 成立するか |
|---|---|---|
| **完全統一**（Cloudflare の一次サービスのみ） | Workers + D1 + R2 + DO + Images + 自前 Auth | **技術的には可能だが、Postgres・RLS・pgvector・pgTAP を全部捨てる**。10GB/DB 上限のためデータ増でシャーディング設計が必要。本リポジトリの設計思想（DB 側に認可と制約を置く）と真っ向から衝突 |
| **請求統一**（Cloudflare 請求に寄せる） | Workers + **PlanetScale Postgres（CF 課金）** + R2 + 自前 Auth | **現実的**。Postgres と pgvector は維持できる。ただし「Cloudflare のみ」ではなく実態は 2 社構成。RLS は残せるが Hyperdrive 経由の運用に検証が要る |
| **配信層のみ統一** | **Workers（OpenNext）+ R2 + Images**、DB/Auth は **Supabase 継続** | **最も現実的**。Vercel を落とし、Supabase の egress/画像変換課金からも逃げられる |

---

## 3. コスト比較

### 3.1 レートカード（公式値、2026-08）

**Cloudflare**

| 項目 | 含有 | 超過単価 |
|---|---|---|
| Workers Paid | $5/月・**1,000万リクエスト**・**3,000万 CPU-ms** | $0.30 / 100万 req、$0.02 / 100万 CPU-ms |
| **egress / 帯域** | — | **$0（課金なし）** |
| 静的アセットへのリクエスト | **無料・無制限** | — |
| D1 | 250億 rows read、5,000万 rows written、5GB | $0.001/百万 read、$1.00/百万 write、$0.75/GB-月。**1 DB 最大 10GB** |
| R2 | 10GB、Class A 100万、Class B 1,000万 | $0.015/GB-月、A $4.50/百万、B $0.36/百万、**egress 無料** |
| Durable Objects | 100万 req、400,000 GB-s | $0.15/百万 req、$12.50/百万 GB-s（**受信 WebSocket メッセージは 20:1 で課金**） |
| Hyperdrive | — | **Paid では無制限・追加料金なし** |
| Images | **5,000 ユニーク変換** | **$0.50 / 1,000 ユニーク変換**、保存 $5/10万枚、配信 $1/10万 |
| Containers | メモリ 25 GiB-h / CPU 375 vCPU-min / ディスク 200 GB-h | $0.0000025/GiB-s、$0.000020/vCPU-s、$0.00000007/GB-s、egress $0.025〜0.05/GB |

**Vercel Pro（東京 hnd1）**

| 項目 | 含有 | 超過単価 |
|---|---|---|
| プラットフォーム料 | $20/月（1 席・**$20 クレジット**・**1TB 転送**・**1,000万 Edge Requests**） | 追加席 $20/席 |
| Fast Data Transfer | 1TB | **$0.16 / GB** |
| Edge Requests | 1,000万 | **$2.60 / 100万** |
| Fluid: Active CPU / Provisioned Memory | — | **$0.202 / CPU-h**、**$0.0167 / GB-h**（東京。iad1 は $0.128 / $0.0106） |
| Invocations | — | $0.60 / 100万 |
| ISR Writes / Reads | — | $5.20 / $0.52 per 100万 |
| Image Optimization | — | **$0.0661 / 1,000 変換** + cache read $0.52/百万・write $5.20/百万 |
| Microfrontends | 2 プロジェクト | $2 / 100万ルーティング、**追加プロジェクト $250/月** |

**Supabase Pro**

| 項目 | 含有 | 超過単価 |
|---|---|---|
| プラン | $25/月（**$10 コンピュートクレジット**） | — |
| MAU | 10万 | **$0.00325 / MAU** |
| Disk | 8GB | $0.125 / GB |
| **Egress** | 250GB | **$0.09 / GB** |
| Storage | 100GB | $0.0213 / GB |
| Edge Function 実行 | 200万 | $2 / 100万 |
| コンピュート | Micro ≈$10 / Small ≈$15 / Medium ≈$60 / Large ≈$111 / XL ≈$210 | 時間課金。**Read Replica とブランチはクレジット対象外** |
| **画像変換** | **オリジン画像 100 枚** | **$5 / 1,000 オリジン画像**（切り上げ課金） |

### 3.2 シナリオ別の試算

> **仮定（3 シナリオ共通）**: 動的レンダリング比率 30%、動的リクエスト 1 件あたり Active CPU 50〜60ms・インスタンス生存 300〜400ms・メモリ 1GB。Cloudflare 側も同等の CPU を消費すると仮定。数値は**モデル計算**であり実測ではない。

#### シナリオ A — 初期 / PMF 前
リクエスト 200万/月（動的 60万）、転送 100GB、DB 3GB、MAU 5,000、Storage 30GB、オリジン画像 3,000 枚（ユニーク変換 9,000）

| | Vercel + Supabase | Cloudflare（D1 + 自前 Auth） |
|---|---|---|
| ホスティング | $20（クレジット内に収まる） | $5（含有内） |
| DB | $25（Micro はクレジット） | $0（D1 5GB 無料枠内） |
| Storage | 含有内 | $0.30 |
| 画像変換 | **$15**（3,000 オリジン → 3 パッケージ） | $2.00 |
| **合計** | **≈ $60 / 月** | **≈ $7 / 月** |

差 **≈ $53/月（年 $640）**。

#### シナリオ B — 成長期
リクエスト 2,000万/月（動的 600万）、転送 2TB、DB 30GB、MAU 8万、Storage 500GB、オリジン画像 5万枚（ユニーク変換 15万）

| | Vercel + Supabase | Cloudflare |
|---|---|---|
| Edge Requests | $26（1,000万超過） | $3 |
| 転送 | **$160**（1TB 超過 ×$0.16） | **$0** |
| コンピュート | $35（CPU $20 + メモリ $11 + 実行 $4） | $6.6（CPU 超過） |
| プラットフォーム | $20 − $20 クレジット | $5 |
| DB | Supabase $25 + Small 差額 $5 + disk $2.75 + egress $4.5 | PlanetScale PS-10 $12.5（単ノード）／HA は $30〜 |
| Storage | $8.5 | $7.35 + Class B $3.6 |
| **画像変換** | **$250**（5万オリジン）※Vercel 側に寄せれば ≈$10 | **$72.5** |
| **合計** | **≈ $530 / 月**（画像を Vercel 側に寄せれば ≈ $290） | **≈ $110〜130 / 月** |

差 **≈ $160〜400/月**。

#### シナリオ C — スケール
リクエスト 2億/月（動的 4,000万）、転送 20TB、DB 200GB、MAU 50万、Storage 5TB、ユニーク変換 100万

| | Vercel + Supabase | Cloudflare |
|---|---|---|
| Edge Requests | **$494** | $57 |
| 転送 | **$3,040** | **$0** |
| コンピュート | $233 | $47 |
| 画像 | $66（Vercel Image Optimization） | $497 |
| DB / BaaS | Supabase $25 + Large $101 + disk $24 + **egress $427** + **MAU $1,300** + storage $104 | PlanetScale 200GB + 相応インスタンス **≈ $400〜800**（要見積） |
| R2 | — | $75 + Class B $68 |
| **合計** | **≈ $5,800 / 月** | **≈ $1,150〜1,550 / 月** |

差 **≈ $4,300〜4,700/月（年 $52,000〜56,000）**。

### 3.3 コスト構造の要約

- **Cloudflare が勝つ理由は「転送量」と「MAU」の 2 点に集約される。** Cloudflare は egress を課金しない（Workers / R2 とも）ため、シナリオ C では Vercel の $3,040 と Supabase の $427 がまるごと消える。さらに Supabase の MAU 課金 $1,300 も消える（自前 Auth のため）。
- **逆に Cloudflare が高いのは画像変換**（$0.50/1,000 変換）で、Vercel の Image Optimization（$0.0661/1,000）より **約 7.5 倍高い**。大量の画像バリエーションを持つプロダクトでは、Cloudflare Images が最大の費目になりうる（シナリオ C で $497）。
- **Supabase の画像変換（$5 / 1,000 オリジン画像・含有 100 枚）が突出して高い。** 本リポジトリは `.claude/rules/storage-images.md` で **Supabase の変換 API 経由を必須化**しているため、**UGC 画像が増える派生プロダクトでは、この 1 項目だけで月数百ドルに達する**。これは Cloudflare 統一の是非とは独立に見直す価値がある（§6 Step 1）。
- **小規模ではコスト差は誤差。** シナリオ A の差 $53/月 は、エンジニア 1 人の 1 時間分にも満たない。

---

## 4. 移行コスト（本リポジトリ固有）

「完全統一」を選んだ場合の作業量。既存コード・ルール・テスト・ローカル開発環境まで含む。

| ワークストリーム | 内容 | 概算 |
|---|---|---|
| **認証** | Better Auth 自前ホスト。メール+パスワード / OTP / パスワード再設定（モバイルは 6 桁コード方式）/ メールアドレス変更（旧新両方確認）/ パスワード変更（current_password 検証）/ アカウント削除 / セッション永続化（SecureStore）/ 多言語メールテンプレート / `required-flows.test.ts` の書き換え | **15〜25 人日** |
| **認可** | RLS →（D1 なら）アプリ層へ全面移設。全クエリの認可レビュー、pgTAP 破棄、代替テスト設計 | **10〜20 人日** |
| **DB** | Drizzle スキーマは流用可だが D1 なら SQLite 方言・型・マイグレーション経路を刷新。PlanetScale なら移設＋ Hyperdrive 検証 | **5〜15 人日** |
| **Next.js → Workers** | OpenNext 導入、ISR/`use cache` のバッキングストア設定、Worker 10MiB 制約対応、**Next 16 の `proxy.ts`（旧 middleware）周りの既知不具合の回避** | **5〜10 人日** |
| **Storage / 画像** | R2 + Images、`SupabaseImage` 再実装、署名 URL 設計、`storage-image.policy.test.ts` 書き換え | **5〜8 人日** |
| **Edge Functions** | Deno → Workers（3 関数 + shared） | **3〜5 人日** |
| **backend-py** | Python Workers or Containers への移設、LangChain の長時間処理は Workflows へ | **5〜10 人日** |
| **Realtime** | 使う場合、Durable Objects で自作 | **5〜10 人日** |
| **ローカル開発** | devenv の `supabase start` → wrangler / miniflare / ローカル PG、seed、`devenv.nix` 改修 | **5〜8 人日** |
| **CI/CD・IaC・リリース** | GitHub Actions、Terraform、Doppler 連携、`vercel-deploy` 相当の置換 | **5〜8 人日** |
| **ルール・スキル・ドキュメント** | `.claude/rules/` 15 本超 + skills + `docs/` の書き換え（**AI 駆動リポジトリなので、これを怠ると以後の実装品質が落ちる**） | **5〜10 人日** |
| **合計** | | **70〜130 人日（≒ 3.5〜6.5 人月）** |

**回収期間（移行コストを 1 人日 = 5 万円 ≒ $330 と仮置き）**

| シナリオ | 月次削減 | 移行コスト（100 人日 ≒ $33,000） | 回収 |
|---|---|---|---|
| A | $53 | $33,000 | **約 52 年** |
| B | $250 | $33,000 | **約 11 年** |
| C | $4,500 | $33,000 | **約 7 か月** |

---

## 5. コスト以外の論点

| 論点 | 評価 |
|---|---|
| **レイテンシ / リージョン** | Cloudflare Workers は日本国内エッジで実行されるが、**DB 往復はオリジンへ行く**。Supabase（ap-northeast-1）と PlanetScale 東京リージョンでは条件は近い。D1 は単一プライマリ＋読み取りレプリカ構成なので、**書き込みはプライマリまで往復する**（プライマリの配置が効く） |
| **可用性・障害の同時被弾** | 単一ベンダーへの統一は**障害時に全機能が同時に落ちる**ことを意味する。現構成は「フロント（Vercel）と データ（Supabase）」で障害面が分かれている |
| **ロックイン** | D1 / Durable Objects / Workers の API は**移植性が低い**。逆に Postgres + RLS はどのクラウドにも持ち出せる。統一はロックインを強める方向 |
| **CDN 二段重ね（Cloudflare を Vercel の前に置く案）** | **Vercel が明示的に非推奨**としている（Bot Protection の検知精度・パフォーマンスが劣化）。かつ Vercel 側の Fast Origin Transfer（東京 $0.27/GB）が残るため、コスト削減効果も中途半端。**採るなら「前段に置く」ではなく「Workers へ移す」** |
| **ストア審査要件** | `.claude/rules/auth.md` / `store-review.md` が要求する導線（メール+パスワード必須・再設定・アカウント削除）は**認証を自前化しても等しく必須**。自前化は「要件が減る」のではなく「実装責任が増える」 |
| **セキュリティ責任** | 認証・セッション・パスワードハッシュは `.claude/rules/minimal-implementation.md` が **「絶対に自作しない」領域**に挙げている。Better Auth は実績ある OSS なので「自作」ではないが、**運用責任（脆弱性追従・インシデント対応）は自社に移る** |
| **Vercel Microfrontends** | 代替が無い。`docs/_research/2026-07-07-vercel-microfrontends.md` の構成を採用しているなら、この設計自体を作り直す必要がある |
| **AI 運用資産** | 本リポジトリの価値の相当部分が `.claude/rules` + skills にある。これは Supabase 前提で書かれており、**移行はコードよりドキュメントの書き換え量が多い可能性がある** |

---

## 6. 推奨

**全面統一は現時点では推奨しない。** 代わりに、**効果が大きく後戻りできる順**に 3 段階で。

### Step 1（今すぐ・低リスク・規模非依存）— 画像配信の見直し
Supabase Storage の Image Transformation は **$5 / 1,000 オリジン画像・含有 100 枚**で、比較対象の中で最も高い。**UGC 画像を扱う派生プロダクトでは真っ先に効く費目**。
- 選択肢: ① Vercel Image Optimization（$0.0661/1,000 変換）に寄せる ② R2 + Cloudflare Images（$0.50/1,000 変換、**egress 無料**）に寄せる
- Cloudflare 側に寄せる場合、**Supabase を触らずに R2 + Images だけ導入できる**（アーキテクチャの他部分に影響しない）
- 影響: `.claude/rules/storage-images.md` と `SupabaseImage` の見直しが必要（ルール改訂を伴うので、これ自体がユーザー判断事項）

### Step 2（転送量が月 1TB を超えたら・中リスク）— 配信層を Workers へ
Next.js を `@opennextjs/cloudflare` で Workers に載せ、**Vercel の Fast Data Transfer と Edge Requests をゼロにする**。Supabase（DB/Auth/RLS/Realtime）はそのまま残す。
- 消える費目: シナリオ B で $186/月、シナリオ C で $3,534/月
- リスク: OpenNext アダプタの成熟度、**Next 16 の `proxy.ts` 周りの既知の不具合**、Node Middleware 非対応、Worker 10MiB 制約、プレビュー環境の作り込み低下、Microfrontends の喪失
- **前提条件**: Microfrontends を使っていない or 捨てられること

### Step 3（条件を全部満たしたときだけ・高リスク）— データ層の移行
以下を**すべて**満たしたときのみ検討する。
1. 転送量が月 5TB 超、または MAU が 10 万超（＝ Supabase の MAU 課金が月 $500 以上）
2. RLS への依存を減らせる（もしくは PlanetScale Postgres で RLS を維持できると検証済み）
3. 認証の運用責任を自社で持つ体制がある
4. 3.5〜6.5 人月の投資が正当化できる事業規模

### boilerplate としての扱い（本リポジトリ固有の提案）
本リポジトリは**派生プロジェクトの雛形**である。「Supabase 版」と「Cloudflare 版」を二系統維持するのは保守コストが倍になるため非推奨。代わりに、
- **データ層（Supabase）は固定**、
- **配信層（ホスティング / 静的配信 / 画像）は差し替え可能な境界**に整理する

という設計にしておけば、派生プロダクトごとに「Vercel のまま」「Workers に載せる」を選べる。この境界整理自体は 5〜10 人日程度で、統一するかどうかに関係なく有効な投資。

---

## 7. 判断を仰ぎたい点（後戻りが効かない論点）

| # | 論点 | なぜ今決める必要があるか |
|---|---|---|
| 1 | **RLS を認可の中心に据え続けるか** | ここを外すと `.claude/rules/rls` / `database` / pgTAP / Drizzle の `pgPolicy` 前提がすべて崩れる。逆に据え続けるなら D1 は選択肢から消える |
| 2 | **想定する到達規模**（12〜24 か月後の転送量・MAU） | シナリオ A/B なら統一は経済的に成立せず、C なら成立する。**この 1 点で結論が反転する** |
| 3 | **Vercel Microfrontends を使うか** | Cloudflare に代替が無い。使う前提なら Step 2 は選べない |
| 4 | **画像配信の正本をどこにするか**（Supabase 変換 / Vercel / Cloudflare Images） | `.claude/rules/storage-images.md` の改訂を伴う。既存データの `bucket`/`path` 保存方針は維持できるので、**移行自体は後からでも可能**だが、ルールが 1 つに固定されている以上、方針決定は先に必要 |
| 5 | **認証の運用責任を自社で持つか** | 統一の可否を決める最大の要因。持たないなら Supabase Auth 継続（＝統一しない）が確定する |

---

## 8. 出典（一次情報）

**Cloudflare**
- Workers 料金: https://developers.cloudflare.com/workers/platform/pricing/
- D1 料金: https://developers.cloudflare.com/d1/platform/pricing/ ／ 制限: https://developers.cloudflare.com/d1/platform/limits/
- R2 料金: https://developers.cloudflare.com/r2/pricing/
- Durable Objects 料金: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Hyperdrive 料金: https://developers.cloudflare.com/hyperdrive/platform/pricing/
- Containers 料金: https://developers.cloudflare.com/containers/pricing/
- Images 料金: https://developers.cloudflare.com/images/pricing/
- PlanetScale 提携（Cloudflare 請求）: https://developers.cloudflare.com/changelog/post/2026-06-18-planetscale-databases-cloudflare-billing/ ／ https://blog.cloudflare.com/deploy-planetscale-postgres-with-workers/
- Python Workers: https://blog.cloudflare.com/python-workers-advancements/ ／ https://developers.cloudflare.com/workers/languages/python/packages/
- Next.js on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

**Vercel**
- Pro プラン: https://vercel.com/docs/plans/pro
- 料金一覧: https://vercel.com/docs/pricing
- Fluid コンピュート料金（リージョン別 CPU/メモリ単価）: https://vercel.com/docs/functions/usage-and-pricing
- リージョン別料金: https://vercel.com/docs/pricing/regional-pricing ／ 東京: https://vercel.com/docs/pricing/regional-pricing/hnd1
- Cloudflare を前段に置くことについて: https://vercel.com/kb/guide/cloudflare-with-vercel

**Supabase**
- 料金: https://supabase.com/pricing
- コンピュート: https://supabase.com/docs/guides/platform/manage-your-usage/compute
- 画像変換の課金: https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations

**その他**
- OpenNext Cloudflare アダプタ: https://opennext.js.org/cloudflare
- PlanetScale Postgres 料金: https://planetscale.com/docs/postgres/pricing
- PlanetScale pgvector: https://planetscale.com/docs/postgres/extensions/pgvector
- Better Auth 1.5（D1 ネイティブサポート）: https://better-auth.com/blog/1-5

---

## 9. この調査で確認できなかった / 前提を置いた点

- **PlanetScale Postgres の東京リージョン提供状況**は公式ドキュメントから確認できなかった。Step 3 を検討する場合は**必ず先に確認**すること（レイテンシに直結する）。
- **Cloudflare Containers の日本向け egress レート**は、公式が「オセアニア/韓国/台湾 $0.05/GB」「その他 $0.04/GB」としており、日本の分類が明記されていない。
- シナリオ計算の**トラフィック仮定（動的比率 30%、CPU 50〜60ms 等）は本リポジトリの実測ではない**。実際のプロダクトの数値が出たら再計算が必要。
- シナリオ C の PlanetScale インスタンス費用（$400〜800）は 200GB 級の一般的な構成からの概算であり、正式見積もりではない。

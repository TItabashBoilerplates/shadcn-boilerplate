# Doppler MCP 使用ポリシー（エージェントによるシークレット読み書き）

**CRITICAL / NON-NEGOTIABLE**: Doppler 上のシークレット（projects / configs / secrets）を
**調査・作成・更新**する場合は、必ず **`doppler` MCP** を使用すること。Bash で
`doppler secrets set` / `doppler secrets delete` 等を直接叩いてシークレットを書き換えることは
**禁止**する。

> 本ポリシーは **エージェント（AI）自身が Doppler のシークレットを読み書きするとき**の規定。
> アプリ実行時の `doppler run` / devenv の自動ロード（`loadDopplerByEnv`）は対象外。
> シークレットの設計方針・移行は `.claude/skills/doppler/SKILL.md` を参照。

## 現在のフェーズ（← 書き込み前に必ず確認。ローンチ時にここを切り替える）

```
PHASE: 初期構築（full-access）
```

- **初期構築（full-access）**: 実ユーザーがまだいない構築フェーズ。高速イテレーション優先で、
  エージェントは **全 config（prd 含む）のシークレットを作成・更新してよい**。
- **本番（protected）**: ユーザーが稼働し始めたら切り替える保護フェーズ。`prd` への書き込みは
  **明示承認制**になる（後述）。

**フェーズが不明・未宣言の場合は `本番（protected）` として扱う**（安全側に倒す）。

## 書き込み許可レベル（フェーズ × config）

| config | 初期構築（full-access） | 本番（protected） |
|---|---|---|
| `dev` / `dev_personal` | 可（自由・一言示す） | 可（内容を一言示して実行） |
| `stg` | 可（自由・一言示す） | 可（**事前に変更内容を提示しユーザー確認**） |
| `prd` | **可**（影響が大きい変更・delete は一言確認） | **不可**（**明示的なユーザー承認が無い限り書かない**） |

`本番（protected）` の `prd` は、Supabase の `supabase-prod`（read-only 運用）と同じ精神で扱う。
迷ったらユーザーに確認する（`.claude/rules/feedback_ask_user_when_unsure.md`）。

## フェーズに依存しない常時ルール（全フェーズ共通）

- **予約 prefix のキーを作らない**: `GITHUB_` / `SUPABASE_` / `VERCEL_` 始まりのキーは**全 config で
  登録禁止**（各 PF の予約名前空間 → ネイティブ連携の sync が予約値違反で落ち、その config 全体が
  届かなくなる）。**Supabase の env は Doppler で管理しない**（Vercel Marketplace の Supabase 連携と
  Edge Functions の default secrets が供給する）。詳細・代替命名は **`.claude/rules/env-naming.md`**。
- **`doppler` MCP 経由のみ**で読み書きする（Bash の `doppler secrets set/delete` 直叩き禁止）。
- **シークレットの値をチャット / ログ / コミット / PR に出さない**。会話は**キー名のみ**で行う
  （例: 「`STRIPE_API_KEY` を dev に追加します」。値は表示しない）。値はファイルや `.env*` にも書かない。
- 変更は**対象を明示**して最小限に（どの config の どのキー を どうするか）。
- **delete / 一括変更 / config 削除**などの破壊的操作は、フェーズに関わらず必ず事前確認。
- 変更は Doppler の **activity log に残る**前提で運用（監査性）。

## フェーズ切り替え手順（ローンチ時）

ユーザーが着き始めたら、以下を両方行う（**宣言だけでなくトークンでもハードに締める**）:

1. **宣言の更新**: 本ファイル冒頭の `PHASE:` を `本番（protected）` に変更（エージェントの挙動が変わる）。
2. **トークンのスコープ縮小**（ハードな境界）: エージェント/MCP の認証を **dev / stg スコープの
   read-write service token** に切り替える（`DOPPLER_TOKEN`）。これにより、宣言を無視しても
   **prd には物理的に書けなくなる**。公式も「`--config`/`--read-only` フラグは回避されうる」と
   明記しており、ハードな保証はトークンスコープで担保する。

> 初期構築フェーズでは、全 config に書ける token（または個人 keyring login）でよい。

## 必ず MCP を使う操作（例）

| 操作 | MCP ツール例（`mcp__doppler__*`） |
|---|---|
| projects / configs / secrets 一覧 | list 系 |
| secret 値の参照 | get / download 系 |
| secret の作成・更新 | create / update 系 |
| 環境（config）操作 | environments 系 |
| activity log 確認 | logs 系 |

## 禁止パターン

```bash
# ❌ NG: Bash で直接書き込み（全フェーズ）
doppler secrets set STRIPE_API_KEY=sk_live_xxx --config prd

# ❌ NG: 値をチャットやコミットに出す（全フェーズ）
echo "新しい値は sk_live_xxx です"

# ❌ NG: 予約 prefix のキーを Doppler に作る（MCP 経由でも同じく禁止。sync が壊れる）
#    SUPABASE_URL / SUPABASE_SECRET_KEY / VERCEL_TOKEN / GITHUB_TOKEN ...
#    → env-naming.md の代替命名（SB_* / VC_* / GH_*）を使う。Supabase の値はそもそも登録不要

# ✅ OK: doppler MCP の update ツールでキー名指定（フェーズの許可レベルに従う）
# ✅ OK: 移行の一括投入は doppler-import（例外、下記）
```

## 例外（本ポリシーの対象外）

| 操作 | 使うもの |
|---|---|
| **人手**でのシークレット登録（開発者が手で打つ） | `doppler-set <KEY>`（1キー・非表示入力）/ `doppler-import <file>`（一括）= devenv script |
| ローカル紐付け | `init` / `doppler setup`（devenv） |
| アプリ実行時のシークレット注入 | `doppler run` / devenv の `loadDopplerByEnv` |

> `doppler-set` / `doppler-import` は **開発者（人）が手で使う糖衣**（内部で `doppler secrets set/upload`）。
> **エージェント（AI）がシークレットを書き込むときは引き続き `doppler` MCP を使う**（Bash で
> `doppler-set` / `doppler secrets set` を叩かない）。フェーズ制と値の非露出は全経路で守る。

## なぜこのポリシーが必要か

1. **フェーズ最適**: 構築中は速度優先（フルアクセス）、稼働後は事故防止（prd 保護）。
2. **漏洩防止**: 値をチャット/ログ/コミットに出さない運用を全フェーズで徹底。
3. **prd 事故防止**: 本番フェーズは承認ゲート＋トークンスコープで二重に守る。
4. **監査性**: MCP 経由の変更は Doppler の activity log に構造化されて残る。

## 強制事項

このポリシーは**交渉の余地なし**。Bash で `doppler secrets set/delete` を直接叩く実装・提案、
**シークレット値の露出**、**予約 prefix（`GITHUB_` / `SUPABASE_` / `VERCEL_`）のキー登録**、
および**フェーズ宣言を無視した `prd` 書き込み（本番フェーズ）**は**レビューで却下**する。

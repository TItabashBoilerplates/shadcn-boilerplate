# Database Schema Guidelines

## 設計前調査（MANDATORY）

**スキーマを書き始める前に、ベストプラクティスを調査してから設計する。**
正本: `/.claude/rules/design-research.md`

1. Skill を先に起動: `supabase-postgres-best-practices` / `rls` / `drizzle`
2. Drizzle / PostgreSQL / Supabase の**該当バージョンの一次情報**を読む
   （Context7: `resolve-library-id` → `query-docs` / `mcp__supabase__search_docs`）
3. 「テーブル定義」で終わらせず、次まで設計する:
   **制約は DB 側（`NOT NULL` / `UNIQUE` / `CHECK` / FK と `ON DELETE`）/ `timestamptz` で UTC /
   RLS はテーブルと同時（ポリシー列に index・`(SELECT auth.uid())` ラッパー）/
   ページングのソートキー（＋テナント列）に複合 index・一意列の tiebreaker /
   削除カスケード / テナント境界 / 監査列・使用量の集計軸**
   （**集計軸とテナント境界は後から列を足しても過去行が埋まらない**）
4. **設計書と食い違う点を見つけたら、勝手に直さず「意図的かミスか」をユーザーに確認する**。
   スキーマは後戻りできないので、**回答が来るまでマイグレーションを作らない**。

## ORM

- Drizzle ORM for schema definition
- pgPolicy for RLS policies

## Conventions

- UUID primary keys: `uuid_generate_v4()`
- Timestamps: `created_at`, `updated_at`

## Migration

User approval required for production. Local migration は AI 自動実行可。すべて devenv の **tasks** 経由で実行する。Makefile は **deprecated**（削除済み）。

```bash
# Local (AI 実行可)
devenv tasks run app:migrate-dev    # Generate + apply migration + 型生成（フルフロー）
devenv tasks run db:migrate-dev     # マイグレーション生成 + 適用のみ
devenv tasks run model:build        # 型のみ再生成

# Production (ユーザー承認必須)
devenv tasks run -P production db:migrate-deploy
```

正典: `/.claude/rules/commands.md`, `/.claude/rules/database.md`

## RLS

Define RLS policies using pgPolicy in schema files.

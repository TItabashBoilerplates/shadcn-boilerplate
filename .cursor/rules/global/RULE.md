---
description: "Project-wide rules for tech stack, commands, and architecture policies"
alwaysApply: true
globs: []
---
# Project Global Rules

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Web | Next.js 16, React 19, shadcn/ui, TailwindCSS 4 |
| Frontend Mobile | Expo 55, React Native, gluestack-ui |
| Backend | FastAPI (Python), Supabase Edge Functions (Deno) |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Supabase Auth |

## Core Policies (MANDATORY)

以下のポリシーは**必須**です。詳細は各ルールを参照:

| ポリシー | ルール |
|---------|--------|
| Minimal Implementation | `@minimal-implementation` - 実装量を最小化（既存資産 → 標準機能 → マネージド → 実績ある OSS → スクラッチ）。star だけで選定しない |
| Research-First | `@research` - 実装前に公式ドキュメント確認 |
| TDD | `@tdd` - テスト駆動開発、All Green必須 |
| Commands | `@commands` - devenv scripts/tasks 使用必須 (Makefile は削除済み) |
| Auto-Generated | `@auto-generated` - 自動生成ファイル編集禁止 |
| Supabase-First | `@supabase-first` - supabase-js優先 |
| i18n | `@i18n` - 多言語対応必須 |
| DateTime | `@datetime` - UTC保存、Frontend変換 |
| Debugging | `@debugging` - devenv 2.0 native process manager の TUI 最優先 |
| List Pagination | `@list-pagination` - 増えうる一覧は指示前提でページング。UI パターンは自分で選ぶ |
| Auth | `@auth` - Mobile はメール + パスワード必須（OTP のみは審査 2.1 で落ちる）。Web 完結なら OTP 可。メール再設定 / パスワード忘れ / パスワード変更は必須実装 |

## Commands

devenv の **scripts** (PATH 直結) を使用する。Makefile は **deprecated**（削除済み）。

```bash
lint           # 全プロジェクトlint
format         # 全プロジェクトformat
type-check     # 型チェック
test           # 全テスト
ci-check       # CI用全チェック (lint + format-check + type-check)
```

正典: `/.claude/rules/commands.md`

## i18n (MANDATORY)

- All UI text via next-intl
- Both `en.json` and `ja.json` required

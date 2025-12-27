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
| Research-First | `@research` - 実装前に公式ドキュメント確認 |
| TDD | `@tdd` - テスト駆動開発、All Green必須 |
| Commands | `@commands` - Makefileコマンド使用必須 |
| Auto-Generated | `@auto-generated` - 自動生成ファイル編集禁止 |
| Supabase-First | `@supabase-first` - supabase-js優先 |
| i18n | `@i18n` - 多言語対応必須 |
| DateTime | `@datetime` - UTC保存、Frontend変換 |

## Commands

```bash
make lint           # 全プロジェクトlint
make format         # 全プロジェクトformat
make type-check     # 型チェック
make test           # 全テスト
make ci-check       # CI用全チェック
```

## i18n (MANDATORY)

- All UI text via next-intl
- Both `en.json` and `ja.json` required


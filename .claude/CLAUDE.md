@../PROJECT.md
@../AGENTS.md

# Claude Code 固有の指示

本文は上で import した 2 ファイル。**`PROJECT.md` がプロダクト層（このリポジトリの決定事項）、
`AGENTS.md` がスタック層（技術規約の索引）**。ここには Claude Code でしか意味を持たないことだけを書く。
`.claude/rules/*.md` は自動でロードされる（`paths:` 付きは該当ファイルを読んだとき）。

## タスク開始時の手順（MANDATORY）

1. **`PROJECT.md` を読む**（`mode` / 決定事項 / 意図的な逸脱の記録）。書かれていない決定は推測せずユーザーに確認する。
2. **available skills を確認し、該当 Skill を `Skill` ツールで起動する**（`.claude/rules/skills-first.md`。
   確認せずに始めた実装はやり直し）。`find-skills` で探してから「無い」と結論する。
3. **一次情報を読む**。Context7 は `mcp__context7__resolve-library-id` → `mcp__context7__query-docs`
   （`get-library-docs` は存在しない。1 呼び出し 1 トピック、同一の問いに 3 回まで）。
   Supabase は `mcp__supabase__search_docs`。載っていなければ WebFetch で公式サイト。
4. 実装は **devenv コマンドのみ**（`.claude/rules/commands.md`）。終了時は **All Green**（`unit-test` / `ci-check`）。

## MCP の使い分け

| MCP | 用途 | ルール |
|---|---|---|
| `supabase`（ローカル）/ `supabase-prod`（本番、read-only） | Supabase インフラの調査・操作。`psql` / `curl` / `supabase` CLI の直叩き禁止 | `mcp-supabase.md` |
| `doppler` | シークレットの読み書き。フェーズは **`PROJECT.md` の `doppler_phase`**。値はチャット / ログに出さない | `mcp-doppler.md` |
| `context7` | ライブラリの公式ドキュメント（上記手順 3） | `research.md` |
| `magicuidesign` / `shadcn` / `playwright` / `chrome-devtools` / `maestro` | UI 部品の取得・ブラウザ操作・E2E | 各 Skill |

`.mcp.json` が正本。`.codex/config.toml` / `.cursor/mcp.json` は `mcp-sync` で生成する（手で編集しない）。

## サブエージェント（`.claude/agents/`）

| Agent | 使いどころ |
|---|---|
| `spec` | 技術選定・セットアップ・設定ファイル編集前の最新仕様調査。結果は `docs/_research/` |
| `task-planner` / `task-executor` | 大きなタスクを 1 コミット粒度に分解して実行 |
| `quality-checker` | 変更後の lint / format / 型 / テスト検証（`dev-check` Skill と併用） |

## Hooks（`.claude/settings.json`）

- `SessionStart`: `direnv allow`（devenv shell を有効化）
- `PreToolUse(Bash)`: `rm -rf` を拒否（`trash <path>` を使う）
- `PostToolUse(Edit|Write)`: `.claude/hooks/quality-check.sh`

## この構成を変えるとき

- **スタック層**（`.claude/CLAUDE.md` / `.claude/rules/` / `.claude/skills/` / `.claude/agents/` / `AGENTS.md`）には
  「このリポジトリが何か」を書かない。適用範囲が `mode` で変わる規約は `PROJECT.md` の `mode` を参照する形で書く。
- **プロダクト層**（`PROJECT.md`）にはスタックの規約を書かない。
- この境界は `frontend/policy/project-manifest.policy.test.ts` が検査する（消さない）。
- CLAUDE.md は 200 行以下を目安にする（公式ガイド）。常時ロードが必要ない規約は `paths:` で絞るか Skill に移す。

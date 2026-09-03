# AI 設定の層分離（boilerplate → 派生プロジェクト）

調査日: 2026-09-03

## 課題

template から起こしたプロジェクトが boilerplate の `.claude/` をそのまま持つと、
「このリポジトリは boilerplate なので config.toml を置かない」等の**リポジトリの正体に関する記述**が
派生先で誤情報になる（22 箇所あった）。Doppler の PHASE 宣言もスタック側ファイルに埋まっていた。
加えて CLAUDE.md（70 KB）が rules の要約を二重に持ち、`.codex/AGENTS.md` / `.cursor/rules/` にも
古い抄録があった（Expo 55 のまま、rules 12 本欠落）。

## 一次情報

| 事実 | 出典 |
|---|---|
| `@path` import は**書いたファイル基準の相対パス**で解決。最大 4 段 | [How Claude remembers your project](https://code.claude.com/docs/en/memory) "Relative paths resolve relative to the file containing the import" |
| import しても文脈は減らない（起動時に展開される） | 同上 "imported files still load and enter the context window at launch" |
| CLAUDE.md は **200 行以下が目安**。長いと adherence が落ちる | 同上 "target under 200 lines per CLAUDE.md file" |
| `paths:` の無い rule は毎回ロード（`.claude/CLAUDE.md` と同じ優先度） | 同上 "Rules without paths frontmatter are loaded at launch" |
| `AGENTS.md` は CLAUDE.md から import して二重化を避けるのが公式推奨 | 同上 "create a CLAUDE.md that imports it so both tools read the same instructions" |
| HTML コメントは文脈に載る前に除去される | 同上 "Block-level HTML comments ... are stripped" |
| Codex はリポジトリルートからの `AGENTS.md` を読む。`.codex/AGENTS.md`（リポジトリ内）は読む場所として記載なし | [Codex: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) |
| Cursor はルートの `AGENTS.md` を `.cursor/rules` の代替として読む。`.cursor/rules` の素の `.md` は無視される | [Cursor: Rules](https://cursor.com/docs/context/rules) |

## 決定

- **スタック層**（boilerplate 所有）: `.claude/CLAUDE.md` / `.claude/rules/` / `.claude/skills/` / `.claude/agents/` / `AGENTS.md`。
  リポジトリの正体を書かない。適用範囲が変わる規約は `PROJECT.md` の `mode` を参照する。
- **プロダクト層**（派生先所有）: `PROJECT.md`。frontmatter に機械可読な決定事項（mode / distribution / tenancy /
  locales / seo_public_pages / supabase_plan / doppler_phase / services.*）、本文に概要と意図的な逸脱の記録。
- `.claude/CLAUDE.md` は `@../PROJECT.md` + `@../AGENTS.md` + Claude Code 固有事項のみ（51 行）。
- 境界は `frontend/policy/project-manifest.policy.test.ts` で静的検査する。
- `.claude/memory/`（rules と重複）、`.codex/AGENTS.md` + `.codex/skills/`、`.cursor/rules/` + `.cursor/skills/`
  （手コピーの抄録）は削除。
- ディレクトリに閉じる rule 5 本（store-review / python-monorepo / supabase-config / storage-images / datetime）に `paths:` を付けた。

## 見送ったもの

- **upstream 同期**（派生先が boilerplate の更新を取り込む仕組み）: 今回は対象外。層のパスが重ならないので、
  後から `git checkout upstream/main -- .claude/rules ...` 方式やプラグイン配布を足せる。
- 常時ロード rule のさらなる `paths:` 化: 設計時に見えなくなる副作用があるので、横断的なポリシー
  （auth / list-pagination / minimal-implementation 等）は常時のまま。

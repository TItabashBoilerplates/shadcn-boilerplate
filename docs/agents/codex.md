# Codex で共通のルール・スキルを使う

この文書は Codex 用の読み替え手順。プロジェクトの決定事項は `PROJECT.md`、技術規約はルートの `AGENTS.md` と `.claude/` が正本。

## 作業開始時

1. `PROJECT.md` と適用範囲の `AGENTS.md` / `AGENTS.override.md` を読む。すでに全文がコンテキストにあるものは読み直さない。
2. `.claude/CLAUDE.md` と、作業対象の階層にある `CLAUDE.md` / `CLAUDE.local.md` があれば補足指示を読む。`@path` は自動展開されないため、参照元ファイルを基準に解決する。読み込み済みの同じ実体は省き、循環を避ける。Markdown のコード内の `@` は import と扱わない。
3. `AGENTS.md` の Rules 索引と `.claude/rules/` の frontmatter を確認する。`paths` のないルールはその適用範囲の全作業で読む。`paths` 付きは、該当するファイルを読む・編集する、またはその操作を行う前に全文を読む。パスは `.claude` を置いたプロジェクトを基準とし、リスト・カンマ区切り・glob の brace 展開を解釈する。対象範囲が増えたら適用ルールも見直す。
4. Skill 一覧の名前・説明から作業に必要なものを選び、その `SKILL.md` と必要な参照先だけを読む。索引の要約は、適用されるルールや Skill 本文の代わりにはしない。

## スキルの共有

- `.agents/skills/claude -> ../../.claude/skills` が自作 Skill を Codex の標準探索先へ公開する。サブディレクトリに置かれた Skill も検出される。
- 外部 Skill の実体は引き続き `.agents/skills/<name>/`、Claude 側はそれへのリンク。二つの経路から見える同じ実体は Codex が重複排除する。
- 自作 Skill の実体は引き続き `.claude/skills/<name>/`。ディレクトリ全体を参照するので、scripts・references・assets の相対パスも維持される。自作 Skill の追加・更新を Codex 用にコピーしない。
- 名前を指定された Skill が一覧に見つからなければ `.claude/skills/<name>/SKILL.md` と実際の frontmatter を確認する。大量の Skill があると初期一覧から省略されることがある。関係のない本文の一括読み込みはしない。
- シンボリックリンクを保持して checkout する。Windows は Git の symlink 対応を有効にした環境か WSL を使う。リンクが単なる文字列ファイルになっている場合は、その状態を直してから検出を確認する。

## Claude 固有の表記

| Claude の表記 | Codex での扱い |
|---|---|
| `Skill` / `/skill-name` | 該当 `SKILL.md` を読んで手順を適用。実在しない `Skill` ツールを呼ばない |
| `Read` / `Write` / `Edit` / `Bash` | 利用可能なファイル操作・シェルツール |
| `WebSearch` / `WebFetch` | 利用可能な検索・ページ取得ツール。MCP は実際に提供された名前・引数を確認 |
| `AskUserQuestion` | 利用可能な質問手段、または会話での確認 |
| `Agent` / `Task` | 利用可能なサブエージェント機能。役割が必要なら `.claude/agents/` の該当文書を読む |
| `$ARGUMENTS` | ユーザーが指定した引数。シェル変数として評価しない |

`disable-model-invocation: true` の Skill はユーザーの明示依頼時だけ使う。Claude の `allowed-tools`、`model`、`effort`、`context: fork`、`hooks` は Codex の実行権限やモデル設定には変換されない。
Hooks は自動移植されない。MCP は既存の `mcp-sync` で `.mcp.json` から生成する。`.codex/config.toml` は生成物なので手動編集しない。

## GPT-6 Astra での進め方

- ユーザー指示と既に得た承認を、Skill の一般的なガイドラインより優先する。通常の可逆な実装判断は進め、結果を変える未決定事項は確認する。`PROJECT.md` の未決定事項を勝手に埋めたり、明示された承認条件を省いたりしない。
- 指示の矛盾は、適用範囲と明記された正本を確認して扱う。停止が必要なら根拠となったファイルと指示を示し、何の判断が必要かを短く説明する。進められる独立した作業は続ける。
- 初期情報は索引を中心に保ち、条件付きルールと Skill は必要になった時に読む。読み込み済みの同じ内容は、変更・コンテキスト欠落がない限り再読しない。
- 必要な品質チェックは維持する。合格後に同じ検証を広げたり繰り返したりするのは、新しい変更・失敗・未解決の懸念があるときだけ。独立した読み取りはまとめ、分担が役立つ調査・レビューはサブエージェントへ任せる。
- モデルや推論強度は利用者の Codex 設定を使う。このリポジトリのために全プロジェクト共通の設定を書き換えない。

## 初回確認

このリポジトリを開いて新しい Codex タスクを開始し、`debugging`、`dev-check`、`app-update` などの自作 Skill が検出されることを確認する。CLI では `/skills` または `$` で一覧を確認できる。
Codex CLI 0.153.4 では、モデルを実行しない `codex debug prompt-input` でも、共通 `AGENTS.md` とスキル一覧が実際の入力に含まれるか診断できる。構文は使用中のバージョンの `--help` を確認する。

根拠と検証記録: [`docs/_research/2026-09-11-codex-claude-sharing.md`](../_research/2026-09-11-codex-claude-sharing.md)。

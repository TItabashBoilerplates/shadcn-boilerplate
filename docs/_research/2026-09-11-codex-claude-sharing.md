# Claude Code と Codex のルール・スキル共有

調査日: 2026-09-11。対象: Codex CLI 0.153.4 / GPT-6 Astra。

## 確認した公式仕様

- [OpenAI: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md): Codex はリポジトリの `AGENTS.md` を自動読込する。同じ階層では `AGENTS.override.md`、`AGENTS.md`、設定済みの代替名の順で1ファイルを選ぶ。
- [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills): `.agents/skills` が標準探索先。symlink に対応し、初期コンテキストは名前・説明・パス、本文は利用時に読み込む。大量のスキルは一覧の説明短縮や省略の対象になる。
- [OpenAI: GPT-6 Astra Model guidance](https://developers.openai.com/api/docs/guides/latest-model): 指示の優先順位を明示し、承認済み作業を継続する。分担が有用な条件と、必要な検証が済んだ後の反復を制限する条件を具体化する。
- [Claude Code: Memory](https://code.claude.com/docs/en/memory): `CLAUDE.md` から `@AGENTS.md` を参照して共通本文を二重管理しない構成を案内。import は記載元基準、`paths` でルールの範囲を絞れる。
- [Claude Code: Skills](https://code.claude.com/docs/en/skills): `SKILL.md` の frontmatter と本文・scripts・references を一つのディレクトリで管理する。Claude 専用の呼び出し制御は Codex の権限設定と同一ではない。

## 選択した構成

既存の `PROJECT.md` / `AGENTS.md` と `.claude/` の分担を維持する。Codex 用の補足は `docs/agents/codex.md` に置き、ルート `AGENTS.md` から読む。
既存 `AGENTS.md` があるため、個人の `project_doc_fallback_filenames` を変更する必要はない。

`.agents/skills/claude -> ../../.claude/skills` の相対リンクで38件の自作 Skill を公開する。既存の外部 Skill はそのまま使う。
YAML frontmatter がなく、現在の正本と異なる `.agents/skills/debugging/SKILL.md` は、正本へのディレクトリリンクに置き換える。既存パスを維持し、古い内容だけを別管理しない。
共通 `dev-check` の残っていた `make` 指示は、現在の正本 `commands.md` に合わせて devenv に修正する。

`mcp-sync` は `.codex/config.toml` 全体を再生成するため、その生成物に手書きの指示やモデル設定を追加しない。
Claude の Hooks・プラグイン実行環境は本変更の対象外。通常のルールと Skill の共有に、Hooks の模倣や追加常駐処理は必要ない。

## 検証方法

- 一時的な小規模リポジトリで、標準探索先の下のディレクトリ symlink から自作 Skill を検出し、外部 Skill が二つの参照経路から見えても同じ実体は1件になることを確認。
- 実リポジトリの `codex debug prompt-input` を変更前後で比較。表示は241件→279件となり、自作38件がすべて各1件で検出された（個人用 Skill 等も含む総数なので、他の環境では総数は異なる）。共通 `AGENTS.md` の読込と、代表的な外部 Skill の重複排除も確認。CLI の stderr は空だった。
- `git diff --check` は成功。devenv 2.0.6 の `tasks run` は既定が `single` のため、`NIXPKGS_ALLOW_UNFREE=1 devenv --impure tasks run --mode before ci:check` で依存チェックを含めて実行。16項目と集約タスクが成功した（最終実行は12項目が成功キャッシュ、5項目が実行成功）。初回に不足していた frontend / drizzle の依存は既存 `setup:install-*` タスクでロックファイルどおりに導入した。Terraform が追記したローカル用ハッシュは変更に含めない。アプリコードの変更はない。
- 別エージェントによる読み取り専用レビューでも、リンク・正本・読み替え手順に修正が必要な問題はなかった。

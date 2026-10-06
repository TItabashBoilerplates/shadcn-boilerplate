# .mcp.json の Codex 同期

確認日: 2026-10-06。ローカル Codex CLI 0.160.0、devenv 内 Deno 2.7.12。
OpenAI Docs スキルを適用し、公式ページ本文とローカル CLI の help を確認した。

## 公式仕様と対応

- Codex は MCP を `config.toml` の `[mcp_servers.<name>]` に設定する。
  プロジェクト単位の `.codex/config.toml` は trusted project の場合に読み込まれる。
  CLI / IDE / desktop は同じホストの設定を共有する。
- stdio は `command` / `args` / `env` / `cwd`、Streamable HTTP は `url` /
  `http_headers` を使う。Claude 形式の `type` / `headers` をそのまま出力しない。
- OAuth が必要なサーバーは `codex mcp login <name>` で認証する。
  設定の読み込み確認 (`codex mcp list` / `get`) と実際の接続確認は別。

既存の設計（`.mcp.json` が正本、`mcp-sync` がローカル設定を生成）を維持する。
新しい依存は追加しない。stdio の `cwd` は生成時の checkout の絶対パスにするため、
別の clone / worktree や移動後にはそこで `mcp-sync` を実行する。
`.codex/config.toml` は環境依存の生成物として引き続き Git ignore の対象とする。
ユーザー全体の `~/.codex/config.toml` や trust / approval 設定は変更しない。

現在の `.mcp.json` の `supabase-prod` は `<PROJECT_REF>` のプレースホルダを含む。
`mode: boilerplate` の未決定値なので埋めず、同期だけ行う。

## 修正・検証

- HTTP ヘッダーのキー修正、stdio cwd の明示、初回の出力ディレクトリ作成。
- TOML 文字列の改行・タブ・引用符・バックスラッシュのエスケープ。
- 不正な既存 Cursor JSON や読み取り権限エラーを握りつぶさない。
- `test-mcp-sync`: 初回生成、HTTP 認証ヘッダー、cwd、文字列、再同期時の古い
  サーバー削除と Cursor の他設定保持、冪等性をサーバーへの接続なしで検証。

実行結果: 回帰テスト 4 件通過。`mcp-sync` で正本の 11 サーバーを再生成し、
Codex CLI の `mcp list` / `get` で登録・ヘッダー・cwd の読み込みを確認した。
接続・OAuth 認証はこの確認には含まない。
全体の `ci-check` は既存の frontend/mobile の型エラー
（`nativewind.styled`、Supabase `UserAttributes.current_password`）で失敗した。

## 一次情報

- [OpenAI: MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [OpenAI: Config basics](https://learn.chatgpt.com/docs/config-file/config-basic)
- [OpenAI: Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Deno: Subprocess API](https://docs.deno.com/api/deno/subprocess/)
- [Deno: File system API](https://docs.deno.com/api/deno/file-system/)

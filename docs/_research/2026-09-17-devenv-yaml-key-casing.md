# devenv.yaml のキー命名と CLI バージョン差（`allow_unfree` が効かなかった件）

- 日付: 2026-09-17
- きっかけ: `devenv.yaml` に `nixpkgs.allow_unfree: true` を書いたのに、生成される
  `.devenv/nixpkgs-config-<hash>.nix` が `cfg = {}` のままで unfree の許可が効かなかった。
  **CI（GitHub Actions）は同じ commit で通っていた。**

## 結論

| 論点 | 結論 |
|---|---|
| なぜ効かなかったか | 手元の devenv CLI が **2.0.6** で、`nixpkgs:` 配下を **camelCase でしか読まない**。snake_case は未知キーとして黙って捨てられていた |
| どう書くのが正しいか | **`nixpkgs.allowUnfree: true`（camelCase）**。2.0.x でも 2.1 以降（snake_case が正で camelCase が alias）でも通る唯一の表記 |
| なぜ CI は通るのか | CI は `nix profile add nixpkgs#devenv` で**毎回最新**を入れる。ローカルの CLI だけが古いまま固定される |
| 再発防止 | `devenv.yaml` に `require_version: ">=2.1"` を宣言し、README の Setup に `devenv --version` と更新手順を明記した |

## 一次情報・実測

- [devenv.yaml options](https://devenv.sh/reference/yaml-options/) — 現行ドキュメントのキーは
  **snake_case**（`nixpkgs.allow_unfree` / `permitted_unfree_packages` …）。`require_version` は
  **2.1 で導入**、`true` / `false` / 制約文字列（`>=`, `<=`, `>`, `<`, `=`, ベア版＝完全一致）を取る。
- インストール済み CLI（2.2.2）のバイナリ内の設定フィールド名を確認したところ、
  `PartialNixpkgsConfig` は **camelCase と snake_case の両方**（`allowUnfree` / `permitted_unfree_packages` …）を
  持っていた。＝ 2.1 以降は camelCase が alias として生き続ける。
- 生成物 `.devenv/nixpkgs-config-*.nix` が読まれたかどうかの判定に使える
  （効いていれば `cfg = { allowUnfree = true; }`、無視されていれば `cfg = {}`）。

実測（devenv 2.2.2、スクラッチの最小プロジェクト）:

```console
$ cat devenv.yaml
require_version: ">=99.0"
$ devenv info
  × devenv version 2.2.2 does not satisfy the constraint '>=99.0' in devenv.yaml

$ cat devenv.yaml            # 未知キーはエラーにならない（黙って無視される）
require_version: ">=2.1"
bogus_key_xyz: true
$ devenv info                # 設定エラーにはならず、そのまま次の処理へ進む
```

- 本リポジトリ（`require_version: ">=2.1"` + `nixpkgs.allowUnfree: true`）で `devenv info` が
  exit 0、`terraform version` が解決（＝ BUSL-1.1 の unfree 評価が通っている）ことを確認済み。

## 教訓

- **devenv.yaml は未知キーを黙って無視する。** 「書いたのに効かない」ときは文法ではなく
  **CLI のバージョンを疑う**（`devenv --version` → `nix profile upgrade devenv` / `nix-env -u devenv`）。
- **公式ドキュメントは常に最新版の表記**。古い CLI が混在しうる環境では、ドキュメントの
  コピペではなく「手元の版で実際に読まれたか」を生成物で確認する。
- CI が常に最新で、ローカルだけ固定されるという**非対称**が「CI は通るのにローカルだけ違う」を生む。
  バージョン差を疑わずに設定を書き換えると、**CI 側を壊す修正**になりかねない。

## 関連

- `devenv.yaml`（`require_version` / `nixpkgs.allowUnfree` とその理由コメント）
- `README.md` §Setup 1（バージョン確認と更新手順）
- `.claude/skills/devenv-cicd/SKILL.md` 「過去の事故と教訓」事故 4

---
name: maestro
description: Maestro による UI テスト / E2E テストの正本。フローを追加・修正する、ローカルと本番（staging / production）で実行環境を切り替える、Web（Next.js）と Mobile（Expo）の両方を回す、Mailpit を使ったメール往復（パスワード再設定・メール変更・サインアップ確認）を書く、要素セレクタや testID を決める、実行中のスクリーンショットを順番に見る、CI で回す、といった場面で必ず起動する。「E2E」「UIテスト」「Maestro」「フローが落ちる」「本番でテストしたい」「スクショを見たい」「エミュレータ」「0 devices connected」「ChromeDriver のバージョンが違う」といった話題も対象。
---

# Maestro UI / E2E テスト スキル

このリポジトリは **Maestro 2.4.0** で Web（Next.js）と Mobile（Expo / React Native）の
UI テストと E2E テストを回す。**ワークスペースの正本は `.maestro/README.md`**、
公式仕様の調査記録は **`docs/_research/2026-08-23-maestro-e2e.md`**。
このスキルは「エージェントが作業するときに踏み外しやすい点」に絞る。

---

## 0. 最初に押さえること（ここを間違えると必ず壊れる）

| # | 事実 | 間違えるとどうなるか |
|---|---|---|
| 1 | **Web のフローは `appId:` ではなく `url:`** を書く（[公式](https://docs.maestro.dev/get-started/supported-platform/web-browser)） | 非公式な書き方になり、将来のバージョンで動かなくなる |
| 2 | **`http` レスポンスは `{ ok, status, body, headers }`。`code` は存在しない** | `response.code !== 200` は常に真 → **成功しても必ず throw**。実際にこのリポジトリの旧スクリプトは 4 本ともこれで、一度も通っていなかった |
| 3 | **`config.yaml` に `env` キーは無い**（[reference](https://docs.maestro.dev/reference/workspace-configuration)） | 環境差分を config に書こうとして詰まる。正しくは `--config`（フローの選抜）＋ `-e`（値） |
| 4 | **`--include-tags` は OR**（「いずれかを含む」） | `--include-tags web,ui` が「web または ui」になり、意図しないフローが走る |
| 5 | **Web はフロー間でブラウザ状態を保持する** | 前のフローのログインが残り、「未ログインで見えるはずの画面」が静かに壊れる。冒頭で `launchApp: clearState: true` |
| 6 | **GraalJS には `fetch` / `async` / `setTimeout` が無い** | `http.get` とビジーウェイトを使う |
| 7 | **`console.log` はコンソールに出ない** | デバッグは `throw new Error(...)`（`maestro.log` に出る）か debug output を見る |
| 8 | **`output.*` は文字列として扱われる** | `assertTrue: ${output.status == 200}` が false になる。比較するなら文字列で |

---

## 1. 実行

```bash
e2e                                    # ローカル・全部
e2e-web --suite ui                     # Web の UI テストだけ
e2e-mobile --suite smoke               # モバイル（エミュレータ / シミュレータ必須）
e2e --env production --suite smoke     # 本番に対するスモーク
e2e --dry-run                          # 実際のコマンドを見る（資格情報は伏せて出る）
e2e-storyboard                         # 直前の結果から storyboard.html を作り直す
```

**素の `maestro` を Bash で直接叩かない**（`.claude/rules/commands.md`）。
runner (`scripts/e2e/maestro.sh`) が環境解決・コンテナ対応・レポート・スクショ収集を
全部持っているので、直叩きすると無言で環境が食い違う。

---

## 2. 環境の切り替え（ローカル ⇄ 本番）

Maestro に「環境ファイル」は無い。公式にあるのは 2 つだけ。

```
--config <file>   →  どのフローを走らせるか
-e KEY=VALUE      →  どの URL・どの資格情報を使うか
```

| | `--env local` | `--env staging` / `--env production` |
|---|---|---|
| config | `.maestro/config.yaml` | `.maestro/config.remote.yaml` |
| 追加で除外されるタグ | — | **`mailbox`**（Mailpit）/ **`admin`**（service_role） |
| Web の URL | `NEXT_PUBLIC_APP_URL` 既定 `http://localhost:3000` | **`E2E_WEB_BASE_URL`（未設定ならエラー）** |
| アカウント | service_role で毎回作って消す | **`E2E_EMAIL` / `E2E_PASSWORD`** を使い、消さない |

**本番向けに既定値を足さないこと。** 「本番を狙ったつもりが localhost を叩いて緑だった」を
防ぐために、リモートでは URL 未設定を即エラーにしてある。

**service_role を絶対にリモートへ渡さない。** runner はリモートプロファイルで
`SUPABASE_SERVICE_ROLE_KEY` を空にする。これにより `ensure-test-user.js` が
「渡された資格情報を使う」モードに落ちる。

### 新しいフローを足すときのタグ判断

```
Mailpit からメールを読む？                → mailbox（リモートでは走らない）
service_role で作る / 消す？               → admin
メール本文のリンク / コードを実際に使う？   → needs-email-templates
どちらも要らず、書き込みもしない？          → ui（本番でも走らせられる）
書き込むが、資格情報を渡せば済む？          → e2e（リモートでも走る）
```

**`needs-email-templates` は runner が `supabase/config.toml` の有無で自動的に
出し入れする。** 既定の Supabase テンプレートは `{{ .ConfirmationURL }}` 形式で、
`@supabase/ssr`（PKCE）が要求する `/auth/confirm?token_hash=...` にならないため、
配線前に走らせると**アプリのバグではない理由で必ず赤くなる**。除外したときは
理由と有効化条件を毎回警告に出す（黙って skip しない）。

**判断を間違えると本番のデータを壊す。** `admin` の付け忘れがいちばん危険。

---

## 3. フローの書き方（このリポジトリの型）

### Web

```yaml
url: ${WEB_BASE_URL}
name: "Web UI — Sign-in screen"
tags:
  - web
  - ui
  - smoke

env:
  WEB_BASE_URL: ${WEB_BASE_URL || "http://localhost:3000"}
  LOCALE: ${LOCALE || "en"}

---
- launchApp:
    clearState: true          # ← 必須。Web は状態を持ち越す
- openLink: ${WEB_BASE_URL}/${LOCALE}/login
- assertVisible: "Sign in"
- tapOn:
    id: "email"               # DOM の id にそのまま一致する（実測済み）
- inputText: ${output.testEmail}
- takeScreenshot: 01-sign-in-initial
```

### Mobile

```yaml
appId: ${APP_ID}
name: "Mobile UI — Sign-in screen"
tags: [mobile, ui, smoke]

env:
  APP_ID: ${APP_ID}
  MOBILE_SCHEME: ${MOBILE_SCHEME || "mobile"}

---
- launchApp:
    clearState: true
    permissions:
      all: allow
- openLink: ${MOBILE_SCHEME}://sign-in
- tapOn:
    id: "email"               # AuthField の testID
- inputText: ${output.testEmail}
- hideKeyboard                # キーボードが CTA を覆う前提で書く
- tapOn: "Sign in"
```

**URL・bundle id・資格情報を直書きしない。** 直書きした瞬間にローカル専用になる。

### 待つときは `extendedWaitUntil`

Next.js の Server Component + Suspense はストリーミングで後から差し込まれる。
固定の待機を入れず、**表示されるまで待つ**。

```yaml
- extendedWaitUntil:
    visible: "Dashboard"
    timeout: 30000
```

---

## 4. 要素の選び方

1. **`id`** — Web は DOM の `id`、Mobile は `testID`（RN が Android の `resource-id` /
   iOS の `accessibilityIdentifier` に落とす）
2. アクセシビリティラベル
3. 表示テキスト（翻訳を変えると落ちるので、変わりにくい文言に限る）
4. index — 最後の手段

**Mobile でラベルのテキストをタップしない。** `tapOn: "Email address"` はラベルの
`Text` 要素に当たり、入力欄にフォーカスが入らないことがある。
`frontend/apps/mobile/src/features/auth/ui/AuthField.tsx` は `testID` を受けて
`InputField` に渡すので、**新しい入力欄を足すときは `testID` も必ず付ける**。

---

## 5. スクリプト（`.maestro/scripts/`）

| ファイル | 役割 |
|---|---|
| `ensure-test-user.js` | **環境に応じて**アカウントを用意する。service_role があれば作る／無ければ `E2E_EMAIL` を使う。出力は `output.testEmail` / `testPassword` / `userId` / `accessToken` |
| `cleanup-test-user.js` | **作ったものだけ**消す（`USER_ID` が空なら何もしない）。消せなかったら throw する（黙って溜めない） |
| `get-auth-email.js` | Mailpit から**コードと確認 URL の両方**を取る。読んだメールは消す |

新しいスクリプトを書くときの型:

```js
// 環境変数は typeof で守る（未注入でも落ちないように）
const url = typeof SUPABASE_URL !== "undefined" && SUPABASE_URL ? SUPABASE_URL : "http://localhost:54321";

const res = http.get(url);
// ✅ ok / status   ❌ code（存在しない）
if (!res.ok) throw new Error(`failed: HTTP ${res.status} ${res.body}`);
const data = json(res.body);
output.something = data.field;
```

---

## 6. スクリーンショットを順番に見る

`takeScreenshot: 01-login-screen` のように**番号を頭に付ける**。
Maestro はフローごとのバンドル（`<session>/<flow>/takeScreenshot/`）に置くので、
そのままでは時系列で追えない。`scripts/e2e/shots.mjs` が

- 実行中: 新しいスクショを **`e2e-results/maestro/shots/NNN-<flow>-<name>.png`** へ通し番号つきで複製
- 終了時: `commands.json`（ステップ列と結果）と突き合わせて **`storyboard.html`** を生成

**失敗時のスクショは Maestro が自動で撮る**ので、`shots/` に `NNN-FAILED-...` として混ざる。

> ユーザーに見せるときは `shots/` の PNG を順番に渡すか、`storyboard.html` を
> Artifact として公開する（1 枚で全フロー分が見られる）。

---

## 7. デバッグ

```bash
e2e-web --suite ui --headed        # ブラウザを見ながら（ローカル GUI 環境のみ）
e2e --dry-run                      # 実際に叩くコマンドを確認
```

失敗時の成果物は `e2e-results/maestro/<session>/<flow>/`:

| ファイル | 中身 |
|---|---|
| `commands.json` | 実行したステップが**順番に**。status / duration / error つき |
| `logs/maestro.log` | そのフローのログ。**`runScript` の throw のメッセージはここに出る** |
| `screenshots/` | **失敗したステップ**のスクショ |
| `screen-hierarchy/` | 失敗時の画面ツリー（**セレクタが当たらない原因はここで分かる**） |
| `manifest.json` | 成果物の索引（ディレクトリを走査せずこれを読む、が公式の言い分） |

---

## 8. 症状別の原因表

| 症状 | 原因と対処 |
|---|---|
| `0 devices connected`（Web） | `--platform web` が渡っていない。runner 経由なら自動で付く |
| root コンテナで Chrome が即終了 | `--no-sandbox` が要る。runner が Selenium の chrome にシムを当てる（`prepare_web_driver`） |
| `This version of ChromeDriver only supports Chrome version N` | PATH の `chromedriver` が Selenium の Chrome と不一致。runner が該当ディレクトリを PATH から外す |
| `runScript` が何をしても失敗する | `response.code` を見ている。`response.ok` / `response.status` にする |
| Android だけメール・API が取れない | エミュレータからホストは `10.0.2.2`。runner が `--platform android` で差し替える |
| 前のフローのログインが残っている | `launchApp: clearState: true` を冒頭に |
| 画面下のほうの要素が「見つからない」 | **Web の `assertVisible` / `tapOn` はビューポート内しか見ない**。縦に長い画面（設定画面など）は `scrollUntilVisible` を挟む |
| ボタンを押したのに何も起きない | 同じ文言の**見出し**を押している（"Sign in" / "Delete account"）。`id` / `testID` で指す |
| ログイン後の要素が見つからない | ストリーミング中。`extendedWaitUntil` で待つ |
| リモートで落ちる | `mailbox` / `admin` タグの付け忘れ。`config.remote.yaml` で除外されるべきフロー |
| 本番を指定したのに緑 | `E2E_WEB_BASE_URL` を確認。runner は未設定ならエラーにする |
| Mobile で入力欄にフォーカスが入らない | ラベルのテキストをタップしている。`testID` を足して `id:` で |

---

## 9. チェックリスト（フローを追加・変更したら）

| # | 確認 |
|---|---|
| 1 | Web なら `url:`、Mobile なら `appId: ${APP_ID}` になっているか |
| 2 | URL / bundle id / 資格情報を**直書きしていない**か（`${VAR \|\| "default"}`） |
| 3 | 冒頭に `launchApp: clearState: true` があるか |
| 4 | タグは正しいか（`ui` / `e2e` / **`mailbox`** / **`admin`** / `smoke`） |
| 5 | 要素は `id` で選んでいるか。Mobile なら `testID` を実装側に足したか |
| 6 | 待機は `extendedWaitUntil` か（固定 sleep を入れていないか） |
| 7 | 節目ごとに `takeScreenshot: NN-...` があるか |
| 8 | `subflows/` に置いたなら `config.yaml` の `flows:` に**入れていない**か |
| 9 | `e2e --dry-run` で意図した config・タグ・URL になっているか |
| 10 | **実際に走らせて緑になったか**（この種の不具合は静的検査では絶対に見つからない） |

---

## 10. 公式ドキュメント

- [Maestro Docs](https://docs.maestro.dev/) / [CLI commands and options](https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options)
- [Parameters and constants（`-e` / `${VAR || "default"}` / `MAESTRO_` 接頭辞）](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/parameters-and-constants)
- [Project configuration（`--config`）](https://docs.maestro.dev/maestro-flows/workspace-management/project-configuration) / [Workspace configuration reference](https://docs.maestro.dev/reference/workspace-configuration)
- [Web Browsers（`url:` ヘッダ・Beta・状態保持）](https://docs.maestro.dev/get-started/supported-platform/web-browser)
- [Make HTTP requests（`ok` / `status` / `body` / `headers`）](https://docs.maestro.dev/maestro-flows/javascript/make-http-requests)
- [Test reports and artifacts（成果物のレイアウト）](https://docs.maestro.dev/maestro-flows/workspace-management/test-reports-and-artifacts)
- [Maestro MCP Server](https://docs.maestro.dev/get-started/maestro-mcp) — `.mcp.json` に `maestro` として登録済み。
  フローの作成・実行・デバッグをエージェントから直接行える公式の口
  （`maestro chat` / MaestroGPT は**廃止**され、MCP が後継）

## 11. リポジトリ内の関連

- `.maestro/README.md` … ワークスペースの正本（構成・環境切り替え・タグ）
- `docs/_research/2026-08-23-maestro-e2e.md` … 公式仕様の調査記録と実測
- `scripts/e2e/maestro.sh` … 実行口（環境解決・コンテナ対応・レポート）
- `scripts/e2e/shots.mjs` … スクショの通し番号化と storyboard 生成
- `.claude/rules/auth.md` / `.claude/rules/store-review.md` … このスイートが守っている要件
- `.claude/rules/tdd.md` … 作業終了時は All Green

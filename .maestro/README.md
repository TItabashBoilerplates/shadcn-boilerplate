# `.maestro/` — UI テストと E2E テスト（Maestro）

Web（Next.js）と Mobile（Expo / React Native）を **同じ YAML の書き方**で回すための
ワークスペース。実行は devenv script から:

```bash
e2e                                    # ローカル・全部
e2e-web --suite ui                     # Web の UI テストだけ（バックエンドに書き込まない）
e2e-mobile --suite smoke               # モバイル（エミュレータ/シミュレータが要る）
e2e --env production --suite smoke     # 本番に対するスモーク
e2e --help                             # オプション一覧
```

実行するとスクリーンショットが **`e2e-results/maestro/shots/` に通し番号つきで**積まれ、
終了時に **`e2e-results/maestro/storyboard.html`**（全フローのスクショとステップを 1 枚で
見られる HTML）が生成される。走っている最中でも `shots/` を覗けば途中経過が順番に見える。

---

## 1. UI テストと E2E テストの違い（この 2 つは目的が別）

| | **UI テスト**（`ui` タグ） | **E2E テスト**（`e2e` タグ） |
|---|---|---|
| 見るもの | 画面が正しく組み上がっているか | ユーザーの用事が最後まで通るか |
| バックエンド | **書き込まない**（読み取りとログイン試行まで） | 書き込む（ユーザー作成・パスワード変更・メール往復） |
| 例 | ログイン画面に「パスワードをお忘れですか？」があるか／パスワード要件のチェックリストが反応するか／言語切り替えが効くか | ログイン → ダッシュボード → 設定／再設定メールを受け取って新パスワードでログインし直す |
| どこで走らせられるか | **local / staging / production のどこでも**（本番のスモークに使える） | local が基本。リモートは「渡された資格情報でログインする」ものだけ |
| 速さ | 速い。壊れたらだいたい画面の問題 | 遅い。壊れたら配線・設定・テンプレートの問題 |

UI テストだけが緑でも「登録できない」は起きるし、E2E だけがあると「どの画面が壊れたのか」が
分からない。**両方要る。**

---

## 2. 環境の切り替え（フルローカル ⇄ 本番）

Maestro に「環境ファイル」という機能は無い。公式にあるのは次の 2 つだけで、
本リポジトリはその 2 つだけで組んである（出典は `docs/_research/2026-08-23-maestro-e2e.md`）。

| 仕組み | 何を切り替えるか | 実体 |
|---|---|---|
| **`--config <file>`** | **どのフローを走らせるか** | `config.yaml`（local）/ `config.remote.yaml`（remote） |
| **`-e KEY=VALUE`** | **どの URL・どの資格情報を使うか** | `scripts/e2e/maestro.sh` が解決して渡す |

```bash
e2e --env local        # 既定。Supabase(Docker) + Mailpit + service_role が使える
e2e --env staging      # E2E_WEB_BASE_URL / E2E_EMAIL / E2E_PASSWORD を使う
e2e --env production   # 同上。書き込むフローは config 側で除外される
```

### プロファイルごとに何が起きるか

| | `local` | `staging` / `production` |
|---|---|---|
| config | `config.yaml` | `config.remote.yaml` |
| 除外されるタグ | `skip` `wip` `store-screenshots` | ＋ **`mailbox`**（Mailpit が要る）**`admin`**（service_role が要る） |
| Web の URL | `NEXT_PUBLIC_APP_URL`（既定 `http://localhost:3000`） | **`E2E_WEB_BASE_URL`（必須）** |
| テストアカウント | service_role で**毎回作って消す** | **`E2E_EMAIL` / `E2E_PASSWORD`**（既存アカウント。消さない） |
| メールの往復 | Mailpit から実際に受け取る | 走らせない |

**リモートで既定値を持たせていないのは意図的**。既定値があると「本番を狙ったつもりが
localhost を叩いて緑だった」が起きる。`E2E_WEB_BASE_URL` が無ければ即エラーにする。

**本番で使う資格情報は、ストア審査用のデモアカウントを想定している。**
これを定期的に通しておくと「審査に出す直前に資格情報が失効していた」を先に検知できる
（App Store Review Guideline 2.1(a)。`.claude/rules/auth.md`）。

> 値は Doppler から渡す。キー名に `GITHUB_` / `SUPABASE_` / `VERCEL_` の予約 prefix を
> 使わないこと（`.claude/rules/env-naming.md`）。だから `E2E_` を付けている。

### フロー側の書き方

フローは**既定値つき**で受ける。こうしておくと、runner を通さない
`maestro test .maestro/web/ui/home.yaml` でもローカル既定値で動く。

```yaml
env:
  WEB_BASE_URL: ${WEB_BASE_URL || "http://localhost:3000"}
  LOCALE: ${LOCALE || "en"}
```

**URL を直書きしない。** 直書きした瞬間にそのフローはローカル専用になる。

---

## 3. ディレクトリ

```
.maestro/
├── config.yaml            # local: 全部走らせる
├── config.remote.yaml     # remote: mailbox / admin を除外
├── web/
│   ├── ui/                # UI テスト（書き込まない）
│   ├── e2e/               # E2E（書き込む）
│   └── subflows/          # runFlow から呼ぶ部品。config の flows に**入れない**
├── mobile/
│   ├── ui/ e2e/ subflows/
├── store/                 # ストア掲載用スクショ（store-screenshots タグ。e2e では走らない）
└── scripts/
    ├── ensure-test-user.js   # 環境に応じて「作る」か「渡されたものを使う」
    ├── cleanup-test-user.js  # 作ったものだけ消す
    └── get-auth-email.js     # Mailpit からコード / 確認 URL を取る
```

`subflows/` を `flows:` グロブに入れないのは、単体で走らせる意味が無いから
（親から `appId` や資格情報を受け取る前提なので、単体実行では必ず落ちる）。

---

## 4. タグ

| タグ | 意味 |
|---|---|
| `web` / `mobile` | プラットフォーム（**絞り込みはディレクトリで行う**。後述） |
| `ui` / `e2e` | §1 の区別。`--suite` がこれで絞る |
| `smoke` | 「これが赤なら他を見る前に直す」最小集合 |
| `auth` / `i18n` | 領域 |
| **`mailbox`** | Mailpit が要る → リモートでは除外 |
| **`admin`** | service_role が要る → リモートでは除外 |
| **`needs-email-templates`** | 認証メールの**リンク / コードを実際に使う** → `supabase/config.toml` で `[auth.email.template.*]` が配線されている環境でのみ走る（後述） |
| `wip` / `skip` | 実行しない |

### `needs-email-templates` は runner が自動で出し入れする

既定の Supabase メールテンプレートが送るのは `{{ .ConfirmationURL }}` 形式のリンクで、
`@supabase/ssr`（PKCE）が要求する `/auth/confirm?token_hash=...` **ではない**。
配線前にパスワード再設定の往復を走らせると、**アプリのバグではない理由で必ず赤くなる**。

この boilerplate は `config.toml` を意図的に置いていない（`.claude/rules/supabase-config.md` §0）。
そこで runner が **`supabase/config.toml` の有無を見て**判断する:

| config.toml | 挙動 |
|---|---|
| 無い（boilerplate のまま） | `--exclude-tags needs-email-templates` を足し、**理由と有効化条件を毎回警告として出す** |
| 有る（派生プロジェクト） | 何もしない → **自動的に走り出す** |

黙って skip しないので、「いつのまにか誰も走らせていないテスト」にならない。

> **`--include-tags` は OR（「いずれかを含む」）**。`--include-tags web,ui` は
> 「web **または** ui」なので、プラットフォームとスイートの AND はタグでは作れない。
> だから runner は**プラットフォームをディレクトリで、スイートをタグで**絞っている。

---

## 5. 要素の選び方

1. **`id`**（Web は DOM の `id`、Mobile は `testID`）… 最優先
2. アクセシビリティラベル
3. 表示テキスト
4. index … 最後の手段

Mobile では**ラベルのテキストをタップしない**。`tapOn: "Email address"` はラベルの
`Text` 要素に当たり、入力欄にフォーカスが入らないことがある。`AuthField` には
`testID` を通してあるので `tapOn: { id: "email" }` を使う。

---

## 6. スクリーンショット

`takeScreenshot: 01-login-screen` のように**番号を頭に付けた名前**で撮る。
Maestro はフローごとのバンドル（`<session>/<flow>/takeScreenshot/`）に置くので、
そのままでは順番に追えない。`scripts/e2e/shots.mjs` が

- 実行中: 新しいスクショを `shots/NNN-<flow>-<name>.png` へ通し番号つきで複製
- 終了時: `commands.json`（ステップ列）と突き合わせて `storyboard.html` を生成

する。手元で作り直すだけなら `e2e-storyboard`。

**失敗時のスクショは Maestro が自動で撮る**（`<flow>/screenshots/`）。
`shots/` には `NNN-FAILED-...` という名前で混ざるので、どこで転んだかがすぐ分かる。

---

## 7. よくある詰まり

| 症状 | 原因 |
|---|---|
| `0 devices connected`（web） | `--platform web` を渡していない。runner は自動で付ける |
| モバイルのフローが走らない | エミュレータ / シミュレータが無いので runner が外している（警告が出る）。`maestro start-device --platform android` で起動してから |
| root コンテナで Chrome が即死 | `--no-sandbox` が要る。runner が Selenium の chrome にシムを当てる |
| `This version of ChromeDriver only supports Chrome version N` | PATH の `chromedriver` が Selenium の Chrome と不一致。runner が PATH から外す |
| Android だけメールが取れない | エミュレータからホストは `10.0.2.2`。runner が `--platform android` のとき差し替える |
| `runScript` が必ず失敗する | `response.code` を見ている。**正しくは `response.status` / `response.ok`** |
| 前のフローのログイン状態が残る | Web はフロー間で状態を保持する。冒頭で `launchApp: clearState: true` |
| リモートでメール往復が落ちる | `mailbox` タグを付け忘れている（`config.remote.yaml` で除外されない） |
| 設定画面の「アカウント削除」が見つからない | Web の `assertVisible` は**ビューポート内しか見ない**。縦に長い画面は `scrollUntilVisible` を挟む |
| ボタンをタップしたのに何も起きない | 同じ文言の**見出し**をタップしている（"Sign in" / "Delete account"）。`id` / `testID` で指す |
| 実行後に `packages/types/schema.ts` に差分が出る | `supabase start` に連動して `model:frontend` が**未マイグレーションの DB から型を再生成**している。`devenv tasks run app:migrate-dev` を流すか、`git checkout -- frontend/packages/types/schema.ts` で戻す（`.claude/rules/auto-generated.md`） |

---

## 8. 参考

- [Maestro Docs](https://docs.maestro.dev/)
- [Project configuration / `--config`](https://docs.maestro.dev/maestro-flows/workspace-management/project-configuration)
- [Parameters and constants / `-e`](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/parameters-and-constants)
- [Web Browsers（`url:` ヘッダ・Beta）](https://docs.maestro.dev/get-started/supported-platform/web-browser)
- [Test reports and artifacts（成果物のレイアウト）](https://docs.maestro.dev/maestro-flows/workspace-management/test-reports-and-artifacts)
- 調査記録: `docs/_research/2026-08-23-maestro-e2e.md`

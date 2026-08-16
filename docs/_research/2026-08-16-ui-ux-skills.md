# Web / Mobile UI/UX 向け Agent Skill 導入調査（2026-08-16）

Web とモバイルの UI/UX を構築するための外部 Agent Skill を調査し、導入・見送りを決めた記録。
すべて **`skills-lock.json` 管理**（`npx skills add <owner>/<repo> -s <skill>`）。

選定基準は `.claude/rules/minimal-implementation.md` §3 に従う
（**archived/deprecated でない・直近の活動がある・実利用の実績がある・商用可ライセンス・
役割が既存採用と重複しない**）。**star 数は単独の根拠にしない**。

---

## 1. 結論（導入したもの・13 スキル）

| Skill | Source | ライセンス / 規模 | 役割（この 1 つだけが担う） |
|---|---|---|---|
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | MIT | **UI を新規に設計するときの起点。** 79 スタイル / 192 パレット / 74 フォントペア / 119 UX ガイドライン / 22 スタック を**検索可能なローカル CSV** として持つ |
| `frontend-design` | `anthropics/skills` | 公式 | 意匠の作り込み。「AI が作った既定値」に見えない画面にする |
| `web-design-guidelines` | `vercel-labs/agent-skills` | MIT / 30.1k★ | **Web Interface Guidelines 準拠での UI レビュー** |
| `baseline-ui` | `ibelick/ui-skills` | MIT / 7.2k★ | 間隔・階層・タイポの**整地（deslop）**。手早い磨き込み |
| `improve-ui` | `ibelick/ui-skills` | MIT | 既存 UI の**監査 → 改善計画の作成**（プロダクトのソースは read-only） |
| `fixing-motion-performance` | `ibelick/ui-skills` | MIT | アニメーションのカクつき（layout thrashing / compositor / scroll 連動 / blur） |
| `accessibility` | `addyosmani/web-quality-skills` | MIT / 2.6k★ | **WCAG 2.2 監査**（スクリーンリーダー・キーボード・コントラスト） |
| `core-web-vitals` | `addyosmani/web-quality-skills` | MIT | **LCP / INP / CLS**。INP と CLS は体感 UX そのもの |
| `performance` | `addyosmani/web-quality-skills` | MIT | 読み込み最適化（Lighthouse 150+ 監査由来） |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` | MIT | React / Next.js の性能パターン |
| `vercel-composition-patterns` | `vercel-labs/agent-skills` | MIT | コンポーネント API 設計（boolean prop の氾濫・compound components） |
| `vercel-react-native-skills` | `vercel-labs/agent-skills` | MIT | RN / Expo の性能（リスト・アニメーション・ネイティブモジュール） |
| `vercel-react-view-transitions` | `vercel-labs/agent-skills` | MIT | **View Transition API**（ページ遷移 / 共有要素アニメーション） |

> **ホスト（提供元）の信頼性**: `addyosmani/web-quality-skills` は Google Chrome の Addy Osmani が
> Lighthouse / Core Web Vitals をもとに公開しているもの。`ibelick/ui-skills` は
> motion-primitives / prompt-kit の作者による "Skills for Design Engineers"。
> `vercel-labs/agent-skills` は Vercel 公式。`frontend-design` は Anthropic 公式。

---

## 2. 役割の重複を避けた選定（`minimal-implementation.md` §3.4）

同じ役割の Skill を複数入れると、エージェントがどれに従うか不定になる。**1 役割 1 スキル**に絞った。

| 役割 | 採用 | 見送り | 理由 |
|---|---|---|---|
| アクセシビリティ監査 | `accessibility`（addyosmani） | `fixing-accessibility`（ibelick） | 前者は **WCAG 2.2 の監査**として体系的。後者は HTML/ARIA の局所修正で範囲が狭い |
| SEO / メタデータ | **どちらも見送り** | `seo`（addyosmani）/ `fixing-metadata`（ibelick） | UI/UX の依頼範囲外。必要になった時点で追加する |
| 総合監査 | 見送り | `web-quality-audit`（addyosmani） | 採用した 3 つ（a11y / CWV / perf）を束ねるだけのメタスキル |
| デザインシステムの正本 | **見送り** | `create-design-md`（ibelick）/ `design-system`・`ui-styling`（ui-ux-pro-max-skill） | 本リポジトリは **`@workspace/tokens` が single source of truth**（`.claude/rules/frontend.md`）。競合する「デザインの正本」を持ち込まない |
| デプロイ | 見送り | `deploy-to-vercel` / `vercel-cli-with-tokens` / `vercel-optimize` | 本リポジトリは `vercel-deploy` script + 自作 Skill が正規経路（`.claude/skills/vercel-deploy/`） |
| 文章レビュー | 見送り | `writing-guidelines`（vercel） | UI/UX の範囲外 |

その他の検索上位（`github/awesome-copilot@penpot-uiux-design`、`sickn33/agentic-awesome-skills`、
`lotosbin/claude-skills`、`saifyxpro/ui-ux-design-pro-skill` 等）は、**役割が上記の採用分と重複**し、
かつ提供元の実績・保守状況が確認できなかったため見送った。

---

## 3. `ui-ux-pro-max` の star 数についての注記

このリポジトリは **117k★ / 12.6k fork** と表示されるが、Skill リポジトリとしては桁が不自然に大きい。
`.claude/rules/minimal-implementation.md` §3.2 のとおり **star は購入可能（CMU/NC State/Socket が
約 600 万件の fake star を報告）で、単独の採用根拠にしてはならない**。

そのため star ではなく以下で採否を判断した:

- **MIT ライセンス**・archived でない・semantic-release で継続的にリリースされている
- **中身が検証可能**: 実体は CSV データセット（styles / colors / typography / ux-guidelines / charts …）と
  それを引く Python スクリプトで、**推論ではなく参照データを持っている**
- **同梱スクリプトを実地に監査した**（下記）

### 同梱スクリプトの監査結果

このスキルだけが実行スクリプトを持つ（他 12 スキルは Markdown のみ）。**エージェント権限で動くため**、
実行系・通信系の呼び出しを検査した:

```bash
find .agents/skills/ui-ux-pro-max -name "*.py" -not -path "*/tests/*" \
  -exec grep -nE "urllib|requests\.|socket\.|subprocess|os\.system|eval\(|exec\(" {} +
# → validate_data.py の `from urllib.parse import ...`（URL 文字列のパースのみ）1 件だけ
```

**ネットワーク通信・サブプロセス起動・動的評価は無し**（`subprocess` / 外部 URL の出現は
`scripts/tests/` 配下の自前テストのみ）。ローカル CSV を読むだけの構成であることを確認した。

---

## 4. 併せて実施した lock 管理の是正

調査中に、**`skills-lock.json` 管理外の実体ディレクトリが `.claude/skills/` に手置きされていた**
ことが判明した。lock 管理下のスキルは `.agents/skills/<name>` への**シンボリックリンク**だが、
手置きされたものは実体ディレクトリで、上流の改名に追随できない。

### 二重登録されていたもの（削除）

`expo/skills` が**旧名と新名の両方**で入っていた（同一スキルの重複）:

| 削除（lock 管理外・旧名） | 残した（lock 管理・新名） |
|---|---|
| `building-ui` (v1.0.0) | `building-native-ui` (v1.0.1) |
| `data-fetching` | `native-data-fetching` |
| `api-routes` | `expo-api-routes` |
| `cicd-workflows` | `expo-cicd-workflows` |
| `deployment` | `expo-deployment` |
| `dev-client` | `expo-dev-client` |
| `tailwind-setup` | `expo-tailwind-setup` |
| `Better Auth Best Practices` | `better-auth-best-practices` |

### lock 管理下へ移したもの

`ui-ux-pro-max` / `frontend-design` / `web-design-guidelines` / `vercel-react-best-practices` /
`vercel-composition-patterns` / `vercel-react-native-skills` は実体ディレクトリだったため、
削除してから `npx skills add` で入れ直した。

### 結果

- lock エントリ **80**、すべて `.claude/skills/` に存在（欠落なし）
- lock 管理外に残るのは **本リポジトリの自作スキル 39 件のみ**（意図どおり）

---

## 5. 運用ルール（`.claude/CLAUDE.md` に反映済み）

```bash
# 追加（必ずリポジトリルートで実行する）
npx skills add <owner>/<repo> -s <skill> -y      # -s は 1 つずつ。カンマ区切りは効かない

# lock からの復元 / 更新
npx skills experimental_install
npx skills update
```

- **`.claude/skills/` へディレクトリを手でコピーしない。** lock 管理外の実体ができ、
  上流の改名時に旧名と新名が二重に残る（今回の事故そのもの）。
- **`.claude/skills/` の中で `npx skills add` を実行しない。** そこが新しいプロジェクトルートと
  誤認され、入れ子の `.agents/` と `skills-lock.json` が作られる（今回実際に発生させ、撤去した）。
- 自作スキル（`.claude/skills/<name>/SKILL.md` を直接置くもの）は従来どおり lock 管理外。

---

## 参考

- [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills)
- [ibelick/ui-skills](https://github.com/ibelick/ui-skills)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [Six Million (Suspected) Fake Stars in GitHub (ICSE 2026)](https://arxiv.org/abs/2412.13459)
- `.claude/rules/minimal-implementation.md` / `.claude/rules/skills-first.md` / `.claude/rules/mobile-uiux.md`

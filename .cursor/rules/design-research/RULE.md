---
description: "Design-time research: verify primary sources before designing, and confirm any deviation from the design document with the user"
alwaysApply: true
globs: []
---
# 設計前調査 & 乖離の確認

**MANDATORY**: **設計を書き始める前に**、その設計で使うツール・API・パッケージ・サービスの
一次情報（公式ドキュメント / Context7 / 型定義）を**実際に読む**こと。
正本: `/.claude/rules/design-research.md`

## 手順

1. **該当 Skill を先に起動**（DB: `supabase-postgres-best-practices` / `rls` / `drizzle`、
   配置: `fsd` / `feature-sliced-design` / `monorepo`、UI: `ui-ux-pro-max` ほか）
2. **実際に入っているバージョンを確認**（`bun info` / `package.json` / `uv tree` / `deno.json`）
3. **そのバージョンの一次情報を読む**
   （Context7: `resolve-library-id` → `query-docs`。`get-library-docs` は存在しない。
   1 呼び出し 1 トピック・同一の問いに 3 回まで。Supabase は `search_docs`。無ければ WebFetch）
4. **型定義・スキーマを実物で確認**
5. 埋める項目: API シグネチャ / 設定ファイル形式 / 非推奨・破壊的変更 /
   **制限値・クォータ** / **料金体系** / **前提プラン・前提設定** / ライセンス / 鍵の扱い

## デザインパターン・DB 設計もベストプラクティスを調査してから

「一般論として知っているパターン」を調べずに当てはめるのは禁止。
DB は「テーブル定義」で終わらせず、**制約は DB 側 / `timestamptz` で UTC /
RLS はテーブルと同時に設計 / ポリシー列とソートキーに index / ページングの tiebreaker /
削除カスケード / テナント境界 / 監査・使用量の集計軸**まで決める
（集計軸は後から列を足しても過去行が埋まらない）。

## 乖離は勝手に解消しない（本ルールの中核）

| 類型 | 内容 |
|---|---|
| A | 設計書 × 一次情報（できない / 非推奨 / 制限超過） |
| B | 設計書 × ベストプラクティス |
| C | 設計書 × リポジトリのルール・既存の技術選定 |
| D | 実装 × 設計書（設計書に無い実装 / 設計書にあるのに無い実装） |

いずれも **「意図的な逸脱か、単なる記載ミスか」をユーザーに確認する**。
黙って設計書に合わせるのも、黙って自分の設計に差し替えるのも違反。

確認には **①該当箇所 ②事実 ③出典 URL とバージョン ④影響 ⑤選択肢と推奨** を必ず添える。
**後戻りできない論点**（DB スキーマ・集計軸・API 契約・認証方式・課金と単価・URL 設計・
テナント境界・Storage パス）とセキュリティ・審査要件は、**回答が来るまで着手しない**。

## 記録

- 調査結果: `docs/_research/YYYY-MM-DD-<topic>.md`
- 設計書・選定理由・出典: `docs/designs/`

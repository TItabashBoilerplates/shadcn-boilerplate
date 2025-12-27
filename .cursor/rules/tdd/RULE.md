---
description: "Test-Driven Development workflow requirements"
alwaysApply: true
globs: []
---
# Test-Driven Development

**MANDATORY**: すべての実装はTDDで進める。

## TDDワークフロー

1. **テストを先に書く** (Red)
2. **テスト実行 → 失敗確認**
3. **テストをコミット**
4. **実装を書く** (Green)
5. **リファクタリング** (必要に応じて)

## コマンド

| 操作 | コマンド |
|------|---------|
| Frontend | `make test-frontend` |
| Backend | `make test-backend-py` |
| All | `make test` |

## 禁止事項

- テストなしでの実装
- テストを通すためのテスト修正
- 失敗確認ステップのスキップ

## All Green Policy (MANDATORY)

**作業終了時は必ず全テスト通過を確認**

1. `make test` を実行
2. 失敗テストがあれば実装を修正
3. All Greenまで繰り返す

### 禁止

- 失敗テストを放置して終了
- `skip` / `xfail` で回避
- 失敗テストの削除


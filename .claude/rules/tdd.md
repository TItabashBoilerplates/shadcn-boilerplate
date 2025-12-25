# Test-Driven Development Policy

**MANDATORY**: All implementations MUST follow Test-Driven Development (TDD) methodology.

## TDD Workflow (REQUIRED)

Every implementation MUST follow this strict sequence:

1. **Write Tests First**
   - Define expected inputs and outputs
   - Write test cases BEFORE any implementation code
   - Focus on behavior, not implementation details

2. **Run Tests and Confirm Failure**
   - Execute tests to verify they fail (Red phase)
   - Confirm the test correctly captures the requirement
   - Commit tests at this stage

3. **Implement to Pass Tests**
   - Write minimal code to make tests pass (Green phase)
   - Do NOT modify tests during implementation
   - Continue until all tests pass

4. **Refactor if Needed**
   - Improve code quality while keeping tests green
   - Tests remain unchanged during refactoring

## Prohibited Practices

**NEVER**:
- Write implementation code before tests
- Modify tests to make them pass (fix implementation instead)
- Skip the failing test verification step
- Commit untested code
- Add features without corresponding tests

## Test Commands

| Operation | Command |
|-----------|---------|
| **Frontend Tests** | `make test-frontend` |
| **Backend Tests** | `make test-backend-py` |
| **All Tests** | `make test` |

## Commit Strategy

```
# ✅ Correct TDD commit sequence
1. feat(test): add tests for user authentication  # Red phase
2. feat: implement user authentication            # Green phase
3. refactor: clean up authentication code         # Refactor phase

# ❌ Wrong approach
1. feat: implement user authentication            # No tests first!
```

## Exceptions

TDD is NOT required for:
- Documentation files (README, CLAUDE.md, etc.)
- Configuration files (config.toml, .env, etc.)
- Static assets (images, fonts, etc.)
- Type definition files (when auto-generated)

## All Green Policy (MANDATORY)

**作業終了時は必ずすべてのテストが通過（All Green）していること。**

### 作業終了前チェックリスト

1. **全テスト実行**: `make test` を実行
2. **失敗テストの対応**:
   - 原因分析を実施
   - 実装の修正（テストは変更しない）
   - 再度テスト実行
3. **All Green確認**: すべてのテストがパスするまで繰り返す

### 失敗テストへの対応

| 状況 | 対応 |
|------|------|
| 実装バグ | 実装を修正 |
| テスト環境問題 | 環境を修正し再実行 |
| 既存テストの破壊 | リグレッションを修正 |
| フレーキーテスト | 根本原因を特定し安定化 |

### 禁止事項

**NEVER**:
- 失敗テストを放置して作業を終了
- テストをスキップ（`skip`/`xfail`）して回避
- 失敗テストを削除して対処
- 「後で直す」として先送り

## Enforcement

This TDD policy is **NON-NEGOTIABLE**. Implementations without prior test cases are considered incomplete and must be revised to include tests first.

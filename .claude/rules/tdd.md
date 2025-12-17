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

## Enforcement

This TDD policy is **NON-NEGOTIABLE**. Implementations without prior test cases are considered incomplete and must be revised to include tests first.

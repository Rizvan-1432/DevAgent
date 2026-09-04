# Testing Guide

## Pyramid

| Layer | Когда | Tools (pick from project) |
|-------|-------|---------------------------|
| Unit | Pure logic, utils, hooks | vitest, jest, pytest |
| Integration | API, DB, service layer | supertest, testcontainers |
| E2E | Critical user flows | playwright, cypress, detox |

## Minimum per change

| Change type | Required tests |
|-------------|----------------|
| Util/function | Unit: happy + 1 edge + 1 error |
| API endpoint | Integration: 200, 400, 401/403 |
| UI component | Render + interaction (if logic) |
| Bug fix | Regression test that failed before fix |
| Auth/payment/signup | E2E or full integration path |

## Structure

```typescript
describe('createUser', () => {
  it('creates user with valid input', async () => { /* ... */ });
  it('rejects duplicate email', async () => { /* ... */ });
  it('returns 400 for invalid email', async () => { /* ... */ });
});
```

## Mocks

- Mock **boundaries** (HTTP, DB, clock), not internals
- Prefer fake implementations over heavy mocks
- Reset mocks between tests

## Fixtures

- Factory functions: `createUser(overrides?)`
- Shared setup in `beforeEach`, not shared mutable state

## Anti-patterns

- Testing implementation (private methods, call order)
- Snapshot everything
- Flaky: real timers, network without mock, `Date.now()` without freeze

## Commands

Определи из `package.json` / `pyproject.toml` и запускай перед ответом:

```bash
npm test
npm test -- --run path/to.test.ts
pytest tests/test_module.py -v
```

Все тесты по изменённой области должны быть зелёными.

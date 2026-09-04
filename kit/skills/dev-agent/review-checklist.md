# Review Checklist

Self-review и PR review. Каждый пункт: pass / fail + fix if fail.

## Correctness

- [ ] Логика соответствует ТЗ
- [ ] Edge cases: null, empty, boundary values
- [ ] Error paths handled, не silent fail
- [ ] Idempotency для retry-safe операций

## Security

- [ ] Input validation на границе (API, forms)
- [ ] SQL: parameterized queries only
- [ ] XSS: escape/sanitize user content in HTML
- [ ] AuthZ: пользователь может только свои ресурсы
- [ ] Secrets не в коде, не в логах
- [ ] CSRF/CORS настроены (если web)
- [ ] Dependencies: нет известных critical CVE (если меняли lockfile)

## Performance

- [ ] N+1 queries (ORM loops)
- [ ] Unbounded lists без pagination
- [ ] Тяжёлые вычисления в render без memo
- [ ] Large assets без lazy load
- [ ] Memory: listeners/timers/subscriptions cleaned up

## Concurrency

- [ ] Race conditions (async state updates)
- [ ] Double submit на формах
- [ ] Stale closure в effects/callbacks

## Maintainability

- [ ] Имена отражают intent
- [ ] Нет дублирования (DRY где уместно)
- [ ] Diff минимален для задачи
- [ ] Типы точные, не `any`

## Tests

- [ ] Новая логика покрыта
- [ ] Тесты assert behavior, не implementation details
- [ ] Нет flaky patterns (timers without fake, random without seed)

## Output format

```markdown
### 🔴 Critical
- `src/api/users.ts:42` — SQL built from user input → use parameterized query

### 🟡 Suggestion  
- `Button.tsx` — extract repeated loading spinner

### 🟢 Nice to have
- Add aria-label to icon-only button
```

В self-review mode: исправь все 🔴 до ответа пользователю.

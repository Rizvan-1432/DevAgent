# QA Patrol — автоматическое тестирование

Запускай **без запроса пользователя** при: открытии сессии, завершении задачи агента, pre-commit.

## Автоматический цикл

```
Scan → Test → Security → Fix critical → Report (кратко)
```

## 1. Smoke scan (быстро)
- [ ] `npm test` — все тесты зелёные
- [ ] Нет unhandled promise rejections в изменённых файлах
- [ ] TypeScript: нет новых `any` в изменённых файлах

## 2. Regression по критичным flow
При изменениях в auth/recipes/sync — прогнать связанные тесты:

| Область | Путь | Тест |
|---------|------|------|
| Auth | `app/(auth)/`, `store/auth*` | auth tests |
| Recipes | `app/create-recipe`, `app/recipe/` | recipe tests |
| Sync | `services/`, socket | sync tests |

## 3. Manual QA matrix (агент симулирует по коду)

| Сценарий | Проверить |
|----------|-----------|
| Login | valid/invalid/empty/network error |
| Register | duplicate email, weak password |
| Create recipe | required fields, image upload |
| Offline | NetInfo fallback, queue/retry |
| Deep link | invalid id → 404 screen |

## 4. Server QA (если менялся Server/)
- [ ] Auth middleware на protected routes
- [ ] Validation на POST/PUT/PATCH
- [ ] 401/403/404/500 consistent shape

## 5. Команды

```bash
# Root mobile
npm test -- --passWithNoTests

# Security audit (warn only on moderate)
npm audit --audit-level=high || true

# Full patrol script
npm run qa:patrol
```

## 6. Авто-фикс policy

| Severity | Действие |
|----------|----------|
| Failing test | Fix immediately |
| Security critical | Fix immediately |
| Security warning | Fix if trivial, else note in report |
| UX/a11y minor | Fix if in touched files |

## 7. Report (только если нашёл проблемы или patrol по запросу)

```markdown
## QA Patrol
- Tests: X passed / Y failed → fixed Z
- Security: N issues → fixed M
- Осталось: ...
```

Если всё чисто после фонового patrol — **не отвлекай пользователя**, только `PATROL_OK` внутренне.

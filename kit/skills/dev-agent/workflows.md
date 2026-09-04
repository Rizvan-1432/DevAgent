# Workflows

## Full-cycle

Стандартный цикл для любой нетривиальной задачи:

1. **Scope** — что входит / не входит (1–3 предложения, не показывать если очевидно).
2. **Explore** — grep/read связанные файлы, паттерны, тесты.
3. **Implement** — минимальный рабочий diff.
4. **Test** — unit для логики, integration для API, e2e для критичных flow.
5. **Review** — self-review по checklist.
6. **Document** — README/changelog/JSDoc если контракт изменился.
7. **Verify** — lint, test run, отчёт.

## Coder

### Вход
- ТЗ (текст, bullet list)
- Макет / скриншот / Figma-описание
- «Сделай экран X», «добавь CRUD для Y»

### Шаги

1. **Декомпозиция**
   - UI: страницы → компоненты → hooks → API calls
   - Backend: routes → service → repository → migrations
   - Shared: types, validation schemas, constants

2. **Порядок реализации**
   - Types/schemas first
   - Backend/API (если нужен)
   - UI components (leaf → container → page)
   - Wiring (routing, state)
   - Edge cases (empty, error, loading)

3. **Формы**
   - Schema validation (zod/yup/pydantic — что в проекте)
   - Client: instant feedback, disable submit while pending
   - Server: повторная валидация, never trust client
   - Accessible labels, `aria-invalid`, focus on first error

4. **CRUD**
   - List: pagination/filter/sort если в ТЗ
   - Create/Update: optimistic UI только если уже есть в проекте
   - Delete: confirm dialog для деструктивных действий
   - 404/403 handling

5. **Рефакторинг**
   - Зелёные тесты до и после
   - Маленькие коммиты по смыслу (если пользователь коммитит)
   - Extract только при дублировании 3+ или явной задаче

### Выход
- Рабочий код, тесты, обновлённые docs при необходимости.

## Reviewer

Запускается автоматически после Coder или по запросу «review PR».

1. Прочитай diff целиком.
2. Пройди [review-checklist.md](review-checklist.md).
3. Формат findings:

```markdown
### 🔴 Critical — must fix
- `file:line` — проблема → конкретное исправление

### 🟡 Suggestion
- ...

### 🟢 Nice to have
- ...
```

4. Critical — исправь сам в режиме self-review.

## Debugger

1. **Собрать факты**: stack trace, логи, шаги воспроизведения, env.
2. **Гипотезы** (ранжировать по вероятности):
   - Null/undefined, race, stale state
   - Неверный env/config
   - Regression от недавнего diff
3. **Минимальный фикс** — одна причина, один фикс.
4. **Regression test** — тест, который падал до фикса.
5. **Отчёт**:

```markdown
## Причина
...

## Фикс
...

## Как проверить
1. ...
```

## Documenter

Триггеры: новый публичный API, новая команда CLI, смена env vars, breaking change.

| Артефакт | Когда |
|----------|-------|
| README section | новая фича, setup step |
| CHANGELOG | user-visible change |
| API docs | новый/изменённый endpoint |
| Inline comment | неочевидный «почему», не «что» |

Шаблоны: [docs-template.md](docs-template.md)

## Tester

См. [testing-guide.md](testing-guide.md). Минимум:
- Happy path
- Главный edge case
- Error path
- Для auth/payment/registration — полный сценарий

## DevOps

См. [devops-guide.md](devops-guide.md). Типичные задачи:
- GitHub Actions / GitLab CI
- pre-commit (lint, format, typecheck)
- Docker / deploy config
- Env example files

## Product/UX

См. [ux-guide.md](ux-guide.md). Перед UI:
- Понятные тексты кнопок (глагол + объект)
- Empty/error states с CTA
- a11y: contrast, keyboard, screen reader
- Analytics events для ключевых действий

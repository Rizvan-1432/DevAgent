# Debug Playbook

## 1. Triage

| Input | Action |
|-------|--------|
| Stack trace | Найди top frame в своём коде (не node_modules) |
| Failing test | Прочитай assertion, запусти один тест с verbose |
| Prod error | Сопоставь версию, env, recent deploys |
| «Не работает» | Уточни один факт только если нет логов/тестов |

## 2. Reproduce

1. Минимальные шаги воспроизведения
2. Локально: same branch, same env vars from `.env.example`
3. Зафиксируй expected vs actual

## 3. Hypothesis ladder

Проверяй сверху вниз:

1. **Config** — wrong env, missing var, wrong URL
2. **Data** — null, wrong type, stale cache
3. **Timing** — race, missing await, unmounted component setState
4. **Logic** — off-by-one, wrong operator, inverted condition
5. **Integration** — API contract changed, CORS, auth token expired
6. **Regression** — `git log -p` на затронутые файлы

## 4. Isolate

- Binary search: comment half, retest
- Add temporary log at boundary (remove before finish)
- Run single test / single route

## 5. Fix rules

- Один root cause → один фикс
- Не маскируй симптом (пустой catch, `as any`)
- Добавь regression test

## 6. Verify

```bash
# adapt to project
npm test -- path/to.test.ts
npm run lint
npm run build
```

## Report template

```markdown
## Причина
Кратко: что сломалось и почему.

## Фикс
Что изменено и в каких файлах.

## Как проверить
1. ...
2. ...

## Предотвращение
- regression test: `path/to.test.ts`
```

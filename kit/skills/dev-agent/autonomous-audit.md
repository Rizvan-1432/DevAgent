# Autonomous Audit — любой проект

Запускай сам. **Не привязан к ChefBook** — исследуй открытый репозиторий.

## Триггеры

- «проверь», «работай», любое короткое сообщение
- PROACTIVE_PATROL / AUTONOMOUS_AUDIT hooks
- Новая сессия без конкретной задачи

## Фаза 0 — Определи проект

1. Прочитай `project.config.md` если есть
2. Иначе: package.json / pyproject.toml / go.mod / README
3. Найди: src/, app/, lib/, server/, backend/, tests/

## Фаза 1 — Скрипты

```bash
# Prefer project script, else global
npm run qa:patrol 2>/dev/null || bash ~/.cursor/scripts/qa-patrol.sh
```

Или: `npm test` / `pytest` / `go test ./...` по стеку.

## Фаза 2 — Скан (адаптируй пути)

| Область | Где искать | Что искать |
|---------|------------|------------|
| Entry | app/, src/, main.* | boot errors |
| Auth | *auth*, login, middleware | leaks, race |
| API | server/, api/, routes/ | validation, SQLi |
| UI | components/, pages/ | null crash, states |
| State | store/, hooks/, context/ | stale, leaks |
| Tests | __tests__/, tests/, *_test.go | gaps |

Паттерны: useEffect без cleanup, unhandled promise, secrets в коде, N+1.

## Фаза 3 — Fix critical

## Фаза 4 — Отчёт простым русским

Если чисто: «Проверил проект — серьёзных проблем не нашёл.» + `PATROL_OK`

# Dev Agent

Desktop-приложение на Electron + Cursor SDK: проверка проектов, SEO, безопасность, GitHub push и деплой на Vercel.

Автор: Бакаев Ризван Русланович

## Возможности

- Проверка сайтов и приложений (баги, QA, безопасность)
- SEO и контент
- Автоматический commit/push на GitHub
- Деплой на Vercel
- Ввод API-ключей прямо в интерфейсе

## Запуск

```bash
npm install
cp .env.example .env
# Вставьте CURSOR_API_KEY в .env или в интерфейсе приложения
npm start
```

## Сборка macOS

```bash
npm run build
```

Готовый `.dmg` появится в `dist/`.

## Переменные окружения

Скопируйте `.env.example` → `.env`:

| Переменная | Назначение |
|---|---|
| `CURSOR_API_KEY` | Ключ Cursor (обязательно) |
| `GITHUB_TOKEN` | Push в GitHub (опционально) |
| `VERCEL_TOKEN` | Деплой на Vercel (опционально) |

Ключи также можно сохранить в UI: блок **API-ключи**.

## Структура

```
electron/   # main process, SDK, git, env
ui/         # интерфейс
scripts/    # postinstall (fix rg)
build/      # иконка
```

## Лицензия

Private / учебный проект.

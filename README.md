# Dev Agent

Desktop-приложение на Electron + Cursor SDK: проверка проектов, SEO, безопасность, GitHub push и деплой на Vercel.

Автор: Бакаев Ризван Русланович

## Возможности

- Проверка сайтов и приложений (баги, QA, безопасность)
- SEO и контент
- Автоматический commit/push на GitHub
- Деплой на Vercel
- Ввод API-ключей прямо в интерфейсе
- Онбординг при первом запуске
- Кнопка «Проверить ключ» (проверка Cursor API)
- Проверка обновлений через GitHub Releases

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


## Что нового в 2.3

- Шаблоны задач и фриланс-режимы (ТЗ / письмо / смета)
- HTML-отчёт с печатью в PDF
- Очередь нескольких проектов
- Сравнение с прошлой проверкой
- Светлая тема и крупный шрифт
- Чеклист релиза и проверка форм
- Русские подсказки ошибок + маскирование секретов в логах
- Сборка Windows/Linux: `npm run build:win` / `npm run build:linux`
- Тесты: `npm test`

### Подпись macOS (Apple Developer)

Без платного Apple Developer ID Gatekeeper пишет «не удалось проверить разработчика».
Обход: ПКМ → Открыть. Для полноценной подписи нужен сертификат Developer ID Application.

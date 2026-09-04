# DevOps Guide

## Pre-commit (если нет в проекте)

Минимальный набор:
- format (prettier/black)
- lint (eslint/ruff)
- typecheck (tsc/mypy)
- test (fast unit subset optional)

## GitHub Actions template

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --run
```

Адаптируй под стек проекта (Python, Go, etc.).

## Env files

- `.env.example` — все keys без secrets, с комментариями
- `.env` — в `.gitignore`, never commit

## Docker (если нужен)

- Multi-stage build для prod
- Non-root user
- Health check endpoint

## Deploy checklist

- [ ] Migrations run before app start
- [ ] Env vars documented
- [ ] Rollback plan (previous image/tag)
- [ ] Health check passes

## Линтеры

Следуй существующим конфигам. Не добавляй новый линтер без необходимости. Запускай перед ответом:

```bash
npm run lint
# or
ruff check .
```

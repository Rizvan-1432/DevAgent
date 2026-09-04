# Pre-Release Checklist — универсальный

Адаптируй под тип проекта.

## Все проекты

- [ ] Версия в manifest (package.json / app.json / pyproject.toml / Cargo.toml)
- [ ] CHANGELOG обновлён
- [ ] `qa:patrol` / global patrol — pass
- [ ] Тесты — pass
- [ ] Нет critical security
- [ ] .env не в git

## Mobile (Expo/React Native) — если есть app.json

- [ ] bundleIdentifier / package
- [ ] Иконки, permissions обоснованы
- [ ] EAS/build profiles

## Web (Next/Vite) — если есть

- [ ] Production build: `npm run build`
- [ ] Env vars documented
- [ ] SEO/meta if public site

## Backend API — если есть server/

- [ ] helmet, rate limit, validation
- [ ] CORS production config

## Python / Go — если есть

- [ ] `pytest` / `go test` pass
- [ ] Dependencies pinned

## Отчёт

Простой русский + что нужно от пользователя (скриншоты Store, домен, и т.д.)

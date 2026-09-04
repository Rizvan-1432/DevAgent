# Security Checklist — OWASP & Anti-Phishing

Проходи **автоматически** при каждом proactive patrol и после любых изменений auth/API/форм.

## Auth & Sessions
- [ ] JWT: короткий TTL, refresh rotation, secret не в коде
- [ ] Пароли: bcrypt/argon2, never plain text
- [ ] Brute-force: rate limiting на login/register
- [ ] Logout инвалидирует токен (если применимо)
- [ ] Secure storage на клиенте: expo-secure-store, не AsyncStorage для токенов

## Injection
- [ ] SQL: parameterized queries only (better-sqlite3 `.prepare()`)
- [ ] NoSQL/command injection в shell exec
- [ ] XSS: sanitize HTML (DOMPurify), escape в WebView
- [ ] Path traversal в file upload/download

## API (Server/)
- [ ] helmet() включён
- [ ] cors — whitelist origins, не `*` в production
- [ ] express-rate-limit на auth и public endpoints
- [ ] express-validator на всех inputs
- [ ] File upload: type/size limits, scan filename
- [ ] Error responses не раскрывают stack/internal paths в production

## Client (React Native)
- [ ] Deep links: validate scheme/host, no open redirect
- [ ] WebView: только trusted URLs, `originWhitelist`
- [ ] Нет `eval`, `dangerouslySetInnerHTML` без sanitize
- [ ] Sensitive data не в logs/console

## Secrets & Config
- [ ] `.env` в `.gitignore`
- [ ] Grep: API_KEY, password, secret, private_key в tracked files
- [ ] AWS/JWT keys только из env

## Phishing & Social Engineering (UI)
- [ ] Нет имитации системных диалогов
- [ ] External links — confirm или in-app browser
- [ ] Email templates: no credential harvesting patterns
- [ ] Login forms только на official routes

## Dependencies
- [ ] `npm audit` — critical/high исправить или задокументировать
- [ ] Lockfile не удалять без причины

## Output format (patrol)

```markdown
## Security Patrol
### 🔴 Critical (auto-fix)
- ...

### 🟡 Warning
- ...

### ✅ Passed
- ...
```

Critical — исправляй сразу без запроса пользователя.

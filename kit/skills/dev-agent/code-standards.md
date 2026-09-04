# Code Standards

Применяй стандарты **проекта** в приоритете. Если `project.config.md` задан — следуй ему. Ниже — fallback.

## General

- **Production-ready** — код для реальных пользователей
- **Edge cases** — null, offline, invalid input, race conditions
- **Performance-first** — без лишних re-renders, N+1, блокировки UI
- Маленькие функции, один уровень абстрации
- **DRY** — extract при повторении 2+
- **Early return** — вместо глубокой вложенности
- Константы вместо magic numbers/strings
- Имена: `verbNoun` для функций, `PascalCase` компоненты, `kebab-case` файлы (если так в проекте)
- Без мёртвого кода и закомментированных блоков
- Errors: typed/labeled, try/catch на async, понятные сообщения пользователю

## TypeScript / JavaScript

```typescript
// ❌ any без причины
function parse(data: any) {}

// ✅ typed + narrow
function parse(data: unknown): User {
  const result = userSchema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error);
  return result.data;
}
```

- Prefer `const`, early return
- Async: always handle rejection
- No `console.log` in production paths — use project logger

## React / React Native

- Functional components + hooks
- Colocate: component + styles + tests рядом (если так в проекте)
- Keys в списках — stable id, не index
- `useEffect` только для sync с внешним миром

### React Native (Expo)

- `StyleSheet.create` или project pattern — не inline styles для сложных экранов
- Safe areas: `react-native-safe-area-context`
- Lists: `FlatList` / `FlashList` с `keyExtractor`
- Images: `expo-image` если в проекте
- Navigation: expo-router file conventions
- Platform-specific: `Platform.OS` или `.ios.tsx` / `.android.tsx`
- Touch targets ≥ 44pt
- **Skeleton loaders** при загрузке данных
- **expo-image** lazy/cache для изображений
- **a11y**: `accessibilityLabel`, readable contrast

## API / Backend

- Validate + sanitize input at boundary (express-validator, zod)
- Parameterized queries — never string concat SQL
- bcrypt passwords, JWT auth, refresh where applicable
- helmet, CORS whitelist, rate limiting
- JOIN/батч вместо N+1 запросов
- Consistent error shape: `{ error: { code, message } }`

## Git / commits (если пользователь просит)

```
type(scope): short imperative summary

feat | fix | refactor | test | docs | chore
```

## File structure (fallback)

```
src/
  components/   # shared UI
  features/     # feature modules
  lib/          # utils, clients
  hooks/
  types/
tests/          # or __tests__ colocated
```

Адаптируй под существующую структуру репозитория.

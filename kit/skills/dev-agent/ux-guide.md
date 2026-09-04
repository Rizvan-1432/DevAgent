# UX Guide

## Copy

| ❌ Avoid | ✅ Prefer |
|----------|-----------|
| Submit | Save changes |
| Error | Couldn't save — try again |
| Click here | View invoice |
| OK | Got it |

- Кнопки: глагол + объект
- Ошибки: что случилось + что делать
- Пустые состояния: объяснение + CTA

## States (каждый экран с данными)

- **Loading** — skeleton или spinner, не пустой экран
- **Empty** — иллюстрация/текст + действие («Create first project»)
- **Error** — сообщение + retry
- **Success** — toast или inline confirmation

## Forms

- Labels всегда видимы (не только placeholder)
- Inline validation после blur или submit
- Disable submit + loading indicator during request
- Focus first invalid field on error

## Accessibility (a11y)

- Semantic HTML (`button`, `nav`, `main`)
- `alt` на meaningful images
- Icon-only buttons: `aria-label`
- Focus visible, keyboard navigation works
- Color contrast WCAG AA minimum
- Don't rely on color alone for status

## Analytics events (если в проекте есть трекинг)

| Event | When |
|-------|------|
| `signup_started` | Form opened |
| `signup_completed` | Account created |
| `checkout_started` | Payment flow entered |
| `purchase_completed` | Payment success |

Naming: `object_action` snake_case. Properties: ids, not PII.

## Screen flow checklist

- [ ] Back navigation понятна
- [ ] Destructive actions — confirm
- [ ] Mobile: touch targets ≥ 44px
- [ ] Critical path ≤ 3 taps/clicks where possible

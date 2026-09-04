# Documentation Templates

## README section (new feature)

```markdown
## [Feature Name]

Brief one-line description.

### Setup
Any new env vars or config steps.

### Usage
How to use from user/dev perspective.

### API (if applicable)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/items | Create item |
```

## CHANGELOG entry

```markdown
## [Unreleased]

### Added
- User profile editing with avatar upload (#123)

### Changed
- Login form now validates email format client-side

### Fixed
- Race condition on double form submit
```

## API endpoint doc

```markdown
### POST /api/v1/resources

Create a resource.

**Auth:** Bearer token required

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Display name |

**Responses:**
- `201` — created, returns resource object
- `400` — validation error
- `401` — unauthorized
```

## Inline comment (when needed)

```typescript
// Retry with backoff because the payment provider returns 503 during deploy windows.
```

Only for non-obvious **why**. Code shows **what**.

## JSDoc / docstring (public API)

```typescript
/**
 * Resolves user permissions from role + overrides.
 * @throws {AuthError} if user is suspended
 */
export function resolvePermissions(user: User): Permission[] {}
```

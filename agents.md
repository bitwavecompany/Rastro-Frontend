# AI Agent Instructions (Rastro Frontend)

This file contains immutable rules to ensure that AI assistance in this repository remains consistent, free of architectural errors, and aligned with the system's canonical data contract.

---

## 0. Required Reference Documents

Before starting any task, load and follow these documents in priority order:

| Priority | Document | Contents |
|---|---|---|
| 1 | `_context/prd.md` | Product rules — absolute source of truth |
| 2 | `_context/business-rules.md` | Detailed rules per entity and flow |
| 3 | `_context/data-model-frontend.md` | TypeScript interfaces, Dexie schema, and canonical fields |
| 4 | `_context/backlog.md` | Features out of MVP scope — do not implement |

No code suggestion may contradict what these documents establish. In case of conflict between them, the priority order in the table is the tiebreaker.

---

## 1. Stack and Mandatory Conventions

- **Vue 3** with Composition API and `<script setup>`. Options API is forbidden.
- **TypeScript** in strict mode. Every Dexie schema, API payload, and Pinia state must be typed using the interfaces in `src/types/`.
- **Tailwind CSS** for styling. No CSS-in-JS or arbitrary inline styles.
- **Pinia** for global state in `src/stores/`. One store per domain (`useAccountsStore`, `useTransactionsStore`, `useProfileStore`).
- **Dexie.js** for local persistence in `src/database/db.ts`. Canonical schema at v7.
- **Iconify** with `@iconify-json/lucide` bundled locally. Referencing icons from a remote CDN at runtime is forbidden.

---

## 2. Canonical Naming (Strict snake_case)

All fields in TypeScript interfaces, API payloads, Dexie schemas, and Pinia state use `snake_case` consistently. Introducing camelCase variants, synonyms, or abbreviations is forbidden.

Fields that have had historical names and **must no longer be used**:

| Correct field | Forbidden legacy name |
|---|---|
| `type` (in `Transaction`) | `kind` |
| `payment_method` | `paymentType` |
| `deletion_reason` | `deleteReason` |
| `initial_balance` | `amount` (as an account field in Dexie) |
| `name` (in `Profile`) | `alias` |
| `sync_status` | `syncStatus` |
| `account_id` | `accountId` |

The `Profile` interface has a single name field: `name: string`. The `alias?` field was removed and must not be reintroduced.

The `date` field in `Transaction` is a required `string` (not optional). Always send it in `YYYY-MM-DD` format.

---

## 3. Offline-First Architecture

### Core Rule
**All writes go to Dexie first — never directly to the API.** The flow is:

```
User → Dexie (immediate write) → Outbox (queues the operation) → SyncEngine (sends when online)
```

### Outbox and SyncEngine
- Pending operations are persisted in Dexie's `outbox` table with `sync_status: 'pending_create' | 'pending_update' | 'pending_delete'`.
- The `SyncEngine` (`src/sync/SyncEngine.ts`) processes them in FIFO order, sending batches to `POST /api/sync/push`.
- Operations rejected by the server (HTTP 422, 403) go to Dexie's `dlq` table and are surfaced to the user in the error tray.
- Never wipe the local database upon receiving a session error (`SESSION_REVOKED_REMOTE`). Only suspend synchronization and preserve the Outbox.

### ApiPayloadAdapter
- The adapter `src/sync/adapters/ApiPayloadAdapter.ts` is the only layer that transforms local data into API payloads.
- It strips local-only fields (`sync_status`) before sending.
- It normalizes `date` to strict `YYYY-MM-DD` if it comes with a time component.
- **No field duplication:** in `accounts/create`, send only `initial_balance` — never `amount` alongside `initial_balance`.

### Canonical Outbox Values
- `op` field: always `lowercase` — `'create' | 'update' | 'delete' | 'restore' | 'hard-delete' | 'purge-account' | 'relocate'`
- `entity` field: always plural — `'accounts' | 'transactions' | 'profile'`
- The entity ID always travels inside `payload` — never as a separate field in `SyncBatchOperation`.

---

## 4. Code Organization

### Composables (`src/composables/`)
Form and business logic is extracted into composables, not embedded in `.vue` components. When adding a new form, create the corresponding composable following the pattern of `useAccountForm()` and `useMovementForm()`.

### Services (`src/services/`)
Authentication flows, data merging, and registration are handled in dedicated services (`authMergeService.ts`). Do not duplicate this logic in stores or components.

### Stores (`src/stores/`)
Stores are the single source of truth for the app's reactive state. Components read from the store and dispatch actions — they do not read directly from Dexie or make API calls.

### Types (`src/types/`)
Canonical interfaces (`Account`, `Transaction`, `Profile`, `OutboxEntry`, etc.) live in `src/types/`. Never define inline types in components or stores if the interface already exists.

---

## 5. UI and Mobile Rules

- **Progressive disclosure:** Use modals and bottom sheets to avoid cluttering the screen. Do not display secondary information in the main view.
- **No runtime network dependencies for assets:** Icons, fonts, and visual resources must be bundled. The app must render correctly offline.
- **Production obfuscation:** The production build (`npm run build`) applies `rollup-plugin-obfuscator`. Do not use `Function.name` or constructor names that rely on not being minified.

---

## 6. ESLint and Code Quality

The project has a strict ESLint configuration. All generated code must pass with no errors or warnings:

```bash
npm run lint
```

Verify types before committing:

```bash
npm run typecheck
```

---

## 7. Verification Checklist (run before closing any task)

```bash
# 1. Type checking
npm run typecheck

# 2. Linter
npm run lint

# 3. Production build (verifies it compiles without errors)
npm run build
```

All three must pass without errors before a task is considered complete.

---

## 8. What NOT to Do

- Do not create individual mutation endpoints — all writes go through the Outbox.
- Do not read from or write to the API directly from components or stores — only through the SyncEngine or auth services.
- Do not introduce fields with legacy names (`alias`, `kind`, `paymentType`, `deleteReason`, `syncStatus`, `accountId`).
- Do not make `date` optional in `Transaction` — it is required and always in `YYYY-MM-DD`.
- Do not use icons from a remote CDN.
- Do not implement features listed in `_context/backlog.md`.
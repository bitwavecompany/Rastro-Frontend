<div align="center">
  <h1>👣 Rastro</h1>
  <p><b>Offline-First personal finance and expense tracking app</b></p>

  ![Vue.js](https://img.shields.io/badge/vue-%2335495e.svg?style=for-the-badge&logo=vuedotjs&logoColor=%234FC08D)
  ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![Capacitor](https://img.shields.io/badge/capacitor-%23119EFF.svg?style=for-the-badge&logo=capacitor&logoColor=white)
  ![Dexie.js](https://img.shields.io/badge/dexie.js-%23FFB400.svg?style=for-the-badge&logo=javascript&logoColor=white)
  ![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
</div>

---

## About

**Rastro** (Spanish for "trail" or "track") is a personal finance application built around a true **Offline-First** paradigm. All data is written to the device's local IndexedDB first, via Dexie.js. When connectivity is available, the app silently syncs with the cloud in the background using the Outbox pattern — with no interruption to the user experience.

The app is fully functional at all times, regardless of network status.

---

## Key Features

- **True Offline-First:** All reads and writes go to local IndexedDB. Background sync kicks in automatically when a connection is detected.
- **Multi-account:** Cash and Bank account types with real-time balance calculation.
- **Transactions:** Create, edit, soft-delete, and relocate income and expense entries across accounts.
- **User plans:** Guest (no registration), Free, and Premium tiers with distinct entitlements.
- **Outbox + Dead Letter Queue:** Offline operations are queued and sent in batches. Rejected operations surface in a visible DLQ for the user to review and retry.
- **Cross-platform:** Responsive web app + native Android via Capacitor.
- **Production obfuscation:** The production bundle runs through `rollup-plugin-obfuscator` before native compilation to protect business logic.
- **Bundled icons:** Iconify with `@iconify-json/lucide` packaged locally — no CDN dependency at runtime.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v3 |
| State management | Pinia v4 |
| Local database | Dexie.js v4 (IndexedDB) |
| HTTP client | Axios v1 |
| Server state | TanStack Query v5 (`@tanstack/vue-query`) |
| Schema validation | Zod v4 |
| Date handling | Day.js |
| UUID generation | uuidv7 |
| Build tool | Vite v8 + `vue-tsc` |
| Mobile runtime | Capacitor v8 (Android) |
| Icons | Iconify + `@iconify-json/lucide` (offline) |
| Obfuscation | `rollup-plugin-obfuscator` (production only) |
| Web deploy | Vercel (branch: `main`) |

---

## Project Documentation

Read in this order before touching the code:

| File | Contents |
|---|---|
| `_context/prd.md` | Product source of truth — plans, features, MVP scope |
| `_context/business-rules.md` | Detailed business rules per entity and flow |
| `_context/data-model-frontend.md` | TypeScript interfaces, Dexie schema, canonical fields |
| `_context/backlog.md` | Features explicitly out of scope for the MVP |

---

## Local Development

### Requirements

- Node.js v18 or higher
- npm

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/bitwavecompany/Rastro-Frontend.git
cd rastro-frontend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and set VITE_API_URL to your local backend URL

# 4. Start the development server
npm run dev
```

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Type-check and build the production bundle with obfuscation (`dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript type checking without emitting files |
| `npm run lint` | Run ESLint across the entire project |
| `npm run graph` | Rebuild the component dependency graph |

---

## Environment Variables

The project requires a single environment variable:

```bash
# Base URL of the backend API — no trailing slash
VITE_API_URL=http://localhost/api
```

In production (Vercel), this variable points to the backend URL on Render and is configured in the Vercel project dashboard.

---

## Android Development (Capacitor)

Requires Android Studio installed and properly configured.

```bash
# 1. Build the web bundle
npm run build

# 2. Sync the build into the Android project
npx cap sync android

# 3. Open Android Studio to run the emulator or build a release APK/AAB
npx cap open android
```

> If you update source images in the `assets/` directory, regenerate native icons and splash screens before syncing:
> ```bash
> npx capacitor-assets generate --android
> ```

---

## Project Structure

```
├── _context/                  # System documentation (PRD, business rules, data model, backlog)
├── android/                   # Native Android project generated by Capacitor
├── assets/                    # Source images for native icons and splash screens
├── public/                    # Static branding assets (logos, logotypes)
├── src/
│   ├── api/                   # Axios instances and API call modules
│   │   ├── accounts.ts
│   │   ├── admin.ts
│   │   ├── auth.ts
│   │   ├── axios.ts           # Base instance with token interceptors
│   │   ├── sync.ts
│   │   └── transactions.ts
│   ├── components/
│   │   ├── accounts/          # AccountCard, AccountFormFields
│   │   ├── admin/             # Admin panel components
│   │   ├── layout/            # AppLayout (main navigation shell)
│   │   ├── modals/            # DowngradeAccountsModal, SessionRevokedModal, GuestUpgradePromptModal
│   │   ├── profile/           # ProfileDeleteAccountModal, ProfilePremiumModal
│   │   ├── sync/              # DeadLetterQueueModal
│   │   ├── transactions/      # MovementDetailModal, TransactionForm, RelocateMovementModal, etc.
│   │   └── ui/                # Base reusable components (AppModal, AppToast, AppAmountInput...)
│   ├── composables/           # Composition API hooks (business logic and form handling)
│   │   ├── useAccountDetail.ts
│   │   ├── useAccountForm.ts
│   │   ├── useAdminDashboard.ts
│   │   ├── useDashboard.ts
│   │   ├── useDeleteConfirm.ts
│   │   ├── useMovementForm.ts
│   │   └── useUserProfileQuery.ts
│   ├── constants/             # Domain constants (accounts, transactions)
│   ├── database/
│   │   └── db.ts              # Dexie.js v7 schema and local migrations
│   ├── plugins/
│   │   └── vueQuery.ts        # TanStack Query configuration
│   ├── router/
│   │   └── index.ts           # Routes and navigation guards
│   ├── services/
│   │   ├── authMergeService.ts  # Login, registration, and local data merge flows
│   │   └── tokenStorage.ts      # Token persistence and retrieval
│   ├── stores/                # Global state with Pinia (one store per domain)
│   │   ├── useAccountsStore.ts
│   │   ├── useEntitlementsStore.ts
│   │   ├── useProfileStore.ts
│   │   ├── useSessionStore.ts
│   │   ├── useToastStore.ts
│   │   └── useTransactionsStore.ts
│   ├── sync/                  # Offline-First sync engine
│   │   ├── adapters/
│   │   │   └── ApiPayloadAdapter.ts  # Transforms local data into API payloads
│   │   ├── SyncEngine.ts      # Processes the Outbox and sends batches to the backend
│   │   ├── outbox.ts          # Read/write operations on the outbox table
│   │   └── types.ts           # Sync engine types (OutboxEntry, SyncBatchOperation...)
│   ├── types/                 # Canonical TypeScript interfaces
│   │   ├── account.ts
│   │   ├── profile.ts
│   │   ├── toast.ts
│   │   └── transaction.ts
│   ├── utils/
│   │   ├── clone.ts           # Deep object cloning
│   │   └── formatters.ts      # Date, currency, and text formatters
│   ├── views/
│   │   ├── accounts/          # AccountsView, AccountDetailView
│   │   ├── admin/             # AdminDashboardView, AdminLoginView
│   │   ├── DashboardView.vue
│   │   ├── LoginView.vue
│   │   ├── NotFoundView.vue
│   │   ├── ProfileView.vue
│   │   ├── RegisterView.vue
│   │   └── TransactionsView.vue
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── capacitor.config.ts        # Capacitor configuration (appId, webDir, plugins)
├── vercel.json                # Vercel configuration (SPA rewrites)
├── vite.config.ts             # Build config, plugins, and production obfuscation
└── .env.example               # Required environment variables
```

---

## Deployment

The `main` branch deploys automatically to **[https://rastro-ec.vercel.app](https://rastro-ec.vercel.app)** via Vercel.

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `VITE_API_URL` → backend URL on Render |

---

## License

MIT — see [LICENSE](https://opensource.org/licenses/MIT)
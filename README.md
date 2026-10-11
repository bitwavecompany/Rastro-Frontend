<div align="center">
  <h1>👣 Rastro</h1>
  <p><b>A modern, offline-first personal finance and expense tracking application.</b></p>
  
  ![Vue.js](https://img.shields.io/badge/vue-%2335495e.svg?style=for-the-badge&logo=vuedotjs&logoColor=%234FC08D)
  ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![Capacitor](https://img.shields.io/badge/capacitor-%23119EFF.svg?style=for-the-badge&logo=capacitor&logoColor=white)
  ![Dexie.js](https://img.shields.io/badge/dexie.js-%23FFB400.svg?style=for-the-badge&logo=javascript&logoColor=white)
</div>

## 📖 About
**Rastro** (Spanish for "Trail" or "Track") is a mobile-first, offline-capable personal finance application. It empowers users to track their incomes, expenses, and account balances seamlessly. Designed with a progressive disclosure UI, it offers a clean, distraction-free experience on mobile devices while maintaining powerful ledger and account management capabilities underneath.

## ✨ Features
- **True Offline-First:** All data is securely stored locally on your device using IndexedDB (via Dexie.js). UI icons are bundled locally so the app works flawlessly without an internet connection.
- **Cross-Platform:** Built as a responsive web app and fully integrated with Ionic Capacitor for a native Android experience.
- **Native Polish:** Features a custom, fully integrated native Android Splash Screen (Android 12+ compliant) and adaptive app icons.
- **Account Management:** Track multiple accounts (Cash, Bank) and monitor their individual balances.
- **Income & Expense Tracking:** Log transactions with reasons, descriptions, amounts, and payment methods.
- **Soft Deletion:** Safely void transactions with a required reason without losing the historical trail.
- **Responsive UI:** Mobile-optimized layout featuring bottom navigation and progressive disclosure modals to prevent information overload on small screens.
- **Security First:** Includes automated production code obfuscation to protect the frontend business logic before native compilation.

## 🛠️ Tech Stack
- **Frontend Framework:** [Vue 3](https://vuejs.org/) (Composition API)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **State Management:** [Pinia](https://pinia.vuejs.org/)
- **Local Database:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Mobile Runtime:** [Capacitor](https://capacitorjs.com/)
- **Icons:** [Iconify](https://iconify.design/) (with `@iconify-json/lucide` for bundled offline support)
- **Security:** `vite-plugin-javascript-obfuscator`

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm, yarn, or pnpm
- Android Studio (for mobile compilation)

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/bitwavecompany/Rastro-Frontend.git](https://github.com/bitwavecompany/Rastro-Frontend.git)
   cd rastro-frontend

```

2. Install dependencies:
```bash
npm install

```


3. Create a `.env` file based on the example:
```bash
cp .env.example .env

```


4. Start the development server:
```bash
npm run dev

```



### 📱 Mobile Development (Android)

Rastro uses Capacitor to build native mobile apps. Ensure you have Android Studio installed and properly configured.

1. Build the web project (this bundles the assets and obfuscates the code):
```bash
npm run build

```


2. Sync with Capacitor (copies the web build and native configurations into the Android folder):
```bash
npx cap sync android

```


3. Open Android Studio to run the emulator or build the release APK:
```bash
npx cap open android

```



*(Note: If you update the source images in the `assets/` directory, regenerate the native icons and splash screens by running `npx capacitor-assets generate --android` before syncing).*

## 📂 Project Structure

```text
├── android/           # Native Android source code and configurations
├── assets/            # Source images for Capacitor native icons and splash screens
├── src/
│   ├── api/           # Axios instances and API integrations
│   ├── components/    # Reusable Vue components (UI, layouts, forms, lists)
│   ├── composables/   # Vue Composition API hooks (business logic & form handling)
│   ├── database/      # Dexie.js configuration and local schema
│   ├── router/        # Vue Router configuration
│   ├── stores/        # Pinia state management modules
│   ├── types/         # TypeScript interfaces and type definitions
│   ├── utils/         # Helper functions (formatters, date handling)
│   └── views/         # Main page components (Dashboard, Profile, Accounts, Transactions)

```

## 🏗️ Architecture Insights

Based on Graphify system analysis, the application's core architecture revolves around the following patterns:
- **Core Abstractions**: `vue`, `vue-router`, and `pinia` are the primary state and navigation drivers.
- **State & Form Handling**: High-centrality composables like `useAccountForm()` and `useMovementForm()` bridge the gap between our UI components and the local Dexie database, acting as critical cross-community bridges.
- **Feature Modules**: The app is heavily modularized into distinct view communities (e.g., `AccountDetailView`, `ProfileView`, and `TransactionsView`), ensuring clean separation of concerns and maintainability.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://www.google.com/search?q=https://github.com/bitwavecompany/Rastro-Frontend/issues).

## 📝 License

This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.

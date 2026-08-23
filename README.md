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
- **Offline-First:** All data is securely stored locally on your device using IndexedDB (via Dexie.js). No internet connection required.
- **Cross-Platform:** Built as a responsive web app and easily compilable to Android/iOS native apps using Ionic Capacitor.
- **Account Management:** Track multiple accounts (Cash, Bank) and monitor their individual balances.
- **Income & Expense Tracking:** Log transactions with reasons, descriptions, amounts, and payment methods.
- **Soft Deletion:** Safely void transactions with a required reason without losing the historical trail.
- **Responsive UI:** Mobile-optimized layout featuring bottom navigation and progressive disclosure modals to prevent information overload on small screens.
- **Dashboard Analytics:** Quick overview of total patrimony, current month cash flows, and recent activity.

## 🛠️ Tech Stack
- **Frontend Framework:** [Vue 3](https://vuejs.org/) (Composition API)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **State Management:** [Pinia](https://pinia.vuejs.org/)
- **Local Database:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Mobile Runtime:** [Capacitor](https://capacitorjs.com/)
- **Icons:** [Iconify](https://iconify.design/)

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/bitwavecompany/Rastro-Frontend.git
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

Rastro uses Capacitor to build native mobile apps. Ensure you have Android Studio installed.

1. Build the web project:
   ```bash
   npm run build
   ```
2. Sync with Capacitor:
   ```bash
   npx cap sync android
   ```
3. Open Android Studio:
   ```bash
   npx cap open android
   ```

## 📂 Project Structure
```text
src/
├── api/           # Axios instances and API integrations (ready for cloud sync)
├── components/    # Reusable Vue components (UI, layouts, forms, lists)
├── composables/   # Vue Composition API hooks (business logic & form handling)
├── database/      # Dexie.js configuration and local schema
├── router/        # Vue Router configuration
├── stores/        # Pinia state management modules
├── types/         # TypeScript interfaces and type definitions
├── utils/         # Helper functions (formatters, date handling)
└── views/         # Main page components (Dashboard, Profile, Accounts, Transactions)
```

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/rastro-frontend/issues).

## 📝 License
This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.
# Agent Rules for Rastro Frontend

This file provides rules, context, and guidelines for AI agents working on this repository, following the Antigravity Customization System (`agy-customizations`).

## Stack & Best Practices

- **Framework**: Vue 3 with Composition API (`<script setup>`). Always default to this approach over Options API.
- **Language**: TypeScript (strict mode). Ensure proper typing for all Dexie schemas and API payloads.
- **Styling**: Tailwind CSS.
- **State Management**: Pinia (`src/stores/`).
- **Database**: Dexie.js (`src/database/db.ts`) for offline-first operations.
- **Mobile Runtime**: Capacitor (targeting Android).
- **Icons**: Iconify with offline bundling (`@iconify-json/lucide`). Do not use remote CDN icons.

## Architecture & Code Organization (Graphify Insights)

- **Core Hubs (God Nodes)**: `vue`, `vue-router`, and `pinia` form the backbone of the application. 
- **Composables**: Forms and business logic are heavily extracted into composables like `useAccountForm()` and `useMovementForm()`. When adding new forms, follow this pattern instead of bloating `.vue` files.
- **Separation of Concerns**: Key views like `AccountDetailView.vue` and `ProfileView.vue` act as orchestrators, relying on dedicated components and stores.

## Offline-First & Mobile Principles

- **Offline-First**: All CRUD operations must persist to IndexedDB via Dexie.js first. 
- **Progressive Disclosure**: Use modals and bottom sheets to prevent information overload on small screens.
- **Security**: The Vite build pipeline obfuscates code before compilation into Capacitor. Avoid logic that depends on `Function.name` or minifiable constructor names at runtime.

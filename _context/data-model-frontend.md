# Rastro — Data Model

> **Date:** October 2026
> **Status:** Approved / Implemented (Aligned with Frontend v7 and Dexie.js)

This document defines the types, interfaces, IndexedDB schema, and canonical fields of the system. It serves as the naming and typing reference for all layers: TypeScript interfaces, API payloads, local IndexedDB schema (Dexie.js), and frontend state.

**Business rules reference:** [`business-rules.md`](./business-rules.md)

---

## Architecture Rule: Naming Uniqueness

Every concept in the system has a single field name, used consistently across all layers: TypeScript interfaces, API payloads, IndexedDB schema, frontend state, and documentation. The same piece of data cannot have different names depending on the context.

Reintroducing legacy fields such as `accountId`, `paymentType`, `ownerId`, or `syncStatus` is strictly prohibited. The entire system operates under a strict `snake_case` naming convention, indexed in Dexie v7.

---

## Canonical Fields

| Field | Concept | Location |
|---|---|---|
| `amount` in `Transaction` | Transaction amount — always > 0 | `Transaction` |
| `initial_balance` in `Account` | Initial balance entered by the user | `Account` |
| `amount` / `balance` in `Account` | Current calculated balance (Store / API) — not persisted in Dexie v7 | Calculated in frontend and API |
| `deleted_at` | Deactivation ISO8601 timestamp (soft delete) | `Account`, `Transaction` |
| `deletion_reason` | Reason or audit trail for transaction deactivation/relocation | `Transaction` |
| `deactivation_reason` | Reason for account deactivation (`'user_action'` \| `'plan_downgrade'`) | `Account` |
| `date` | Visible transaction date — `YYYY-MM-DD` format (required) | `Transaction` |
| `sync_status` | Local offline-first synchronization state | `Account`, `Transaction` |
| `created_at` | Creation ISO8601 timestamp | All entities |
| `updated_at` | Last modified ISO8601 timestamp | All entities |
| `payment_method` | Payment method (`'cash'` \| `'transfer'`) | `Transaction`, `Profile` |
| `name` | User's display name | `Profile` |

---

## Base Types and Enums

```typescript
export type PlanType             = 'guest' | 'free' | 'premium';
export type UserRole             = 'client' | 'admin';
export type AccountType          = 'cash' | 'bank';
export type TransactionType      = 'income' | 'expense';
export type PaymentMethod        = 'cash' | 'transfer';
export type PremiumRequestStatus = 'pending_verification' | 'approved' | 'rejected';
export type DeactivationReason   = 'user_action' | 'plan_downgrade' | null;
export type DeletionReason       = 'cascade_account_deactivation' | string | null;

// Local synchronization states (Offline-First)
export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';

// Outbox engine operations
export type OutboxOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'hard-delete'
  | 'purge-account'
  | 'relocate';

export type OutboxEntity = 'accounts' | 'transactions' | 'profile';
```

---

## Main Interfaces

### 1. Profile / User (`Profile`)
Represents the authenticated user or guest in the local session (`src/types/profile.ts` and `profile` table in Dexie):

```typescript
export interface Profile {
  id:                       string;                  // UUIDv7
  name:                     string;                  // User's display name
  email:                    string | null;           // null for Guests
  plan:                     PlanType;                // 'guest' | 'free' | 'premium'
  role?:                    UserRole;                // 'client' | 'admin'
  payment_method?:          PaymentMethod | null;    // For Premium requests
  payment_bank?:            string | null;           // Origin bank for transfer
  payment_receipt?:         string | null;           // Receipt or voucher number
  subscription_expires_at?: string | null;           // ISO8601 — future billing
  created_at?:              string;                  // ISO8601
  updated_at?:              string;                  // ISO8601
}
```

### 2. Account (`Account`)
Local and remote model for financial accounts (`src/types/account.ts` and `accounts` table in Dexie):

```typescript
export interface Account {
  id:                   string;                    // UUIDv7
  user_id?:             string;                    // Optional in offline Guest mode
  name:                 string;                    // 1-50 characters, unique per user
  type:                 AccountType;               // 'cash' | 'bank'
  initial_balance:      number;                    // ≥ 0
  description?:         string | null;             // Optional notes
  currency:             string;                    // Default "USD"
  is_default:           boolean;                   // true only for the "Cash" account
  deactivation_reason?: DeactivationReason;        // null | 'user_action' | 'plan_downgrade'
  deleted_at?:          string | null;             // null = active | ISO8601 = deactivated
  created_at?:          string;                    // ISO8601
  updated_at?:          string;                    // ISO8601
  sync_status:          SyncStatus;                // Local synchronization state
}
```
> *Note regarding `amount`:* The current balance is not indexed in Dexie v7 to prevent balance desynchronization; it is calculated reactively in `useAccountsStore` (`initial_balance + income - expenses`) or comes pre-calculated in server responses.

### 3. Transaction (`Transaction`)
Income and expense model (`src/types/transaction.ts` and `transactions` table in Dexie):

```typescript
export interface Transaction {
  id:               string;                    // UUIDv7
  account_id:       string;                    // Associated account
  user_id?:         string;                    // Optional in offline Guest mode
  type:             TransactionType;           // 'income' | 'expense'
  amount:           number;                    // > 0
  reason:           string;                    // Title / Concept
  description?:     string | null;             // Notes / Relocation audit trail
  payment_method:   PaymentMethod;             // 'cash' | 'transfer'
  date:             string;                    // YYYY-MM-DD (required)
  category?:        'comida' | 'transporte' | 'entretenimiento' | 'estudio' | 'trabajo' | 'otros' | null; // Mandatory for expense, null for income
  tags:             string[];                  // Tags / labels (default [])
  transfer_id?:     string | null;             // UUID for transfers
  deletion_reason?: string | null;             // Reason for deletion or relocation
  deleted_at?:      string | null;             // null = active | ISO8601 = deactivated
  created_at?:      string;                    // ISO8601
  updated_at?:      string;                    // ISO8601
  sync_status:      SyncStatus;                // Local synchronization state
}

export interface RelocateTransactionPayload {
  id:                     string;              // Original transaction ID to deactivate
  new_id:                 string;              // UUIDv7 of the new cloned transaction
  destination_account_id: string;              // Destination account
  reason:                 string;              // Required audit reason
}
```

---

## Offline Synchronization Engine (`Outbox` and `DLQ`)

Implemented in `src/sync/types.ts` and `src/database/db.ts`:

### 1. Outbox Entry (`OutboxEntry`)
Persisted FIFO queue in IndexedDB for pending upload operations:

```typescript
export interface OutboxEntry {
  seq?:       number;                    // Auto-increment primary key in Dexie
  opId:       string;                    // UUIDv7 identifier for the operation
  entity:     OutboxEntity;              // 'accounts' | 'transactions' | 'profile'
  entityId:   string;                    // ID of the affected entity
  op:         OutboxOperation;           // 'create' | 'update' | 'delete' | etc.
  payload?:   Record<string, unknown>;   // Data snapshot for the API
  createdAt:  string;                    // ISO8601 chronological order
}
```

### 2. Dead Letter Queue Entry (`DlqEntry`)
Operations rejected by the server (e.g., 422 error due to collision or validation) that require manual intervention:

```typescript
export interface DlqEntry extends OutboxEntry {
  errorCode:    number;                  // HTTP Code (409, 422, etc.)
  errorMessage: string;                  // Error message returned by the API
  failedAt:     string;                  // ISO8601 timestamp of the failure
}
```

### 3. Batch Sync Payload (`SyncBatchRequest`)
```typescript
export interface SyncBatchOperation {
  opId:     string;
  entity:   OutboxEntity;
  op:       OutboxOperation;
  payload:  Record<string, unknown>;
}

export interface SyncBatchRequest {
  operations: SyncBatchOperation[];
}
```

---

## Premium Requests and Authentication

```typescript
export interface PremiumRequest {
  id:                   string;
  user_id:              string;
  status:               PremiumRequestStatus;    // 'pending_verification' | 'approved' | 'rejected'
  payment_method:       PaymentMethod;           // 'cash' | 'transfer'
  origin_bank:          string | null;           // Issuing bank
  transfer_receipt:     string | null;           // Receipt or voucher
  payment_notes:        string | null;           // Admin notes
  rejection_reason:     string | null;           // Reason for rejection
  payment_verified_by:  string | null;           // Admin ID
  verified_at:          string | null;           // ISO8601
  created_at:           string;
  updated_at:           string;
}

export interface AuthTokensData {
  token:         string;                         // Access Bearer JWT
  access_token?: string;
  refresh_token: string;                         // Refresh Token
  token_type:    string;                         // 'Bearer'
  expires_in:    number;
  user:          Profile;
}
```

---

## Canonical IndexedDB Schema (Dexie.js v7)

Canonical structure of active tables and indexes in the frontend (`src/database/db.ts`):

```typescript
// DB Name: 'RastroLocalDB' (Direct canonical Version 7)
this.version(7).stores({
  accounts:     'id, name, type, sync_status, created_at, deleted_at',
  transactions: 'id, account_id, type, payment_method, date, sync_status, created_at, deleted_at, transfer_id',
  outbox:       'opId, entity, op, createdAt, [status+createdAt]',
  profile:      'id, updated_at',
})
```
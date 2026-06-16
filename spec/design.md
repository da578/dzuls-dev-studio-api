# Architecture & Design Specification: Dzul's Dev Studio API

**Role:** Architect Directive -> Senior Engineer Blueprint  
**Methodology:** Spec-Driven Development  
**Revision:** 1.0.0  
**Runtime:** Bun (Latest)  
**Language:** TypeScript (Strict)  
**Framework:** Elysia JS  
**Architecture:** Modular Monolith (Serverless-Optimized)  
**Schema Library:** TypeBox (via Elysia standard)  
**OpenAPI:** Required (`@elysiajs/openapi`)  
**Database Access:** Drizzle ORM (PostgreSQL via Supabase)  
**Testing:** Bun test + PGlite (In-Memory DB) + Eden Treaty  
**Logging:** Winston (Structured JSON)  
**Linting & Formatting:** Biome JS

## 1. Architect Directives

### 1.1 Architectural Constraint
- **Default architecture:** Modular Monolith optimized for Serverless deployment.
- **Design goals:** 
  - Keep the system deployable as a single backend application (specifically Cloudflare Workers).
  - Keep feature modules isolated by business capability.
  - Prevent uncontrolled cross-module imports.
  - Avoid premature microservices.
  - Ensure statelessness; no local file system persistence.

### 1.2 Module Boundary Rule
- Each module MUST expose a clear public boundary via `index.ts`.
- **Allowed cross-module communication:** Public service interface, public query interface, domain events.
- **Forbidden by default:** Importing another module's internal repository directly, sharing mutable internal state.

### 1.3 Type Safety Constraint
- Strict TypeScript is mandatory (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`).
- External inputs MUST be schema-validated via TypeBox.
- Unsafe casts MUST be documented and minimized.

### 1.4 Schema Contract Constraint
- TypeBox schemas are the source of truth for external contracts.
- Flow: Request schema -> Runtime validation -> Static type inference -> OpenAPI -> Contract tests (via Eden Treaty).
- Schemas are required for: HTTP request body, query params, path params, success/error responses, webhook payloads, and background job payloads.

### 1.5 Database Constraint
- **Default:** Drizzle ORM with PostgreSQL (Supabase).
- **Design expectations:** 
  - Migration-first database evolution (executed via CI/CD, NOT at runtime).
  - Explicit transaction boundaries.
  - Parameterized queries (handled by Drizzle).
  - Optimistic locking where stale writes are dangerous (e.g., feature status updates).
  - Strict idempotency for retryable sensitive mutations (specifically Payments/Webhooks).

### 1.6 Operational Constraint
- **Environment:** Managed via platform secrets (Cloudflare `wrangler` secrets).
- **Logging:** Winston with sensitive data masking and Request ID tracking.
- **Health checks:** `/health` endpoint required.
- **Deployment target:** Serverless Function (Cloudflare Workers).
- **Migration execution strategy:** Executed via GitHub Actions CI/CD pipeline using `drizzle-kit` against the production database URL prior to deployment.

## 2. System Architecture

### 2.1 High-Level Architecture
```text
Client (Web/Mobile) / Payment Gateway Webhook
        |
        v
Transport Layer (Elysia JS REST API)
        |
        v
Schema Validation Layer (TypeBox)
        |
        v
Authentication & Authorization Middleware (JWT + RBAC Macro)
        |
        v
Application Service / Use Case
        |
        v
Domain Logic & Idempotency Check
        |
        v
Repository / Gateway (Drizzle ORM)
        |
        v
Database (Supabase PostgreSQL) / External Service (Resend Email)
```

### 2.2 Request Pipeline
Request -> Request ID assignment -> Logging context -> Parse request -> Validate TypeBox schema -> Authenticate (JWT) -> Authorize (RBAC) -> Execute use-case -> Open transaction (if required) -> Persist state (Drizzle) -> Emit event (e.g., Email) -> Format response -> Log result.

### 2.3 Error Pipeline
Error thrown -> Normalize error via Specific Error Classes (e.g., `NotFoundError`, `ConflictError`) -> Map to standard error code -> Mask sensitive details (no SQL leaks) -> Log internal detail (Winston) -> Return standard JSON error response.

## 3. Module Structure & Responsibilities

### 3.1 Recommended Folder Structure
```text
src/
├── index.ts (Serverless entry point, Cloudflare Workers compatible)
├── config/ (logger.ts)
├── db/ (index.ts, schema.ts, migrations/, seed.ts)
├── modules/
│   ├── auth/ (login, register, refresh, JWT)
│   ├── features/ (feature backlog, status, pricing)
│   ├── payments/ (webhooks, idempotency)
│   └── notifications/ (email dispatch via Resend)
├── shared/ (errors.ts, schemas.ts, auth-plugin.ts, logger-plugin.ts)
└── tests/ (unit, integration, contract, setup.ts)
```

### 3.2 Module Responsibility Table
| Module | Path | Responsibility | Public Boundary | Architect Constraint |
|---|---|---|---|---|
| `config` | `src/config` | Environment and runtime config | Config object | No business logic |
| `db` | `src/db` | Drizzle connection, schema definitions | Drizzle instance | No feature-specific logic |
| `auth` | `src/modules/auth` | JWT generation, login, register, logout | Auth service | Stateless, token blocklist in DB |
| `users` | `src/modules/users` | User account CRUD management | User service | Restricted to DEVELOPER role |
| `features` | `src/modules/features` | Core feature backlog logic | Feature service | Enforce strict state transitions |
| `payments` | `src/modules/payments` | Payment webhook processing, idempotency | Payment service | MUST enforce idempotency strictly |
| `notifications`| `src/modules/notifications`| Email dispatch (e.g., status changes) | Notification service | Async, non-blocking, retry-safe |

## 4. API Contract Design
- **Schema-First:** All endpoints MUST define TypeBox schemas before handler implementation.
- **Standard Success Response:** `{ "success": true, "data": {}, "meta": {} }`
- **Standard Error Response:** `{ "success": false, "error": { "code": "ERROR_CODE", "message": "string", "details": {} } }`
- **OpenAPI:** Generated automatically via `@elysiajs/openapi` from TypeBox schemas.

## 5. Database Design
- **Engine:** PostgreSQL (Supabase).
- **Access:** Drizzle ORM.
- **Migration:** Managed by `drizzle-kit`. Migrations are generated locally and applied via CI/CD pipeline. Rollback strategies must be documented.
- **Idempotency Table:** Required in `payments` module to store `Idempotency-Key`, `request_hash`, `response_status`, and `response_body` to prevent double-fulfillment.

## 6. Authentication and Authorization Design
- **Authentication Strategy:** JWT (JSON Web Token) with short expiry (15m) + Refresh Token (7d) pattern.
- **Token Revocation:** Revoked tokens are stored in the `rekoved_tokens` table. The authentication middleware checks this table on every request.
- **Authorization Model:** RBAC (Role-Based Access Control) via Elysia Macros.
- **Roles:** `DEVELOPER` (Admin, full access), `CLIENT` (Restricted to their own features and payments).
- **Access Control Matrix:**
  - `Feature`: Create/Read/Update -> `DEVELOPER`; Read (own) -> `CLIENT`.
  - `Payment`: Create/Read (own) -> `CLIENT`; Read (all) -> `DEVELOPER`.
  - `User CRUD`: Create/Read/Update/Delete -> `DEVELOPER` ONLY.

## 7. Security Design
- **Input Validation:** TypeBox schemas (mandatory).
- **Idempotency:** Strict validation for Payment Webhooks and Creation.
- **Secrets Management:** Platform environment variables (e.g., `DATABASE_URL`, `JWT_ACCESS_SECRET`, `RESEND_API_KEY`). NEVER committed.
- **CORS:** Strict whitelist (e.g., client frontend domain).
- **Token Revocation:** Logout is implemented using a Token Blocklist (`revoked_tokens` table) to invalidate JWT access before natural expiration.
- 
## 8. Observability Design
- **Logging:** Winston, structured JSON. Includes `requestId`, `method`, `url`, `status_code`.
- **Health Check:** `GET /health` returning API status.

## 9. Deployment Design
- **Target:** Serverless Function (Cloudflare Workers via `wrangler.toml`).
- **Migration Strategy:** GitHub Actions workflow triggers `bunx drizzle-kit migrate` using the production `DATABASE_URL` *before* the new code is deployed. Serverless functions MUST NOT run migrations on cold start.

## 10. Sign-Off
- [x] Architecture mapped to modules
- [x] Module boundary rules defined
- [x] API contract strategy defined (TypeBox + OpenAPI)
- [x] Database and transaction design accepted (Drizzle + Supabase)
- [x] Idempotency design accepted (Strict for Payments)
- [x] Security model accepted (JWT + RBAC)
- [x] Observability design accepted (Winston + Request ID)
- [x] Deployment design accepted (Cloudflare Workers + CI/CD Migration)

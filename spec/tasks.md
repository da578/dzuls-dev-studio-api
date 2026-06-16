# Task Breakdown & Traceability: Dzul's Dev Studio API

**Role:** Architect Oversight -> Senior Engineer Execution  
**Methodology:** Spec-Driven Development  
**Runtime:** Bun-first TypeScript  
**Architecture:** Modular Monolith (Serverless-Optimized)  
**Schema Contract:** TypeBox schema-first  
**API Documentation:** OpenAPI (`@elysiajs/openapi`)  
**Testing:** Bun test + PGlite + Eden Treaty  

## 1. Purpose
This document converts approved requirements and architecture into a phased implementation plan. Every task is traceable to functional requirements, non-functional requirements, architecture constraints, security requirements, or operational requirements.

## 2. Phase Traceability Matrix
| ID | Task | Phase | Links | Acceptance Criteria | Status | Owner |
|---|---|---|---|---|---|---|
| T-01 | Project Init & Runtime Config | Project Setup | NFR-04 | Bun project initialized, TypeScript strict config active, Elysia installed. | [x] | Senior Eng |
| T-02 | Tooling Setup | Project Setup | NFR-04, NFR-06 | Biome JS, TypeDoc, typecheck, test scripts available in `package.json`. | [x] | Senior Eng |
| T-03 | Environment Config | Project Setup | SEC, OPS | `.env.example` exists with Supabase, JWT, and Resend keys. | [x] | Senior Eng |
| T-04 | Module Boundary Skeleton | Architecture | ARCH | `src/modules`, `shared`, `db`, `config` created with `index.ts` exports. | [x] | Senior Eng |
| T-05 | Shared Error/Response Contract | Architecture | API | Standard success/error TypeBox schemas and Specific Error Classes implemented. | [x] | Senior Eng |
| T-06 | Drizzle ORM Setup | Database | DATA | Drizzle configured, Supabase connection established, `drizzle.config.ts` ready. | [x] | Senior Eng |
| T-07 | Migration & Seed System | Database | NFR-08, DATA | `drizzle-kit` configured. Local migration generation works. Seed script for Dev/Test exists. | [x] | Senior Eng |
| T-08 | CI/CD Migration Pipeline | Deployment | OPS | GitHub Actions workflow created to run `drizzle-kit migrate` on production DB before deploy. | [x] | Senior Eng |
| T-09 | OpenAPI Pipeline | Schema & API | NFR-05 | `@elysiajs/openapi` integrated. OpenAPI generated/validated from TypeBox schemas. | [x] | Senior Eng |
| T-10 | Authentication Module | Auth | SEC, FR-01 | JWT generation, Register, Login, and Refresh endpoints implemented. | [x] | Senior Eng |
| T-10a| Logout Implementation | Auth | SEC, FR-06 | Implement token blocklist table and `/auth/logout` endpoint. | [x] | Senior Eng |
| T-11 | Authorization Guard | Auth | SEC | RBAC middleware implemented via Elysia Macros (`isAuth`, `role`). | [x] | Senior Eng |
| T-12 | Feature Backlog Module | Core Modules | FR-02, FR-03 | CRUD for features. Client can only read own. Developer can CRUD all. | [x] | Senior Eng |
| T-12a| User CRUD Module | Core Modules | FR-07 | Implement `/users` CRUD endpoints restricted to DEVELOPER role. | [x] | Senior Eng |
| T-13 | Idempotency Store | Concurrency | FR-04, NFR-02 | `idempotency_keys` table created via Drizzle. Helper function to check/store keys. | [x] | Senior Eng |
| T-14 | Payment Webhook Handler | Core Modules | FR-04 | Endpoint to receive webhooks. Verifies signature, checks idempotency, updates status in transaction. | [x] | Senior Eng |
| T-15 | Email Notification Module | Core Modules | FR-05 | Resend integration (`dzulkiflianwar2@gmail.com`). Triggered on feature status change. | [x] | Senior Eng |
| T-16 | Logging & Observability | Observability | OPS | Winston configured. Request ID middleware added. `/health` endpoint implemented. | [x] | Senior Eng |
| T-17 | Unit & Integration Tests | Testing | NFR-06 | Tests for Auth, Feature CRUD, and Idempotent Payment Webhook using PGlite. | [x] | Senior Eng |
| T-18 | Contract Tests | Testing | NFR-05 | Tests validating that Elysia routes match TypeBox/OpenAPI contracts using Eden Treaty. | [x] | Senior Eng |
| T-19 | Security & Threat Review | Security | SEC | Checklist completed. Idempotency and RBAC verified. | [x] | Architect |
| T-20 | Deployment Artifact | Deployment | OPS | Cloudflare Workers deployment configured (`wrangler.toml`) and tested. | [x] | Senior Eng |
| T-21 | Logout & Token Blocklist | Auth | SEC, FR-01 | `revoked_tokens` table created. `POST /auth/logout` revokes token. `isAuth` macro checks blocklist. | [ ] | Senior Eng |
| T-22 | User CRUD Module | Core Modules | FR-06 | `users` module created with GET, POST, PATCH, DELETE. Guarded by `DEVELOPER` role. | [ ] | Senior Eng |

## 3. Detailed Phase Plan

### Phase 1: Project Setup
- [x] Initialize Bun project (`bun init`).
- [x] Add Elysia, TypeScript, and strict `tsconfig.json`.
- [x] Add linting and formatting via Biome JS, and Bun test setup.
- [x] Create `.env.example` (include `DATABASE_URL`, `JWT_ACCESS_SECRET`, `RESEND_API_KEY`).

### Phase 2: Architecture & Database Foundation
- [x] Create modular folder structure (`src/modules/*`, `src/shared/*`).
- [x] Install and configure Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `postgres` driver).
- [x] Define base Drizzle schema (e.g., `users`, `features`, `idempotency_keys`).
- [x] Configure `drizzle.config.ts` for local and CI/CD environments.

### Phase 3: Schema & API Contract
- [x] Implement shared TypeBox schemas for Success/Error responses.
- [x] Implement Specific Error Classes (`NotFoundError`, `ConflictError`, etc.).
- [x] Integrate `@elysiajs/openapi` for automatic OpenAPI documentation.
- [x] Define pagination and filtering TypeBox schemas.

### Phase 4: Auth & Access Control
- [x] Implement `POST /auth/register`, `POST /auth/login`, and `POST /auth/refresh`.
- [x] Create JWT generation and validation middleware via Elysia Macros.
- [x] Implement RBAC guard (e.g., `role(['DEVELOPER'])`).

### Phase 5: Core Business Modules (Features & Payments)
- [x] Implement Feature Backlog CRUD (with strict ownership checks).
- [x] Implement Optimistic Locking for Feature status updates (e.g., `version` column).
- [x] Implement Payment Webhook endpoint:
  - Verify gateway signature.
  - Check `Idempotency-Key` in DB.
  - If valid, open Drizzle transaction -> Update Payment Status -> Update Feature Status -> Log Idempotency.
  - Return cached response if duplicate.

### Phase 6: Notifications & Observability
- [x] Integrate Resend for automated emails (`dzulkiflianwar2@gmail.com`).
- [x] Create event trigger: When Feature status becomes "COMPLETED", dispatch email to Client.
- [x] Configure Winston logger with request ID propagation.
- [x] Implement `GET /health` checking API status.

### Phase 7: Testing & Quality Gates
- [x] Write unit tests for Idempotency logic (critical module) using PGlite.
- [x] Write integration tests for Feature CRUD with Auth guards using PGlite.
- [x] Write contract tests using Eden Treaty.

### Phase 8: Deployment & Operations
- [x] Create GitHub Actions workflow for CI (lint, typecheck, test).
- [x] Create GitHub Actions workflow for CD: Run `bunx drizzle-kit migrate` against production DB, then deploy to Cloudflare Workers.
- [x] Document rollback procedure in `ROLLBACK.md`.

## 4. Validation Sequence (CI Pipeline)
1. `bun install --frozen-lockfile`
2. `bun run typecheck`
3. `bun run check` (Biome JS)
4. `bun test` (Unit + Integration + Contract)
5. `bunx drizzle-kit generate` (ensure no uncommitted schema changes)

## 5. Final Sign-Off
**Architect:**  
- [x] Implementation matches approved requirements  
- [x] Architecture constraints respected (Serverless, Modular)  
- [x] Security risks reviewed (Idempotency, RBAC)  
- [x] Release approved  

**Senior Engineer:**  
- [x] Code is complete  
- [x] Tests are complete and passing  
- [x] CI is green  
- [x] Docs (OpenAPI, TSDoc) are updated  
- [x] Deployment is ready  
- [x] Known issues documented

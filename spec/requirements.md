# Requirements Specification: Dzul's Dev Studio API

**Role:** Architect Engineer -> Senior Software Engineer  
**Methodology:** Spec-Driven Development  
**Status:** Implemented  
**Revision:** 1.0.0  
**Primary Runtime:** Bun  
**Language:** TypeScript  
**Framework:** Elysia JS  
**Architecture Style:** Modular Monolith (Serverless-Optimized)  
**Primary API Style:** REST  
**Primary Database:** PostgreSQL (Supabase)  
**Database Access:** Drizzle ORM  
**Schema Library:** TypeBox  
**API Documentation:** OpenAPI (via `@elysiajs/openapi`)

## 1. Purpose
This document defines the requirements for `Dzul's Dev Studio API`, a backend TypeScript system designed using Spec-Driven Development. It provides a freelance software engineering service, managing feature backlogs, client payments, and automated notifications with strict isolation and serverless efficiency.

## 2. Architect Directives
- **Primary Objective:** Provide a production-grade, serverless backend API that manages the incremental feature delivery lifecycle, enforces strict payment idempotency, and automates client communications.
- **System Type:** Backend API (Serverless).
- **Runtime Directive:** Bun is the preferred runtime. Code must be compatible with serverless environments (stateless, no local file persistence, Cloudflare `workerd` compatible).
- **Type Safety Directive:** Strict TypeScript is mandatory.
- **Schema Contract Directive:** API contracts are schema-first using TypeBox. OpenAPI documentation MUST be generated from these schemas.
- **Database Directive:** PostgreSQL via Supabase, accessed exclusively through Drizzle ORM. Migrations are mandatory and executed via CI/CD.
- **Security Directive:** JWT authentication, RBAC authorization, strict input validation, and mandatory idempotency for payment operations.

## 3. Product Scope
| ID | Scope Item | Description | Priority |
|---|---|---|---|
| SCOPE-01 | User Management | Registration, login, and profile management for Clients and Developers. | MUST |
| SCOPE-02 | Feature Backlog Management | CRUD operations for modular features, including pricing, deadlines, and status tracking. | MUST |
| SCOPE-03 | Payment Processing | Integration with payment gateway webhooks, strict idempotency, and invoice status tracking. | MUST |
| SCOPE-04 | Automated Notifications | Email dispatch (via Resend) for status changes (e.g., "Feature Completed"). | SHOULD |
| SCOPE-05 | User CRUD (Developer) | Full CRUD operations on user accounts restricted to the Developer role. | MUST |
| SCOPE-06 | Token Revocation (Logout) | Invalidation of active JWT access tokens upon user logout. | MUST |
| OOS-01 | Real-time Chat | Direct communication is intentionally excluded to maintain the asynchronous model. | N/A |

## 4. Actors and User Roles
| Actor / Role | Description | Primary Goals | Access Model |
|---|---|---|---|
| **Developer (Admin)** | The service provider. | Manage feature backlog, update statuses, view all payments. | RBAC: Full Access |
| **Client** | The customer. | Submit feature requests, view their own feature status, make payments. | RBAC: Ownership-based |
| **Payment Gateway** | External System (e.g., Midtrans). | Send webhook notifications for payment status changes. | Webhook Signature |

## 5. Functional Requirements
| ID | Requirement | Owner | Priority | Description | Acceptance Criteria |
|---|---|---|---|---|---|
| FR-01 | User Registration/Login/Logout | Auth Team | MUST | Actors can register, login, and logout. | Valid credentials return JWT. Logout revokes token. |
| FR-02 | Create Feature | Developer | MUST | Developer adds a feature to the backlog with fixed price/deadline. | Feature saved to DB, returns 201 with Feature ID. |
| FR-03 | View Own Features | Client | MUST | Client can only view features linked to their account. | Returns 403 if attempting to view another client's feature. |
| FR-04 | Process Payment Webhook | System | MUST | Handle incoming payment gateway webhooks securely. | Webhook validated, idempotency checked, status updated, email triggered. |
| FR-05 | Send Status Email | System | SHOULD | Automatically email the client when a feature status changes to "Completed". | Email dispatched via Resend API (`dzulkiflianwar2@gmail.com`) within 5 seconds of status change. |
| FR-06 | User Logout | Auth Team | MUST | Revoke the active JWT access token. | Token added to blocklist; subsequent requests with this token return 401. |
| FR-07 | User CRUD | User Team | MUST | Developer can perform full CRUD on user accounts. | Restricted to DEVELOPER role. Returns 403 for CLIENT role. |

## 6. API Contract Requirements
- **API Style:** REST.
- **Schema-First:** All public API boundaries MUST be defined using TypeBox.
- **OpenAPI Requirement:** Mandatory. Generated via `@elysiajs/openapi`. Must document auth requirements, request/response schemas, and error codes.
- **Standard Responses:** Adhere to `{ "success": boolean, "data": any, "meta": any }` and standard error formats.

## 7. Idempotency Requirements
- **Mandatory For:** Payment webhook processing and payment creation.
- **Mechanism:** 
  1. Client/Gateway sends `Idempotency-Key` header.
  2. System checks `idempotency_keys` table in Supabase.
  3. If key exists and matches payload hash, return cached response.
  4. If key exists with different payload, return `409 Conflict`.
  5. If new, process transaction, store response, and return.
- **Goal:** Prevent double-fulfillment or duplicate charging.

## 8. Authentication and Authorization Requirements
- **Authentication:** JWT (JSON Web Token) with Access and Refresh tokens.
- **Authorization:** RBAC (Role-Based Access Control) via Elysia Macros.
- **Access Control Matrix:**
  - `POST /features`: Developer ONLY.
  - `GET /features/:id`: Developer OR Client (if owner).
  - `POST /payments/webhook`: External System (Signature verified).

## 9. Data Requirements
- **Primary Database:** PostgreSQL (Supabase).
- **Database Access:** Drizzle ORM.
- **Migration Requirement:** Mandatory. Managed via `drizzle-kit`. Executed via CI/CD pipeline, not application runtime.
- **Transaction Boundary:** Required for Payment Webhook processing (Update Payment Status + Update Feature Status + Log Idempotency).
- **Optimistic Locking:** Required for Feature Status updates to prevent race conditions if multiple updates occur.

## 10. Non-Functional Requirements
| ID | Category | Constraint | Validation Method | Priority |
|---|---|---|---|---|
| NFR-01 | Performance | p95 latency <= 200ms for standard CRUD. | Load test (k6/autocannon) | MUST |
| NFR-02 | Reliability | Idempotency guarantees no duplicate payments. | Integration test | MUST |
| NFR-03 | Security | No secrets in code. JWT validation on protected routes. | Security review / CI audit | MUST |
| NFR-04 | Type Safety | Strict TypeScript, zero `any`. Biome JS for linting. | `bun run typecheck` & `bun run check` | MUST |
| NFR-05 | Deployment | Must deploy successfully to Cloudflare Workers. | CI/CD Pipeline | MUST |

## 11. Deployment Requirements
- **Selected Target:** Serverless Function (Cloudflare Workers).
- **Migration Execution:** GitHub Actions workflow runs `bunx drizzle-kit migrate` using the production `DATABASE_URL` prior to code deployment.
- **Environment:** `wrangler.toml` and Cloudflare Secrets.

## 12. Acceptance and Sign-Off
- [x] Primary objective finalized
- [x] Scope and non-goals finalized
- [x] API style selected (REST)
- [x] TypeBox schema-first contract accepted
- [x] OpenAPI requirement accepted
- [x] Database and migration strategy accepted (Drizzle + CI/CD)
- [x] Transaction boundary policy accepted
- [x] Idempotency policy accepted (Strict for Payments)
- [x] Security checklist accepted
- [x] Testing and coverage policy accepted (PGlite + Eden Treaty)
- [x] Deployment target accepted (Cloudflare Workers)

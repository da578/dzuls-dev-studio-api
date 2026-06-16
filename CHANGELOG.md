# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-15

### Added
- **Auth Module**: JWT-based authentication with Access and Refresh tokens.
- **RBAC Guard**: Role-Based Access Control for `CLIENT` and `DEVELOPER` roles.
- **Features Module**: CRUD operations for feature backlogs with optimistic locking.
- **Payments Module**: Webhook processing for Midtrans with strict idempotency checks.
- **Notifications Module**: Automated email dispatch via Resend when a feature is completed.
- **User Management Module**: Added CRUD operations for users (`GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`). Access is strictly restricted to the `DEVELOPER` role.
- **Logout Functionality**: Added `POST /auth/logout` endpoint to revoke access tokens.
- **Token Revocation**: Added `revoked_tokens` table to the database schema to track and invalidate logged-out JWTs.
- **Auth Guard Update**: Updated the `isAuth` macro in `auth-plugin.ts` to verify that the provided token has not been revoked.
- **Observability**: Structured JSON logging using Winston and Request ID tracking.
- **Testing**: Integration and Contract tests using PGlite and Eden Treaty.
- **CI/CD**: GitHub Actions workflows for automated testing, database migrations, and deployment to Cloudflare Workers.
- **Documentation**: Comprehensive TSDoc, OpenAPI generation, and project guidelines.

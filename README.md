# Dzul's Dev Studio API

[![Bun](https://img.shields.io/badge/Bun-1.x-black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Elysia](https://img.shields.io/badge/Elysia-1.x-red)](https://elysiajs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A backend TypeScript system designed using Spec-Driven Development to manage freelance software engineering services. It handles feature backlogs, client payments with strict idempotency, and automated email notifications. The system enforces strict type safety, ACID-compliant transactions, and modular boundaries optimized for Serverless deployment.

## Architecture Overview

The system follows a Modular Monolith architecture with a feature-based directory structure. The request pipeline enforces validation and authorization before reaching domain-specific business logic.

```text
+---------------------+      +-------------------------+      +-----------------------+
|                     |      |                         |      |                       |
|   HTTP Client       | ---> |   Elysia Transport      | ---> |   Global Middleware   |
|   (Eden / Fetch)    |      |   Layer                 |      |   (Request ID, JWT)   |
|                     |      |                         |      |                       |
+---------------------+      +-------------------------+      +-----------------------+
                                        |                               |
                                        v                               v
                             +-------------------------+      +-----------------------+
                             |                         |      |                       |
                             |   TypeBox Validation    | ---> |   RBAC Guard          |
                             |   (Schema-First)        |      |   (requireRole)       |
                             |                         |      |                       |
                             +-------------------------+      +-----------------------+
                                        |
                                        v
                             +-------------------------+      +-----------------------+
                             |                         |      |                       |
                             |   Application Service   | ---> |   Drizzle ORM         |
                             |   (Business Logic)      |      |   (PostgreSQL)        |
                             |                         |      |                       |
                             +-------------------------+      +-----------------------+
                                        |                               |
                                        v                               v
                             +-------------------------+      +-----------------------+
                             |                         |      |                       |
                             |   Standardized Response | <--- |   Winston Logger      |
                             |   (Success / Error)     |      |   (JSON / Structured) |
                             |                         |      |                       |
                             +-------------------------+      +-----------------------+
```

## Tech Stack

- **Runtime**: Bun
- **Framework**: ElysiaJS
- **Database and ORM**: PostgreSQL (Supabase), Drizzle ORM
- **Validation**: TypeBox (`@sinclair/typebox`)
- **Testing**: Bun Test, PGlite (In-Memory DB)
- **Linting and Formatting**: Biome
- **Documentation**: TypeDoc, `@elysiajs/openapi`
- **Email Service**: Resend

## Quick Start

### Prerequisites
- Bun (version 1.x or later)
- Git
- PostgreSQL Database (e.g., Supabase)

### Installation and Configuration

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/dzuls-dev-studio-api.git
   cd dzuls-dev-studio-api
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy the environment template and configure values:
   ```bash
   cp .env.example .env
   ```
   Ensure `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MIDTRANS_SERVER_KEY`, and `RESEND_API_KEY` are properly configured.

4. Generate and apply database migrations, then seed initial data:
   ```bash
   bun run db:generate
   bun run db:migrate
   bun run db:seed
   ```
   The seed script creates one developer user (email: `developer@blackbox.local`, password: `developer123`).

5. Start the development server:
   ```bash
   bun run dev
   ```
   The server will be accessible at `http://localhost:3000`.

## Available Scripts

| Command | Description |
| :--- | :--- |
| `bun run dev` | Start development server with hot-reload. |
| `bun run build` | Compile project to JavaScript for production. |
| `bun run start` | Start production server from compiled output. |
| `bun run typecheck` | Execute strict TypeScript type checking. |
| `bun run lint` | Lint source code using Biome. |
| `bun run format` | Format source code using Biome. |
| `bun run test` | Execute unit, integration, and contract test suites. |
| `bun run test:coverage` | Execute tests with coverage reporting. |
| `bun run docs` | Generate API documentation using TypeDoc. |
| `bun run db:studio` | Launch Drizzle Studio for database inspection. |

## API Documentation

Interactive OpenAPI documentation is available at:
`http://localhost:3000/openapi`

## Testing

Automated testing is enforced to ensure system reliability. The tests use an ephemeral in-memory PostgreSQL database (PGlite) for blazing-fast execution.
```bash
bun run test
```

## Contribution

Refer to [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on coding standards, Git workflow, and pull request requirements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

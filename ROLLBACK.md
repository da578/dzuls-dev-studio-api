# Rollback Procedure: BlackBoxFreelanceAPI

This document outlines the steps to rollback the application in case of a critical failure in production.

## 1. Application Code Rollback (Cloudflare Workers)
If a newly deployed version contains critical bugs but **does not involve breaking database schema changes**:

1. Open the terminal and authenticate with Wrangler:
   ```bash
   bunx wrangler login
   ```
2. List the recent deployments to find the previous stable version ID:
   ```bash
   bunx wrangler deployments list
   ```
3. Rollback to the specific stable deployment ID:
   ```bash
   bunx wrangler rollback <DEPLOYMENT_ID>
   ```
4. Revert the problematic commit in the `main` branch on GitHub to ensure the next CI/CD run is stable.

## 2. Database Rollback (Drizzle ORM)
If a deployment included a bad database migration:

1. **Do not rollback the application code first** if the old code is incompatible with the new schema.
2. Locally, revert the schema changes in `src/db/schema.ts`.
3. Generate a new migration that reverts the changes:
   ```bash
   bun run db:generate
   ```
4. Commit and push the revert migration to the `main` branch.
5. The CI/CD pipeline will automatically apply the revert migration and deploy the reverted application code.

## 3. Emergency Secrets Rotation
If any secrets (e.g., `JWT_ACCESS_SECRET`, `DATABASE_URL`) are compromised:
1. Go to the Cloudflare Dashboard -> Workers & Pages -> `dzuls-dev-studio-api` -> Settings -> Variables.
2. Update the compromised secret.
3. Redeploy the worker to apply the new secrets:
   ```bash
   bunx wrangler deploy
   ```

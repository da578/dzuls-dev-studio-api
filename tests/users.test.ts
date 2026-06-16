import { beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { users } from "../src/db/schema";
import { app } from "../src/index";
import { setupTestDb, testDb } from "./setup";

/**
 * Integration tests for the Users module.
 *
 * @remarks
 * Tests user CRUD operations and RBAC enforcement, ensuring that only
 * users with the DEVELOPER role can access these endpoints.
 */
describe("Users Module Integration Tests", () => {
  let devToken = "";
  let clientToken = "";
  let targetUserId = "";

  beforeAll(async () => {
    await setupTestDb();
    await seedUsers();
  });

  async function seedUsers() {
    const devEmail = `dev_users_${Date.now()}@test.com`;
    const clientEmail = `client_users_${Date.now()}@test.com`;

    await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: devEmail, password: "password123" }),
      })
    );

    await testDb.update(users).set({ role: "DEVELOPER" }).where(eq(users.email, devEmail));

    const devLogin = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: devEmail, password: "password123" }),
      })
    );
    devToken = ((await devLogin.json()) as any).data.accessToken;

    const clientRes = await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail, password: "password123" }),
      })
    );
    clientToken = ((await clientRes.json()) as any).data.accessToken;
  }

  it("should reject CLIENT from accessing users list", async () => {
    const response = await app.handle(
      new Request("http://localhost/users/", {
        method: "GET",
        headers: { Authorization: `Bearer ${clientToken}` },
      })
    );
    expect(response.status).toBe(403);
  });

  it("should allow DEVELOPER to create a new user", async () => {
    const response = await app.handle(
      new Request("http://localhost/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${devToken}`,
        },
        body: JSON.stringify({
          email: `new_user_${Date.now()}@test.com`,
          password: "securepassword123",
          role: "CLIENT",
        }),
      })
    );

    const body = (await response.json()) as any;
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    targetUserId = body.data.id;
  });

  it("should allow DEVELOPER to get all users", async () => {
    const response = await app.handle(
      new Request("http://localhost/users/", {
        method: "GET",
        headers: { Authorization: `Bearer ${devToken}` },
      })
    );

    const body = (await response.json()) as any;
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("should allow DEVELOPER to get a user by ID", async () => {
    const response = await app.handle(
      new Request(`http://localhost/users/${targetUserId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${devToken}` },
      })
    );

    const body = (await response.json()) as any;
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(targetUserId);
  });

  it("should allow DEVELOPER to update a user", async () => {
    const response = await app.handle(
      new Request(`http://localhost/users/${targetUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${devToken}`,
        },
        body: JSON.stringify({
          role: "DEVELOPER",
        }),
      })
    );

    const body = (await response.json()) as any;
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.role).toBe("DEVELOPER");
  });

  it("should allow DEVELOPER to delete a user", async () => {
    const response = await app.handle(
      new Request(`http://localhost/users/${targetUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${devToken}` },
      })
    );

    const body = (await response.json()) as any;
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(targetUserId);

    const checkRes = await app.handle(
      new Request(`http://localhost/users/${targetUserId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${devToken}` },
      })
    );
    expect(checkRes.status).toBe(404);
  });
});

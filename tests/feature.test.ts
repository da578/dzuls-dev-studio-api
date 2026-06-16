import { beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { users } from "../src/db/schema";
import { app } from "../src/index";
import { setupTestDb, testDb } from "./setup";

/**
 * Integration tests for the Features module.
 *
 * @remarks
 * Tests feature creation, retrieval, and RBAC enforcement for CLIENT and DEVELOPER roles.
 */
describe("Features Module Integration Tests", () => {
  let devToken = "";
  let clientToken = "";
  let clientId = "";

  beforeAll(async () => {
    await setupTestDb();
    await seedUsers();
  });

  async function seedUsers() {
    const devEmail = `dev_${Date.now()}_${Math.random()}@test.com`;
    const clientEmail = `client_${Date.now()}_${Math.random()}@test.com`;

    const devRes = await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: devEmail,
          password: "password123",
        }),
      })
    );

    const devBody = (await devRes.json()) as any;
    devToken = devBody.data.accessToken;

    await testDb.update(users).set({ role: "DEVELOPER" }).where(eq(users.email, devEmail));

    const devLogin = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: devEmail,
          password: "password123",
        }),
      })
    );
    devToken = ((await devLogin.json()) as any).data.accessToken;

    const clientRes = await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: clientEmail,
          password: "password123",
        }),
      })
    );
    const clientBody = (await clientRes.json()) as any;
    clientToken = clientBody.data.accessToken;
    clientId = clientBody.data.user.id;
  }

  it("should allow DEVELOPER to create a feature", async () => {
    const response = await app.handle(
      new Request("http://localhost/features/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${devToken}`,
        },
        body: JSON.stringify({
          userId: clientId,
          title: "New API Endpoint",
          description: "Develop a new endpoint for testing",
          price: 500000,
          deadline: new Date().toISOString(),
        }),
      })
    );

    const body = (await response.json()) as any;
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("New API Endpoint");
  });

  it("should reject CLIENT from creating a feature", async () => {
    const response = await app.handle(
      new Request("http://localhost/features/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({
          userId: clientId,
          title: "Hacked Feature",
          description: "Client trying to create feature",
          price: 100,
          deadline: new Date().toISOString(),
        }),
      })
    );

    expect(response.status).toBe(403);
  });

  it("should allow CLIENT to view their own features", async () => {
    await app.handle(
      new Request("http://localhost/features/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${devToken}`,
        },
        body: JSON.stringify({
          userId: clientId,
          title: "Client Feature",
          description: "Desc for client feature",
          price: 100,
          deadline: new Date().toISOString(),
        }),
      })
    );

    const response = await app.handle(
      new Request("http://localhost/features/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.find((f: any) => f.title === "Client Feature")).toBeDefined();
  });

  it("should allow DEVELOPER to view all features", async () => {
    const response = await app.handle(
      new Request("http://localhost/features/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${devToken}`,
        },
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("should allow CLIENT to view specific feature they own", async () => {
    const listRes = await app.handle(
      new Request("http://localhost/features/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      })
    );
    const listBody = (await listRes.json()) as any;
    const featureId = listBody.data[0].id;

    const response = await app.handle(
      new Request(`http://localhost/features/${featureId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.data.id).toBe(featureId);
  });

  it("should reject CLIENT from viewing feature they do not own", async () => {
    const otherEmail = `other_${Date.now()}_${Math.random()}@test.com`;
    const otherClientRes = await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otherEmail,
          password: "password123",
        }),
      })
    );
    const otherClientToken = ((await otherClientRes.json()) as any).data.accessToken;

    const listRes = await app.handle(
      new Request("http://localhost/features/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      })
    );
    const listBody = (await listRes.json()) as any;
    const featureId = listBody.data[0].id;

    const response = await app.handle(
      new Request(`http://localhost/features/${featureId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${otherClientToken}`,
        },
      })
    );

    expect(response.status).toBe(403);
  });

  it("should return 404 for non-existent feature", async () => {
    const response = await app.handle(
      new Request(`http://localhost/features/00000000-0000-0000-0000-000000000000`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${devToken}`,
        },
      })
    );

    expect(response.status).toBe(404);
  });

  it("should allow DEVELOPER to update feature status to COMPLETED", async () => {
    const createRes = await app.handle(
      new Request("http://localhost/features/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${devToken}`,
        },
        body: JSON.stringify({
          userId: clientId,
          title: "Feature to Complete",
          description: "Desc for feature to complete",
          price: 100,
          deadline: new Date().toISOString(),
        }),
      })
    );
    const createBody = (await createRes.json()) as any;
    const feature = createBody.data;

    const response = await app.handle(
      new Request(`http://localhost/features/${feature.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${devToken}`,
        },
        body: JSON.stringify({
          status: "COMPLETED",
          version: feature.version,
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.data.status).toBe("COMPLETED");
    expect(body.data.version).toBe(feature.version + 1);
  });

  it("should reject update with mismatched version (Optimistic Locking)", async () => {
    const createRes = await app.handle(
      new Request("http://localhost/features/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${devToken}`,
        },
        body: JSON.stringify({
          userId: clientId,
          title: "Feature for Optimistic Locking",
          description: "Desc for feature",
          price: 100,
          deadline: new Date().toISOString(),
        }),
      })
    );
    const createBody = (await createRes.json()) as any;
    const feature = createBody.data;

    const response = await app.handle(
      new Request(`http://localhost/features/${feature.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${devToken}`,
        },
        body: JSON.stringify({
          status: "REVIEW",
          version: feature.version - 1,
        }),
      })
    );

    expect(response.status).toBe(409);
  });
});

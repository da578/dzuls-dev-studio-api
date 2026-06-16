import { beforeAll, describe, expect, it } from "bun:test";
import { app } from "../src";
import { setupTestDb } from "./setup";

/**
 * Integration tests for the Authentication module.
 *
 * @remarks
 * Tests user registration and login flows, ensuring proper validation,
 * database insertion, and error handling for duplicate emails.
 */
describe("Auth Module Integration Tests", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  it("should register a new client successfully", async () => {
    const email = `test_${Date.now()}_${Math.random()}@client.com`;
    const response = await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "securepassword123",
        }),
      })
    );

    const body = (await response.json()) as any;
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(email);
    expect(body.data.user.role).toBe("CLIENT");
    expect(body.data.accessToken).toBeDefined();
  });

  it("should fail to register with duplicate email", async () => {
    const email = `duplicate_${Date.now()}_${Math.random()}@client.com`;
    const payload = { email, password: "password123" };

    await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );

    const response = await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );

    const body = (await response.json()) as any;
    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("should fail to login with invalid credentials", async () => {
    const email = `test_${Date.now()}_${Math.random()}@client.com`;
    await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "securepassword123",
        }),
      })
    );

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "wrongpassword",
        }),
      })
    );
    expect(response.status).toBe(401);
  });

  it("should fail to login with non-existent email", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `nonexistent_${Date.now()}_${Math.random()}@client.com`,
          password: "password123",
        }),
      })
    );
    expect(response.status).toBe(401);
  });

  it("should login successfully and return tokens", async () => {
    const email = `test_${Date.now()}_${Math.random()}@client.com`;
    await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "securepassword123",
        }),
      })
    );

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "securepassword123",
        }),
      })
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  it("should refresh token successfully", async () => {
    const email = `test_${Date.now()}_${Math.random()}@client.com`;
    await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "securepassword123",
        }),
      })
    );

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "securepassword123",
        }),
      })
    );
    const loginBody = (await loginRes.json()) as any;
    const refreshToken = loginBody.data.refreshToken;

    const refreshRes = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
    );
    expect(refreshRes.status).toBe(200);
    const refreshBody = (await refreshRes.json()) as any;
    expect(refreshBody.data.accessToken).toBeDefined();
  });

  it("should fail to refresh with invalid token", async () => {
    const refreshRes = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: "invalid-token" }),
      })
    );
    expect(refreshRes.status).toBe(401);
  });

  it("should get current user profile", async () => {
    const email = `test_${Date.now()}_${Math.random()}@client.com`;
    await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "securepassword123",
        }),
      })
    );

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "securepassword123",
        }),
      })
    );
    const loginBody = (await loginRes.json()) as any;
    const accessToken = loginBody.data.accessToken;

    const meRes = await app.handle(
      new Request("http://localhost/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );
    expect(meRes.status).toBe(200);
    const meBody = (await meRes.json()) as any;
    expect(meBody.data.email).toBe(email);
  });

  it("should logout successfully and revoke token", async () => {
    const email = `logout_test_${Date.now()}@client.com`;

    await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "securepassword123" }),
      })
    );

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "securepassword123" }),
      })
    );
    const loginBody = (await loginRes.json()) as any;
    const accessToken = loginBody.data.accessToken;

    const meRes1 = await app.handle(
      new Request("http://localhost/auth/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    );
    expect(meRes1.status).toBe(200);

    const logoutRes = await app.handle(
      new Request("http://localhost/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    );
    expect(logoutRes.status).toBe(200);

    const meRes2 = await app.handle(
      new Request("http://localhost/auth/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    );
    expect(meRes2.status).toBe(401);

    const meBody2 = (await meRes2.json()) as any;
    expect(meBody2.error.message).toContain("revoked");
  });
});

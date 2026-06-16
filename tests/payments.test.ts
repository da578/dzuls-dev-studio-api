import { beforeAll, describe, expect, it } from "bun:test";
import { features, payments, users } from "../src/db/schema";
import { app } from "../src/index";
import { setupTestDb, testDb } from "./setup";

/**
 * Integration tests for the Payments module.
 *
 * @remarks
 * Tests webhook processing, signature verification, and idempotency enforcement.
 */
describe("Payments Webhook & Idempotency Tests", () => {
  let paymentId = "";

  beforeAll(async () => {
    await setupTestDb();
  });

  async function seedPayment() {
    const uniqueEmail = `payer_${Date.now()}_${Math.random()}@test.com`;
    const [user] = await testDb
      .insert(users)
      .values({
        email: uniqueEmail,
        passwordHash: "hash",
        role: "CLIENT",
      })
      .returning();

    const [feature] = await testDb
      .insert(features)
      .values({
        userId: user.id,
        title: "Test Feature",
        description: "Desc",
        price: 10000,
        deadline: new Date(),
      })
      .returning();

    const [payment] = await testDb
      .insert(payments)
      .values({
        userId: user.id,
        featureId: feature.id,
        amount: 10000,
      })
      .returning();

    paymentId = payment.id;
  }

  it("should process valid webhook and enforce idempotency", async () => {
    await seedPayment();

    const payload = {
      order_id: paymentId,
      transaction_status: "settlement",
      status_code: "200",
      gross_amount: "10000.00",
      signature_key: "",
    };

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const hasher = new Bun.CryptoHasher("sha512");

    hasher.update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`);
    payload.signature_key = hasher.digest("hex");
    const idempotencyKey = `idemp-key-${Date.now()}-${Math.random()}`;

    const res1 = await app.handle(
      new Request("http://localhost/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      })
    );

    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as any;
    expect(body1.data.status).toBe("processed");

    const res2 = await app.handle(
      new Request("http://localhost/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      })
    );

    expect(res2.status).toBe(200);
    const body2 = (await res2.json()) as any;
    expect(body2.data).toEqual(body1.data);

    const payload3 = { ...payload, gross_amount: "20000.00" };
    const hasher3 = new Bun.CryptoHasher("sha512");
    hasher3.update(
      `${payload3.order_id}${payload3.status_code}${payload3.gross_amount}${serverKey}`
    );
    payload3.signature_key = hasher3.digest("hex");

    const res3 = await app.handle(
      new Request("http://localhost/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload3),
      })
    );

    expect(res3.status).toBe(409);
  });

  it("should return 404 for non-existent payment order", async () => {
    const payload = {
      order_id: "00000000-0000-0000-0000-000000000000",
      transaction_status: "settlement",
      status_code: "200",
      gross_amount: "10000.00",
      signature_key: "",
    };

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const hasher = new Bun.CryptoHasher("sha512");
    hasher.update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`);
    payload.signature_key = hasher.digest("hex");

    const res = await app.handle(
      new Request("http://localhost/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `idemp-not-found-${Date.now()}`,
        },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(404);
  });

  it("should process FAILED transaction status", async () => {
    await seedPayment();

    const payload = {
      order_id: paymentId,
      transaction_status: "cancel",
      status_code: "200",
      gross_amount: "10000.00",
      signature_key: "",
    };

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const hasher = new Bun.CryptoHasher("sha512");
    hasher.update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`);
    payload.signature_key = hasher.digest("hex");

    const res = await app.handle(
      new Request("http://localhost/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `idemp-cancel-${Date.now()}`,
        },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.message).toContain("FAILED");
  });

  it("should process EXPIRED transaction status", async () => {
    await seedPayment();

    const payload = {
      order_id: paymentId,
      transaction_status: "expire",
      status_code: "200",
      gross_amount: "10000.00",
      signature_key: "",
    };

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const hasher = new Bun.CryptoHasher("sha512");
    hasher.update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`);
    payload.signature_key = hasher.digest("hex");

    const res = await app.handle(
      new Request("http://localhost/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `idemp-expire-${Date.now()}`,
        },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.message).toContain("EXPIRED");
  });
});

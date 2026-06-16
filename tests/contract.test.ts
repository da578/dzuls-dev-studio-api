import { beforeAll, describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { type App, app } from "../src/index";
import { setupTestDb } from "./setup";

/**
 * Contract Tests using Eden Treaty.
 *
 * @remarks
 * Validates that the API responses strictly adhere to the TypeBox schemas
 * defined in the application, ensuring OpenAPI documentation matches runtime behavior.
 */
describe("API Contract Tests (Eden Treaty)", () => {
  const api = treaty<App>(app, { parseDate: false });

  beforeAll(async () => {
    await setupTestDb();
  });

  it("should adhere to the health check contract", async () => {
    const { data, error, status } = await api.health.get();

    expect(status).toBe(200);
    expect(error).toBeNull();

    expect(data?.success).toBe(true);
    expect(data?.data.status).toBe("ok");
    expect(typeof data?.data.timestamp).toBe("string");
  });

  it("should adhere to the validation error contract", async () => {
    const { data, error, status } = await api.auth.register.post({
      email: "invalid-email",
      password: "short",
    });

    expect(status).toBe(422);
    expect(data).toBeNull();

    const errVal = (error as any)?.value ?? error;
    expect(errVal?.success).toBe(false);
    expect(errVal?.error?.code).toBe("VALIDATION_ERROR");
    expect(errVal?.error?.details).toBeDefined();
  });
});

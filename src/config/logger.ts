/**
 * Global Logger interface compatible with Cloudflare Workers and local environments.
 *
 * @remarks
 * Winston is not compatible with Cloudflare Workers due to Node.js stream/fs dependencies.
 * This lightweight implementation ensures structured JSON logging works seamlessly
 * in both serverless (Cloudflare) and local environments without external dependencies.
 *
 * @public
 */
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message,
        ...meta,
      })
    );
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        message,
        ...meta,
      })
    );
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message,
        ...meta,
      })
    );
  },
};

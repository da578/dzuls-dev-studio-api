/**
 * Platform-agnostic cryptographic utilities using the Web Crypto API.
 *
 * @remarks
 * These utilities are compatible with both Bun and Cloudflare Workers (workerd),
 * avoiding any runtime-specific APIs like `Bun.password` or `Bun.CryptoHasher`.
 *
 * @public
 */

/**
 * Hashes a password using PBKDF2 with SHA-256.
 *
 * @param password - The plain-text password to hash.
 * @param providedSalt - Optional salt to use (for verification).
 * @returns A promise that resolves to the combined salt and hash string.
 *
 * @public
 */
export async function hashPassword(
  password: string,
  providedSalt?: Uint8Array<ArrayBuffer>
): Promise<string> {
  const encoder = new TextEncoder();
  const salt =
    providedSalt || (crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exportedKey = (await crypto.subtle.exportKey("raw", key)) as ArrayBuffer;
  const hashBuffer = new Uint8Array(exportedKey);
  const hashArray = Array.from(hashBuffer);
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${saltHex}:${hashHex}`;
}

/**
 * Verifies a plain-text password against a stored hash.
 *
 * @param passwordAttempt - The plain-text password attempt.
 * @param storedHash - The stored salt and hash string.
 * @returns A promise that resolves to `true` if the password is valid, otherwise `false`.
 *
 * @public
 */
export async function verifyPassword(
  passwordAttempt: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [saltHex] = parts;
  const saltMatch = saltHex.match(/.{1,2}/g);
  if (!saltMatch) return false;
  const salt = new Uint8Array(
    saltMatch.map((byte) => parseInt(byte, 16))
  ) as Uint8Array<ArrayBuffer>;
  const attemptHash = await hashPassword(passwordAttempt, salt);
  return attemptHash === storedHash;
}

/**
 * Generates a SHA-256 hash of a message.
 *
 * @param message - The message to hash.
 * @returns A promise that resolves to the hex-encoded hash.
 *
 * @public
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a SHA-512 hash of a message.
 *
 * @param message - The message to hash.
 * @returns A promise that resolves to the hex-encoded hash.
 *
 * @public
 */
export async function sha512(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-512", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Studio password hashing.
//
// New hashes use salted scrypt from Node's built-in crypto module and are
// stored as a single colon-separated string (no "$", so the value is safe in
// .env files, shells, and docker-compose without quoting):
//
//   scrypt:<N>:<r>:<p>:<salt base64url>:<key base64url>
//
// Legacy values (a bare 64-character SHA-256 hex digest, as documented by
// earlier versions of this template) still verify, and `needsRehash` reports
// them so the server can upgrade them on the next successful login.

import crypto from "node:crypto";

const PREFIX = "scrypt";
const DEFAULT_PARAMS = Object.freeze({ N: 16384, r: 8, p: 1, keyLength: 64, saltLength: 16 });
const LEGACY_SHA256 = /^[a-f0-9]{64}$/i;

function scryptAsync(password, salt, keyLength, { N, r, p }) {
  return new Promise((resolve, reject) => {
    // maxmem must cover 128 * N * r bytes; give it headroom for larger N.
    const maxmem = Math.max(32 * 1024 * 1024, 256 * N * r);
    crypto.scrypt(password, salt, keyLength, { N, r, p, maxmem }, (error, key) => {
      if (error) {
        reject(error);
      } else {
        resolve(key);
      }
    });
  });
}

export function isScryptHash(value) {
  return typeof value === "string" && value.startsWith(`${PREFIX}:`) && value.split(":").length === 6;
}

export function isLegacySha256Hash(value) {
  return typeof value === "string" && LEGACY_SHA256.test(value.trim());
}

export async function hashPassword(password, params = {}) {
  const { N, r, p, keyLength, saltLength } = { ...DEFAULT_PARAMS, ...params };
  const salt = crypto.randomBytes(saltLength);
  const key = await scryptAsync(String(password), salt, keyLength, { N, r, p });
  return [PREFIX, N, r, p, salt.toString("base64url"), key.toString("base64url")].join(":");
}

function parseScryptHash(value) {
  const [prefix, N, r, p, salt, key] = value.split(":");
  const parsed = {
    prefix,
    N: Number(N),
    r: Number(r),
    p: Number(p),
    salt: Buffer.from(salt || "", "base64url"),
    key: Buffer.from(key || "", "base64url"),
  };
  const validNumbers = [parsed.N, parsed.r, parsed.p].every((item) => Number.isInteger(item) && item > 0);
  // N must be a power of two; cap it so a hostile value cannot exhaust memory.
  const validN = validNumbers && (parsed.N & (parsed.N - 1)) === 0 && parsed.N <= 2 ** 20;
  if (prefix !== PREFIX || !validN || parsed.salt.length < 8 || parsed.key.length < 16) {
    return null;
  }
  return parsed;
}

function safeEqualBuffers(left, right) {
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/**
 * Verify a password against a stored hash. Accepts scrypt hashes and legacy
 * unsalted SHA-256 hex digests. Unknown formats never verify.
 */
export async function verifyPassword(password, storedHash) {
  const stored = String(storedHash || "").trim();
  if (!stored) {
    return false;
  }

  if (isScryptHash(stored)) {
    const parsed = parseScryptHash(stored);
    if (!parsed) {
      return false;
    }
    const key = await scryptAsync(String(password), parsed.salt, parsed.key.length, parsed);
    return safeEqualBuffers(key, parsed.key);
  }

  if (isLegacySha256Hash(stored)) {
    const digest = crypto.createHash("sha256").update(String(password)).digest();
    return safeEqualBuffers(digest, Buffer.from(stored.toLowerCase(), "hex"));
  }

  return false;
}

/** True when a stored hash should be replaced by a fresh scrypt hash. */
export function needsRehash(storedHash, params = {}) {
  const stored = String(storedHash || "").trim();
  if (!isScryptHash(stored)) {
    return true;
  }
  const parsed = parseScryptHash(stored);
  const wanted = { ...DEFAULT_PARAMS, ...params };
  return !parsed || parsed.N < wanted.N || parsed.r < wanted.r || parsed.p < wanted.p;
}

export const passwordDefaults = DEFAULT_PARAMS;

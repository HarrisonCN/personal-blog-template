import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { hashPassword, isScryptHash, needsRehash, verifyPassword } from "../server/lib/password.js";
import { FAST_SCRYPT } from "./helpers.js";

test("scrypt hashes are salted and verify", async () => {
  const first = await hashPassword("s3cret!", FAST_SCRYPT);
  const second = await hashPassword("s3cret!", FAST_SCRYPT);
  assert.ok(isScryptHash(first));
  assert.notEqual(first, second, "two hashes of the same password must differ (salt)");
  assert.equal(first.includes("$"), false, "hash must be safe to paste into .env without quoting");
  assert.equal(await verifyPassword("s3cret!", first), true);
  assert.equal(await verifyPassword("wrong", first), false);
});

test("legacy unsalted SHA-256 hashes still verify and need a rehash", async () => {
  const legacy = crypto.createHash("sha256").update("old-password").digest("hex");
  assert.equal(await verifyPassword("old-password", legacy), true);
  assert.equal(await verifyPassword("old-password", legacy.toUpperCase()), true);
  assert.equal(await verifyPassword("nope", legacy), false);
  assert.equal(needsRehash(legacy), true);
});

test("weaker scrypt parameters need a rehash, defaults do not", async () => {
  assert.equal(needsRehash(await hashPassword("x", FAST_SCRYPT)), true);
  assert.equal(needsRehash(await hashPassword("x")), false);
});

test("malformed hashes never verify", async () => {
  for (const value of ["", "plain-text", "scrypt:3:8:1:abc:def", "scrypt:16384:8:1::", "scrypt:4194304:8:1:AAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAA"]) {
    assert.equal(await verifyPassword("x", value), false, value);
  }
});

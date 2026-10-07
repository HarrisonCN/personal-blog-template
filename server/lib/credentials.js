// Resolves the studio credential from the environment and keeps an upgraded
// (scrypt) copy in the runtime data directory once a legacy hash or plain
// password has been used to log in successfully.
//
// Environment (in order of precedence):
//   STUDIO_PASSWORD_HASH  scrypt hash from `npm run hash-password`, or a legacy SHA-256 hex digest
//   STUDIO_PASSWORD       plain password (hashed with scrypt in memory at startup)
//
// When the configured value is a legacy SHA-256 digest, the first successful
// login writes server/data/auth.json with a scrypt hash of the same password.
// auth.json also records a scrypt fingerprint of the env value it came from, so
// changing STUDIO_PASSWORD_HASH / STUDIO_PASSWORD later invalidates the upgrade
// automatically and the new env value takes effect.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashPassword, isLegacySha256Hash, isScryptHash, needsRehash, verifyPassword } from "./password.js";

function safeEqualText(left, right) {
  const leftDigest = crypto.createHash("sha256").update(String(left)).digest();
  const rightDigest = crypto.createHash("sha256").update(String(right)).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tempFile = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(tempFile, file);
}

export function createCredentialManager({ dataDir, username, password = "", passwordHash = "", hashParams, logger = console }) {
  const authFile = path.join(dataDir, "auth.json");
  const configuredHash = String(passwordHash || "").trim();
  // The value the active credential is derived from; used to detect env changes.
  const sourceValue = configuredHash ? `hash:${configuredHash}` : `plain:${password}`;
  let activeHash = "";
  let ready = null;

  if (configuredHash && !isScryptHash(configuredHash) && !isLegacySha256Hash(configuredHash)) {
    logger.warn("[studio] STUDIO_PASSWORD_HASH is not a recognised scrypt or SHA-256 hash; studio login will fail.");
  } else if (isLegacySha256Hash(configuredHash)) {
    logger.warn("[studio] STUDIO_PASSWORD_HASH uses legacy unsalted SHA-256. It will be upgraded to scrypt on the next login; run `npm run hash-password` to replace it.");
  }

  async function readUpgradedHash() {
    try {
      const saved = JSON.parse(fs.readFileSync(authFile, "utf8"));
      if (isScryptHash(saved?.passwordHash) && saved?.source && (await verifyPassword(sourceValue, saved.source))) {
        return saved.passwordHash;
      }
    } catch {}
    return "";
  }

  async function init() {
    const upgraded = await readUpgradedHash();
    if (upgraded) {
      activeHash = upgraded;
    } else if (configuredHash) {
      activeHash = configuredHash;
    } else {
      activeHash = await hashPassword(password, hashParams);
    }
  }

  function whenReady() {
    if (!ready) {
      ready = init();
    }
    return ready;
  }

  async function upgrade(plainPassword) {
    const nextHash = await hashPassword(plainPassword, hashParams);
    const source = await hashPassword(sourceValue, hashParams);
    try {
      writeJsonAtomic(authFile, { version: 1, passwordHash: nextHash, source, upgradedAt: new Date().toISOString() });
      activeHash = nextHash;
      logger.log("[studio] Upgraded the studio password hash to scrypt (server/data/auth.json).");
    } catch (error) {
      // Keep working with the old hash if the data dir is read-only.
      logger.warn(`[studio] Could not persist upgraded password hash: ${error.message}`);
    }
  }

  async function verify(inputUsername, inputPassword) {
    await whenReady();
    // Always run the password check so a wrong username costs the same time.
    const validPassword = await verifyPassword(String(inputPassword), activeHash);
    const validUsername = safeEqualText(String(inputUsername), String(username));
    if (!validPassword || !validUsername) {
      return false;
    }
    if (needsRehash(activeHash, hashParams)) {
      await upgrade(String(inputPassword));
    }
    return true;
  }

  return {
    verify,
    whenReady,
    get activeHash() {
      return activeHash;
    },
    authFile,
  };
}

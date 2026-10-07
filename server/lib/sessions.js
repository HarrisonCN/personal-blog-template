// File-backed studio sessions that survive a server restart.
//
// Session ids are only kept as SHA-256 digests on disk, so a leaked
// sessions.json cannot be replayed as a cookie. Each session has a sliding
// idle timeout and an absolute lifetime cap.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PERSIST_TOUCH_MS = 60 * 1000;

function digest(sessionId) {
  return crypto.createHash("sha256").update(String(sessionId)).digest("hex");
}

export function createSessionStore({ file, idleMs, absoluteMs, now = () => Date.now(), logger = console }) {
  const sessions = new Map();

  function load() {
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      const entries = Array.isArray(raw?.sessions) ? raw.sessions : [];
      const current = now();
      for (const entry of entries) {
        if (typeof entry?.key === "string" && Number(entry.expiresAt) > current && Number(entry.absoluteExpiresAt) > current) {
          sessions.set(entry.key, {
            username: String(entry.username || ""),
            createdAt: Number(entry.createdAt) || current,
            expiresAt: Number(entry.expiresAt),
            absoluteExpiresAt: Number(entry.absoluteExpiresAt),
            persistedExpiresAt: Number(entry.expiresAt),
          });
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        logger.warn(`[studio] Ignoring unreadable session file: ${error.message}`);
      }
    }
  }

  function persist() {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const payload = {
        version: 1,
        sessions: [...sessions.entries()].map(([key, value]) => ({
          key,
          username: value.username,
          createdAt: value.createdAt,
          expiresAt: value.expiresAt,
          absoluteExpiresAt: value.absoluteExpiresAt,
        })),
      };
      const tempFile = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), { mode: 0o600 });
      fs.renameSync(tempFile, file);
      for (const value of sessions.values()) {
        value.persistedExpiresAt = value.expiresAt;
      }
    } catch (error) {
      logger.warn(`[studio] Could not persist sessions: ${error.message}`);
    }
  }

  function cleanup() {
    const current = now();
    let removed = false;
    for (const [key, value] of sessions.entries()) {
      if (value.expiresAt <= current || value.absoluteExpiresAt <= current) {
        sessions.delete(key);
        removed = true;
      }
    }
    if (removed) {
      persist();
    }
  }

  function create(username) {
    cleanup();
    const sessionId = crypto.randomBytes(32).toString("hex");
    const current = now();
    const absoluteExpiresAt = current + absoluteMs;
    sessions.set(digest(sessionId), {
      username: String(username),
      createdAt: current,
      expiresAt: Math.min(current + idleMs, absoluteExpiresAt),
      absoluteExpiresAt,
      persistedExpiresAt: 0,
    });
    persist();
    return sessionId;
  }

  /** Returns the live session (sliding its idle expiry), or null. */
  function touch(sessionId) {
    if (!sessionId) {
      return null;
    }
    const key = digest(sessionId);
    const session = sessions.get(key);
    const current = now();
    if (!session) {
      return null;
    }
    if (session.expiresAt <= current || session.absoluteExpiresAt <= current) {
      sessions.delete(key);
      persist();
      return null;
    }
    session.expiresAt = Math.min(current + idleMs, session.absoluteExpiresAt);
    if (session.expiresAt - session.persistedExpiresAt >= PERSIST_TOUCH_MS) {
      persist();
    }
    return { username: session.username, expiresAt: session.expiresAt, absoluteExpiresAt: session.absoluteExpiresAt };
  }

  function destroy(sessionId) {
    if (sessionId && sessions.delete(digest(sessionId))) {
      persist();
    }
  }

  function size() {
    return sessions.size;
  }

  load();
  return { create, touch, destroy, cleanup, size, persist };
}

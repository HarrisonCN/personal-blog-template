import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/app.js";

export const FAST_SCRYPT = { N: 1024, r: 8, p: 1 };

export function tempDir(prefix = "blog-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Start the app on an ephemeral port. Returns { url, close, request, dataDir }. */
export async function startServer({ env = {}, dataDir = tempDir(), distDir, hashParams = FAST_SCRYPT } = {}) {
  const logger = { log() {}, warn() {}, error() {} };
  const app = createApp({
    env: { STUDIO_USERNAME: "ADMIN", STUDIO_PASSWORD: "correct horse", SESSION_SECRET: "test-secret", ...env },
    dataDir,
    distDir: distDir ?? path.join(dataDir, "no-dist"),
    hashParams,
    logger,
  });
  await app.locals.ready;
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";

  async function request(pathname, { method = "GET", body, headers = {}, useCookie = true } = {}) {
    const response = await fetch(`${url}${pathname}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(useCookie && cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie && useCookie) {
      const pair = setCookie.split(";")[0];
      cookie = pair.endsWith("=") ? "" : pair;
    }
    const type = response.headers.get("content-type") || "";
    const payload = type.includes("json") ? await response.json() : await response.text();
    return { status: response.status, headers: response.headers, body: payload };
  }

  return {
    url,
    dataDir,
    app,
    request,
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      cookie = value;
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export async function login(server, username = "ADMIN", password = "correct horse") {
  return server.request("/api/studio/login", { method: "POST", body: { username, password } });
}

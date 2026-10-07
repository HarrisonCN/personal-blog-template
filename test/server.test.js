import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { isScryptHash } from "../server/lib/password.js";
import { createSessionStore } from "../server/lib/sessions.js";
import { login, startServer, tempDir } from "./helpers.js";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

test("login, session check and logout", async () => {
  const server = await startServer();
  try {
    assert.equal((await server.request("/api/studio/session")).body.authenticated, false);
    assert.equal((await login(server, "ADMIN", "wrong")).status, 401);
    const ok = await login(server);
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get("set-cookie"), /HttpOnly; SameSite=Strict; Max-Age=\d+/);
    assert.equal((await server.request("/api/studio/session")).body.authenticated, true);
    await server.request("/api/studio/logout", { method: "POST", body: {} });
    assert.equal((await server.request("/api/studio/session")).body.authenticated, false);
  } finally {
    await server.close();
  }
});

test("sessions survive a restart and session ids are not stored in clear", async () => {
  const dataDir = tempDir();
  const first = await startServer({ dataDir });
  await login(first);
  const cookie = first.cookie;
  await first.close();

  const raw = fs.readFileSync(path.join(dataDir, "sessions.json"), "utf8");
  const sessionId = decodeURIComponent(cookie.split("=")[1]).split(".")[0];
  assert.equal(raw.includes(sessionId), false, "raw session id must not be written to disk");

  const second = await startServer({ dataDir });
  try {
    second.cookie = cookie;
    assert.equal((await second.request("/api/studio/session")).body.authenticated, true);
  } finally {
    await second.close();
  }
});

test("a changed SESSION_SECRET invalidates existing cookies", async () => {
  const dataDir = tempDir();
  const first = await startServer({ dataDir });
  await login(first);
  const cookie = first.cookie;
  await first.close();
  const second = await startServer({ dataDir, env: { SESSION_SECRET: "rotated" } });
  try {
    second.cookie = cookie;
    assert.equal((await second.request("/api/studio/session")).body.authenticated, false);
  } finally {
    await second.close();
  }
});

test("session store enforces idle and absolute expiry", () => {
  const dir = tempDir();
  let clock = 1_000_000;
  const store = createSessionStore({ file: path.join(dir, "s.json"), idleMs: 1000, absoluteMs: 2500, now: () => clock, logger: { warn() {} } });
  const id = store.create("ADMIN");
  clock += 900;
  assert.ok(store.touch(id), "touch inside idle window keeps the session");
  clock += 900;
  assert.ok(store.touch(id), "sliding expiry");
  clock += 900; // 2700 > absolute cap of 2500
  assert.equal(store.touch(id), null, "absolute lifetime is enforced");
  const idle = store.create("ADMIN");
  clock += 1500;
  assert.equal(store.touch(idle), null, "idle timeout is enforced");
  assert.equal(store.size(), 0);
});

test("legacy SHA-256 env hash logs in and is upgraded to scrypt", async () => {
  const dataDir = tempDir();
  const env = { STUDIO_PASSWORD_HASH: sha256("legacy pass") };
  const server = await startServer({ dataDir, env });
  try {
    assert.equal((await login(server, "ADMIN", "legacy pass")).status, 200);
    const auth = JSON.parse(fs.readFileSync(path.join(dataDir, "auth.json"), "utf8"));
    assert.ok(isScryptHash(auth.passwordHash));
    assert.equal(server.app.locals.credentials.activeHash, auth.passwordHash);
    assert.equal(JSON.stringify(auth).includes(env.STUDIO_PASSWORD_HASH), false);
  } finally {
    await server.close();
  }

  // Same env: the upgraded hash is used after restart.
  const again = await startServer({ dataDir, env });
  try {
    assert.ok(isScryptHash(again.app.locals.credentials.activeHash));
    assert.equal((await login(again, "ADMIN", "legacy pass")).status, 200);
  } finally {
    await again.close();
  }

  // Changed env: the old upgrade is ignored and the new password works.
  const changed = await startServer({ dataDir, env: { STUDIO_PASSWORD_HASH: sha256("new pass") } });
  try {
    assert.equal((await login(changed, "ADMIN", "legacy pass")).status, 401);
    assert.equal((await login(changed, "ADMIN", "new pass")).status, 200);
  } finally {
    await changed.close();
  }
});

test("lockout after repeated failures", async () => {
  const server = await startServer();
  try {
    for (let attempt = 1; attempt < 5; attempt += 1) {
      assert.equal((await login(server, "ADMIN", "bad")).status, 401);
    }
    const locked = await login(server, "ADMIN", "bad");
    assert.equal(locked.status, 429);
    assert.equal((await login(server)).status, 429, "even the right password is refused while locked");
  } finally {
    await server.close();
  }
});

test("studio writes require auth and a same-origin request", async () => {
  const server = await startServer();
  try {
    assert.equal((await server.request("/api/studio/articles", { method: "POST", body: { article: { slug: "x" } } })).status, 401);
    await login(server);
    const crossOrigin = await server.request("/api/studio/articles", { method: "POST", body: { article: { slug: "x" } }, headers: { Origin: "https://evil.example" } });
    assert.equal(crossOrigin.status, 403);
  } finally {
    await server.close();
  }
});

test("article and project slugs are sanitised and never duplicated", async () => {
  const server = await startServer();
  try {
    await login(server);
    const article = (slug, title = "Hello") => ({ slug, title: { en: title }, excerpt: { en: "e" }, content: { en: "c" } });

    const first = await server.request("/api/studio/articles", { method: "POST", body: { article: article("Hello World!") } });
    assert.equal(first.body.slug, "hello-world");
    const second = await server.request("/api/studio/articles", { method: "POST", body: { article: article("hello-world") } });
    assert.equal(second.body.slug, "hello-world-2");
    assert.equal(second.body.slugChanged, true);

    // Renaming an article onto an existing slug is suffixed instead of overwriting it.
    const renamed = await server.request("/api/studio/articles", { method: "POST", body: { article: article("hello-world"), previousSlug: "hello-world-2" } });
    assert.equal(renamed.body.slug, "hello-world-2");
    // Editing in place keeps the slug.
    const edited = await server.request("/api/studio/articles", { method: "POST", body: { article: article("hello-world", "Edited"), previousSlug: "hello-world" } });
    assert.equal(edited.body.slug, "hello-world");
    const slugs = edited.body.articles.map((item) => item.slug);
    assert.equal(new Set(slugs).size, slugs.length, "no duplicate slugs");
    assert.equal(edited.body.articles.find((item) => item.slug === "hello-world").title.en, "Edited");

    const p1 = await server.request("/api/studio/projects", { method: "POST", body: { project: { slug: "proj", title: "P" } } });
    const p2 = await server.request("/api/studio/projects", { method: "POST", body: { project: { slug: "proj", title: "P" } } });
    assert.equal(p1.body.slug, "proj");
    assert.equal(p2.body.slug, "proj-2");
    const fromTitle = await server.request("/api/studio/projects", { method: "POST", body: { project: { slug: "", title: "Shiny Thing" } } });
    assert.equal(fromTitle.body.slug, "shiny-thing");
  } finally {
    await server.close();
  }
});

test("RSS, sitemap and robots are served from the store", async () => {
  const server = await startServer({ env: { SITE_URL: "https://blog.example.com", SITE_LANGUAGE: "en" } });
  try {
    const rss = await server.request("/rss.xml");
    assert.equal(rss.status, 200);
    assert.match(rss.headers.get("content-type"), /application\/rss\+xml/);
    assert.ok(rss.body.includes("<link>https://blog.example.com/articles/why-personal-sites-need-direction</link>"));
    assert.ok(rss.body.includes("Why Personal Sites Need a Clear Visual Direction"));
    assert.equal((await server.request("/feed.xml")).status, 200);

    const sitemap = await server.request("/sitemap.xml");
    assert.match(sitemap.headers.get("content-type"), /application\/xml/);
    assert.ok(sitemap.body.includes("<loc>https://blog.example.com/</loc>"));

    const robots = await server.request("/robots.txt");
    assert.ok(robots.body.includes("Sitemap: https://blog.example.com/sitemap.xml"));
  } finally {
    await server.close();
  }
});

test("article share URLs get per-article SEO meta", async () => {
  const dataDir = tempDir();
  const distDir = path.join(dataDir, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    path.join(distDir, "index.html"),
    '<!doctype html><html><head><title>Shell</title><meta name="description" content="shell" /><script type="module" src="./assets/index.js"></script></head><body><div id="root"></div></body></html>'
  );
  const server = await startServer({ dataDir, distDir, env: { SITE_URL: "https://blog.example.com/", SITE_LANGUAGE: "en" } });
  try {
    const page = await server.request("/articles/why-personal-sites-need-direction");
    assert.equal(page.status, 200);
    assert.ok(page.body.includes("<title>Why Personal Sites Need a Clear Visual Direction / "));
    assert.ok(page.body.includes('<meta property="og:type" content="article" />'));
    assert.ok(page.body.includes('<link rel="canonical" href="https://blog.example.com/articles/why-personal-sites-need-direction" />'));
    assert.ok(page.body.includes('"@type":"BlogPosting"'));
    assert.ok(page.body.includes('"timeRequired":"PT6M"'), "manual readTime of the seed article becomes timeRequired");
    assert.ok(page.body.includes('src="/assets/index.js"'), "asset paths are absolute on nested routes");
    assert.equal((page.body.match(/name="description"/g) || []).length, 1);

    // An article without a manual readTime gets an estimate from its body.
    const fresh = await startServer({ dataDir, distDir, env: { SITE_URL: "https://blog.example.com/", SITE_LANGUAGE: "en" } });
    try {
      await login(fresh);
      const body = Array.from({ length: 660 }, (_, i) => `w${i}`).join(" ");
      await fresh.request("/api/studio/articles", { method: "POST", body: { article: { slug: "auto-time", title: { en: "Auto" }, content: { en: body } } } });
      assert.ok((await fresh.request("/articles/auto-time")).body.includes('"timeRequired":"PT3M"'));
    } finally {
      await fresh.close();
    }

    assert.equal((await server.request("/articles/does-not-exist")).status, 404);
    const home = await server.request("/");
    assert.equal(home.status, 200);
    assert.ok(home.body.includes('type="application/rss+xml"'));
    assert.equal((await server.request("/api/nope")).status, 404);
  } finally {
    await server.close();
  }
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { parseTrustProxy } from "../server/app.js";
import { login, startServer, tempDir } from "./helpers.js";

test("parseTrustProxy maps env strings onto Express trust proxy values", () => {
  assert.equal(parseTrustProxy(undefined), "loopback");
  assert.equal(parseTrustProxy(""), "loopback");
  assert.equal(parseTrustProxy("true"), true);
  assert.equal(parseTrustProxy("false"), false);
  assert.equal(parseTrustProxy("1"), 1);
  assert.equal(parseTrustProxy("10.0.0.0/8"), "10.0.0.0/8");
});

test("every response carries the security headers", async () => {
  const server = await startServer();
  try {
    const response = await server.request("/api/health");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true, studioAvailable: true });
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("referrer-policy"), "same-origin");
    assert.equal(response.headers.get("x-powered-by"), null);
    const csp = response.headers.get("content-security-policy");
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
  } finally {
    await server.close();
  }
});

test("bootstrap returns the seeded store without studio auth", async () => {
  const server = await startServer();
  try {
    const { status, body } = await server.request("/api/bootstrap");
    assert.equal(status, 200);
    assert.equal(body.studioAvailable, true);
    assert.ok(body.articles.length > 0);
    assert.ok(body.projects.length > 0);
    assert.deepEqual(body.guestbook, []);
    assert.deepEqual(Object.keys(body.siteContent.text).sort(), ["en", "ja", "ko", "zh"]);
    const slugs = body.articles.map((item) => item.slug);
    assert.equal(new Set(slugs).size, slugs.length, "seed slugs are unique");
  } finally {
    await server.close();
  }
});

test("guestbook validates, trims, truncates and keeps the newest 50 entries", async () => {
  // Each test server has its own rate-limit map, so use several servers sharing one data dir.
  const dataDir = tempDir();
  let server = await startServer({ dataDir });
  try {
    assert.equal((await server.request("/api/guestbook", { method: "POST", body: { name: "  ", message: "hi" } })).status, 400);
    assert.equal((await server.request("/api/guestbook", { method: "POST", body: { name: "A" } })).status, 400);

    const ok = await server.request("/api/guestbook", {
      method: "POST",
      body: { name: `  ${"n".repeat(200)}  `, message: `  ${"m".repeat(1000)}  ` },
    });
    assert.equal(ok.status, 200);
    const [entry] = ok.body.guestbook;
    assert.equal(entry.name.length, 80);
    assert.equal(entry.message.length, 600);
    assert.ok(entry.id && !Number.isNaN(Date.parse(entry.createdAt)));
  } finally {
    await server.close();
  }

  // Fill past the cap: 5 posts per server stays under the per-IP rate limit.
  for (let batch = 0; batch < 11; batch += 1) {
    server = await startServer({ dataDir });
    try {
      for (let i = 0; i < 5; i += 1) {
        const response = await server.request("/api/guestbook", { method: "POST", body: { name: "N", message: `m-${batch}-${i}` } });
        assert.equal(response.status, 200);
      }
    } finally {
      await server.close();
    }
  }
  const stored = JSON.parse(fs.readFileSync(path.join(dataDir, "store.json"), "utf8"));
  assert.equal(stored.guestbook.length, 50);
  assert.equal(stored.guestbook[0].message, "m-10-4", "newest first");
});

test("guestbook is rate limited per client and rejects cross-origin posts", async () => {
  const server = await startServer();
  try {
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await server.request("/api/guestbook", { method: "POST", body: { name: "N", message: `m${i}` } })).status, 200);
    }
    const limited = await server.request("/api/guestbook", { method: "POST", body: { name: "N", message: "one too many" } });
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error, "rate_limited");

    const cross = await server.request("/api/guestbook", {
      method: "POST",
      body: { name: "N", message: "x" },
      headers: { Origin: "https://evil.example" },
    });
    assert.equal(cross.status, 403);
    const badReferer = await server.request("/api/guestbook", {
      method: "POST",
      body: { name: "N", message: "x" },
      headers: { Referer: "https://evil.example/page" },
    });
    assert.equal(badReferer.status, 403);
  } finally {
    await server.close();
  }
});

test("public endpoints cap the body size and answer bad JSON with JSON errors", async () => {
  const server = await startServer();
  try {
    const big = await server.request("/api/guestbook", { method: "POST", body: { name: "N", message: "x".repeat(120 * 1024) } });
    assert.equal(big.status, 413);
    assert.deepEqual(big.body, { error: "payload_too_large" });

    const response = await fetch(`${server.url}/api/guestbook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "bad_request" });
  } finally {
    await server.close();
  }
});

test("studio routes accept large bodies once authenticated", async () => {
  const server = await startServer();
  try {
    await login(server);
    const cover = `data:image/png;base64,${"A".repeat(200 * 1024)}`;
    const saved = await server.request("/api/studio/articles", {
      method: "POST",
      body: { article: { slug: "with-cover", title: { en: "Cover" }, coverImage: cover } },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.articles.find((item) => item.slug === "with-cover").coverImage.length, cover.length);
  } finally {
    await server.close();
  }
});

test("studio article saves validate input and keep the original publish date", async () => {
  const server = await startServer();
  try {
    await login(server);
    for (const article of [undefined, null, "text", ["a"]]) {
      const response = await server.request("/api/studio/articles", { method: "POST", body: { article } });
      assert.equal(response.status, 400, JSON.stringify(article));
      assert.equal(response.body.error, "invalid_article");
    }

    const created = await server.request("/api/studio/articles", {
      method: "POST",
      body: { article: { slug: "dated", title: { en: "Dated" }, date: "1999.01.01" } },
    });
    assert.match(created.body.articles[0].date, /^\d{4}\.\d{2}\.\d{2}$/);
    assert.notEqual(created.body.articles[0].date, "1999.01.01", "new articles are stamped with today's date");
    assert.equal(created.body.articles[0].slug, "dated", "new articles go first");
    const publishDate = created.body.articles[0].date;

    // Simulate an older publish date and check edits keep it.
    const storeFile = path.join(server.dataDir, "store.json");
    const store = JSON.parse(fs.readFileSync(storeFile, "utf8"));
    store.articles[0].date = "2020.05.05";
    fs.writeFileSync(storeFile, JSON.stringify(store));
    const edited = await server.request("/api/studio/articles", {
      method: "POST",
      body: { article: { slug: "dated", title: { en: "Dated v2" }, date: publishDate }, previousSlug: "dated" },
    });
    const article = edited.body.articles.find((item) => item.slug === "dated");
    assert.equal(article.date, "2020.05.05");
    assert.equal(article.title.en, "Dated v2");
    assert.ok(Date.parse(article.updatedAt) >= Date.parse(store.articles[0].updatedAt));
  } finally {
    await server.close();
  }
});

test("projects can be deleted, and delete needs a slug and auth", async () => {
  const server = await startServer();
  try {
    assert.equal((await server.request("/api/studio/projects/delete", { method: "POST", body: { slug: "x" } })).status, 401);
    await login(server);
    assert.equal((await server.request("/api/studio/projects/delete", { method: "POST", body: {} })).status, 400);
    assert.equal((await server.request("/api/studio/projects", { method: "POST", body: { project: "nope" } })).status, 400);

    await server.request("/api/studio/projects", { method: "POST", body: { project: { slug: "temp", title: "Temp" } } });
    const before = (await server.request("/api/bootstrap")).body.projects.length;
    const deleted = await server.request("/api/studio/projects/delete", { method: "POST", body: { slug: "temp" } });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.projects.length, before - 1);
    assert.equal(deleted.body.projects.some((item) => item.slug === "temp"), false);
  } finally {
    await server.close();
  }
});

test("site content saves are normalised against the defaults", async () => {
  const server = await startServer();
  try {
    await login(server);
    assert.equal((await server.request("/api/studio/site-content", { method: "POST", body: {} })).status, 400);
    const response = await server.request("/api/studio/site-content", {
      method: "POST",
      body: {
        siteContent: {
          meta: { name: "Me", role: { en: "Builder" }, socialLinks: [{ url: "https://example.com" }], unknownKey: 1 },
          text: { en: { heroTitle: "Hello" } },
        },
      },
    });
    assert.equal(response.status, 200);
    const { meta, text } = response.body.siteContent;
    assert.equal(meta.name, "Me");
    assert.deepEqual(meta.role, { zh: "", en: "Builder", ja: "Builder", ko: "Builder" });
    assert.deepEqual(meta.socialLinks, [{ label: "Link 1", url: "https://example.com", icon: "link", iconDataUrl: "" }]);
    assert.equal(text.en.heroTitle, "Hello");
    assert.ok(text.en.navHome, "missing keys fall back to defaults");
    assert.ok(text.zh.heroTitle, "other languages keep their defaults");
    assert.equal((await server.request("/api/bootstrap")).body.siteContent.meta.name, "Me");
  } finally {
    await server.close();
  }
});

test("a corrupt store.json is backed up and replaced with the defaults", async () => {
  const dataDir = tempDir();
  fs.writeFileSync(path.join(dataDir, "store.json"), "{ this is not json");
  const server = await startServer({ dataDir });
  try {
    const { status, body } = await server.request("/api/bootstrap");
    assert.equal(status, 200);
    assert.ok(body.articles.length > 0);
    const backups = fs.readdirSync(dataDir).filter((name) => name.startsWith("store.corrupt."));
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(dataDir, backups[0]), "utf8"), "{ this is not json");
    JSON.parse(fs.readFileSync(path.join(dataDir, "store.json"), "utf8"));
  } finally {
    await server.close();
  }
});

test("without a built front end, unknown pages 404 instead of crashing", async () => {
  const server = await startServer();
  try {
    const page = await server.request("/articles/why-personal-sites-need-direction");
    assert.equal(page.status, 404);
    assert.match(page.body, /npm run build/);
  } finally {
    await server.close();
  }
});

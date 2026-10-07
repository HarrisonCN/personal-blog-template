import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { login, startServer } from "./helpers.js";

const draft = (slug) => ({ slug, title: { en: `Title ${slug}` }, excerpt: { en: "e" }, content: { en: "body" } });
const remove = (server, body, headers) => server.request("/api/studio/articles/delete", { method: "POST", body, headers });

test("deleting an article needs auth, a same-origin request and a slug", async () => {
  const server = await startServer();
  try {
    assert.equal((await remove(server, { slug: "why-personal-sites-need-direction" })).status, 401);
    await login(server);
    assert.equal((await remove(server, { slug: "why-personal-sites-need-direction" }, { Origin: "https://evil.example" })).status, 403);
    const missing = await remove(server, {});
    assert.equal(missing.status, 400);
    assert.equal(missing.body.error, "invalid_slug");
    const unknown = await remove(server, { slug: "no-such-article" });
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.error, "not_found");
    assert.equal(fs.existsSync(path.join(server.dataDir, "deleted-articles.json")), false, "nothing archived when nothing was deleted");
  } finally {
    await server.close();
  }
});

test("a deleted article disappears from the store, feeds and share URLs, and is archived", async () => {
  const server = await startServer({ env: { SITE_URL: "https://blog.example.com/" } });
  try {
    await login(server);
    await server.request("/api/studio/articles", { method: "POST", body: { article: draft("keep-me") } });
    await server.request("/api/studio/articles", { method: "POST", body: { article: draft("delete-me") } });
    const before = (await server.request("/api/bootstrap")).body.articles;
    assert.ok((await server.request("/rss.xml")).body.includes("/articles/delete-me"));

    const deleted = await remove(server, { slug: "delete-me" });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.slug, "delete-me");
    assert.equal(deleted.body.articles.length, before.length - 1);
    assert.equal(deleted.body.articles.some((item) => item.slug === "delete-me"), false);
    assert.ok(deleted.body.articles.some((item) => item.slug === "keep-me"), "other articles are untouched");

    const after = (await server.request("/api/bootstrap")).body.articles;
    assert.deepEqual(after.map((item) => item.slug), deleted.body.articles.map((item) => item.slug), "persisted");
    assert.equal((await server.request("/rss.xml")).body.includes("/articles/delete-me"), false);
    assert.equal((await server.request("/sitemap.xml")).body.includes("/articles/delete-me"), false);

    const archive = JSON.parse(fs.readFileSync(path.join(server.dataDir, "deleted-articles.json"), "utf8"));
    assert.equal(archive.version, 1);
    assert.equal(archive.articles.length, 1);
    assert.equal(archive.articles[0].article.slug, "delete-me");
    assert.equal(archive.articles[0].article.title.en, "Title delete-me");
    assert.ok(!Number.isNaN(Date.parse(archive.articles[0].deletedAt)));

    assert.equal((await remove(server, { slug: "delete-me" })).status, 404, "deleting twice is a 404");

    // The slug is free again.
    const recreated = await server.request("/api/studio/articles", { method: "POST", body: { article: draft("delete-me") } });
    assert.equal(recreated.body.slug, "delete-me");
  } finally {
    await server.close();
  }
});

test("the deleted-articles archive keeps the newest 20 and survives a corrupt file", async () => {
  const server = await startServer();
  try {
    await login(server);
    fs.writeFileSync(path.join(server.dataDir, "deleted-articles.json"), "{corrupt");
    for (let i = 0; i < 22; i += 1) {
      await server.request("/api/studio/articles", { method: "POST", body: { article: draft(`tmp-${i}`) } });
      assert.equal((await remove(server, { slug: `tmp-${i}` })).status, 200);
    }
    const archive = JSON.parse(fs.readFileSync(path.join(server.dataDir, "deleted-articles.json"), "utf8"));
    assert.equal(archive.articles.length, 20);
    assert.equal(archive.articles[0].article.slug, "tmp-21", "newest first");
    assert.equal(archive.articles[19].article.slug, "tmp-2");
  } finally {
    await server.close();
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { buildRobots, buildRssFeed, buildSitemap, createLinkBuilder, normalizeSiteUrl } from "../server/lib/feeds.js";
import { injectSeo } from "../server/lib/seo.js";
import { resolveSlug, sanitizeSlug, uniqueSlug } from "../server/lib/slugs.js";

const articles = [
  { slug: "older", tag: "ESSAY / DIRECTION", title: { en: "Older & <wiser>" }, excerpt: { en: "a" }, date: "2026.01.02" },
  { slug: "newer", tag: "BUILD", title: { zh: "新", en: "Newer" }, excerpt: { en: "b" }, date: "2026.04.23", updatedAt: "2026-05-01T00:00:00.000Z" },
];

test("normalizeSiteUrl adds a trailing slash and rejects non-http", () => {
  assert.equal(normalizeSiteUrl("https://me.github.io/blog"), "https://me.github.io/blog/");
  assert.equal(normalizeSiteUrl("javascript:alert(1)"), "");
  assert.equal(normalizeSiteUrl(""), "");
});

test("RSS feed is ordered newest first, escaped, and uses hash links by default", () => {
  const xml = buildRssFeed({ siteUrl: "https://example.com/blog", title: "T", description: "D", language: "en", articles });
  assert.match(xml, /^<\?xml/);
  assert.ok(xml.indexOf("Newer") < xml.indexOf("Older"));
  assert.ok(xml.includes("Older &amp; &lt;wiser&gt;"));
  assert.ok(xml.includes("<link>https://example.com/blog/#/articles/newer</link>"));
  assert.ok(xml.includes("<category>ESSAY</category>") && xml.includes("<category>DIRECTION</category>"));
  assert.ok(xml.includes('href="https://example.com/blog/rss.xml"'));
});

test("sitemap lists home, index, articles and projects with lastmod", () => {
  const xml = buildSitemap({ siteUrl: "https://example.com/", articles, projects: [{ slug: "p1", updatedAt: "2026-03-01T00:00:00Z" }], links: createLinkBuilder("https://example.com/", "path") });
  assert.ok(xml.includes("<loc>https://example.com/articles/newer</loc>"));
  assert.ok(xml.includes("<loc>https://example.com/projects/p1</loc>"));
  assert.ok(xml.includes("<lastmod>2026-05-01</lastmod>"));
  assert.equal(buildRobots("https://example.com"), "User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://example.com/sitemap.xml\n");
});

test("injectSeo replaces managed tags and escapes values", () => {
  const html = '<html><head><title>Old</title><meta name="description" content="old" /><meta property="og:title" content="old" /><script type="module" src="./assets/a.js"></script></head><body></body></html>';
  const out = injectSeo(html, { title: 'A "quote" <b>', description: "desc", url: "https://e.com/articles/a", jsonLd: { x: "</script>" } }, { absoluteAssets: true });
  assert.ok(out.includes("<title>A &quot;quote&quot; &lt;b&gt;</title>"));
  assert.equal((out.match(/name="description"/g) || []).length, 1);
  assert.ok(out.includes('src="/assets/a.js"'));
  assert.ok(out.includes('<link rel="canonical" href="https://e.com/articles/a" />'));
  assert.equal(out.includes("</script>\"}"), false, "JSON-LD must not contain a raw </script>");
});

test("slug helpers sanitise and de-duplicate", () => {
  assert.equal(sanitizeSlug("  Hello, World!  "), "hello-world");
  assert.equal(uniqueSlug("a", ["a", "a-2"]), "a-3");
  assert.equal(uniqueSlug("a", ["a"], "a"), "a");
  const items = [{ slug: "a" }, { slug: "b" }];
  assert.deepEqual(resolveSlug({ items, requested: "a", previousSlug: null, prefix: "x" }), { slug: "a-2", existingIndex: -1 });
  assert.deepEqual(resolveSlug({ items, requested: "a", previousSlug: "b", prefix: "x" }), { slug: "a-2", existingIndex: 1 });
  assert.deepEqual(resolveSlug({ items, requested: "a", previousSlug: "a", prefix: "x" }), { slug: "a", existingIndex: 0 });
  assert.equal(resolveSlug({ items, requested: "", fallbackTitle: "My Title", prefix: "x" }).slug, "my-title");
});

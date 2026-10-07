import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDefaultSiteContent,
  buildDefaultStore,
  ensureLocalizedMap,
  formatArticleDate,
  normalizeCustomCard,
  normalizeSiteContent,
  normalizeSocialLink,
  normalizeStore,
} from "../server/lib/content.js";

test("ensureLocalizedMap fills every language with sensible fallbacks", () => {
  assert.deepEqual(ensureLocalizedMap({ zh: "中" }), { zh: "中", en: "中", ja: "中", ko: "中" });
  assert.deepEqual(ensureLocalizedMap({ en: "E" }, "F"), { zh: "F", en: "E", ja: "E", ko: "E" });
  assert.deepEqual(ensureLocalizedMap({ zh: "", en: "E" }), { zh: "", en: "E", ja: "E", ko: "E" }, "empty strings are kept");
  assert.deepEqual(ensureLocalizedMap("plain", "F"), { zh: "F", en: "F", ja: "F", ko: "F" });
  assert.deepEqual(ensureLocalizedMap(null), { zh: "", en: "", ja: "", ko: "" });
});

test("formatArticleDate pads month and day", () => {
  assert.equal(formatArticleDate(new Date(2026, 0, 5)), "2026.01.05");
  assert.equal(formatArticleDate(new Date(2026, 11, 31)), "2026.12.31");
});

test("social links and custom cards are coerced to safe shapes", () => {
  assert.deepEqual(normalizeSocialLink(undefined, 2), { label: "Link 3", url: "", icon: "link", iconDataUrl: "" });
  assert.equal(normalizeSocialLink({ iconDataUrl: 42 }).iconDataUrl, "", "non-string icon data is dropped");
  const card = normalizeCustomCard({ title: { en: "T" }, linkUrl: 7 }, 0);
  assert.equal(card.id, "card-1");
  assert.equal(card.title.ja, "T");
  assert.equal(card.linkUrl, "7");
});

test("the default store is well formed", () => {
  const store = buildDefaultStore();
  assert.ok(store.articles.length > 0 && store.projects.length > 0);
  for (const article of store.articles) {
    assert.ok(article.slug);
    assert.match(article.date, /^\d{4}\.\d{2}\.\d{2}$/);
    assert.ok(Array.isArray(article.attachments));
    assert.equal(typeof article.pinned, "boolean");
  }
  for (const project of store.projects) {
    assert.ok(project.slug);
    assert.ok(Array.isArray(project.metrics));
  }
  assert.deepEqual(store.guestbook, []);
  assert.deepEqual(normalizeSiteContent(store.siteContent), store.siteContent, "normalising the defaults is a no-op");
});

test("normalizeStore repairs missing or wrongly typed sections", () => {
  const defaults = buildDefaultStore();
  const repaired = normalizeStore({ articles: "nope", projects: null, guestbook: {}, siteContent: undefined });
  assert.equal(repaired.articles.length, defaults.articles.length);
  assert.equal(repaired.projects.length, defaults.projects.length);
  assert.deepEqual(repaired.guestbook, []);
  assert.deepEqual(repaired.siteContent, buildDefaultSiteContent());

  const kept = normalizeStore({ articles: [], projects: [], guestbook: [{ id: "g" }] });
  assert.deepEqual(kept.articles, [], "an empty article list is a valid choice, not a reset");
  assert.deepEqual(kept.guestbook, [{ id: "g" }]);
  assert.deepEqual(normalizeStore(undefined).articles.length, defaults.articles.length);
});

test("normalizeSiteContent keeps valid fields and replaces invalid ones", () => {
  const defaults = buildDefaultSiteContent();
  const content = normalizeSiteContent({
    meta: { avatarImage: 5, backgroundPreset: ["x"], stats: { extra: 1 }, socialLinks: "bad" },
    text: { en: { footer: "F" }, xx: { footer: "ignored" } },
  });
  assert.equal(content.meta.avatarImage, defaults.meta.avatarImage);
  assert.equal(content.meta.backgroundPreset, defaults.meta.backgroundPreset);
  assert.equal(content.meta.stats.extra, 1);
  for (const key of Object.keys(defaults.meta.stats)) {
    assert.equal(content.meta.stats[key], defaults.meta.stats[key]);
  }
  assert.deepEqual(content.meta.socialLinks, defaults.meta.socialLinks);
  assert.equal(content.text.en.footer, "F");
  assert.equal("xx" in content.text, false, "unknown languages are dropped");
});

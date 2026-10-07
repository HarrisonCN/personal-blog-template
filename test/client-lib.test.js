import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildSearchIndex, collectTags, filterArticles, splitTags } from "../src/lib/articleSearch.js";
import { DEFAULT_FONT, FONT_FAMILIES, fontStylesheetUrl } from "../src/lib/fonts.js";
import { hashRouteForPath } from "../src/lib/legacyPathRedirect.js";
import { articles, fonts } from "../src/data/siteContent.js";

test("article search covers every language and the body, with AND semantics", () => {
  const index = buildSearchIndex([
    { slug: "a", tag: "ESSAY / DIRECTION", title: { zh: "视觉方向", en: "Visual direction" }, excerpt: {}, content: { en: "Body mentions glass [[attachment:x1]]" } },
    { slug: "b", tag: "BUILD", title: { en: "Liquid glass" }, excerpt: { ja: "ガラス" }, content: {} },
  ]);
  assert.deepEqual(filterArticles(index, { query: "glass" }).map((item) => item.slug), ["a", "b"]);
  assert.deepEqual(filterArticles(index, { query: "liquid glass" }).map((item) => item.slug), ["b"]);
  assert.deepEqual(filterArticles(index, { query: "视觉" }).map((item) => item.slug), ["a"]);
  assert.deepEqual(filterArticles(index, { query: "ガラス" }).map((item) => item.slug), ["b"]);
  assert.deepEqual(filterArticles(index, { query: "x1" }), [], "attachment tokens are not searchable");
  assert.deepEqual(filterArticles(index, { tag: "direction" }).map((item) => item.slug), ["a"]);
  assert.deepEqual(filterArticles(index, { tag: "all", query: "" }).length, 2);
  assert.deepEqual(splitTags("ESSAY / DIRECTION"), ["ESSAY", "DIRECTION"]);
  assert.deepEqual(collectTags(index).map((item) => item.tag), ["BUILD", "DIRECTION", "ESSAY"]);
});

test("seed articles are all searchable", () => {
  const index = buildSearchIndex(articles);
  for (const article of articles) {
    assert.ok(filterArticles(index, { query: article.slug }).includes(article));
  }
});

test("every font preset has a Google Fonts mapping and index.html preloads the default", () => {
  for (const font of fonts) {
    assert.ok(FONT_FAMILIES[font.code], `missing font mapping for ${font.code}`);
  }
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes(`href="${fontStylesheetUrl(DEFAULT_FONT)}"`), "index.html preload must match the default font URL");
  assert.equal(/fonts\.googleapis\.com\/css2[^"]*rel="stylesheet"/.test(html), false, "no render-blocking font stylesheet");
});

test("clean share paths map onto hash routes", () => {
  assert.equal(hashRouteForPath("/articles/hello"), "/#/articles/hello");
  assert.equal(hashRouteForPath("/personal-blog-template/projects/p1/"), "/personal-blog-template/#/projects/p1");
  assert.equal(hashRouteForPath("/articles", "?tag=BUILD"), "/#/articles?tag=BUILD");
  assert.equal(hashRouteForPath("/"), null);
  assert.equal(hashRouteForPath("/articles/hello", "", "#/studio"), null, "an existing hash route wins");
});

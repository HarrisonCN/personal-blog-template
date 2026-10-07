import assert from "node:assert/strict";
import test from "node:test";
import {
  CJK_CHARS_PER_MINUTE,
  WORDS_PER_MINUTE,
  articleReadingMinutes,
  articleReadingMinutesOrOverride,
  articleReadingTime,
  countReadingUnits,
  estimateReadingMinutes,
  formatReadingTime,
  isAutoReadTime,
  readingTimeIsoDuration,
} from "../src/lib/readingTime.js";
import { articles } from "../src/data/siteContent.js";

const words = (count) => Array.from({ length: count }, (_, i) => `word${i}`).join(" ");

test("counts words for spaced scripts and characters for CJK", () => {
  assert.deepEqual(countReadingUnits("Hello, world. It's a well-known fact."), { words: 6, cjk: 0 });
  assert.deepEqual(countReadingUnits("视觉方向"), { words: 0, cjk: 4 });
  assert.deepEqual(countReadingUnits("ガラスのUI"), { words: 1, cjk: 4 }, "kana count as characters, latin as words");
  assert.deepEqual(countReadingUnits("개인 사이트에 왜"), { words: 3, cjk: 0 }, "Hangul is space separated, counted as words");
  assert.deepEqual(countReadingUnits("Привет мир"), { words: 2, cjk: 0 });
});

test("ignores attachment tokens, URLs and markdown markers", () => {
  const text = "## Title\n\n[[attachment:abc-123]] see [the docs](https://example.com/a/b) or https://example.com **bold** `code`";
  assert.deepEqual(countReadingUnits(text), { words: 7, cjk: 0 });
});

test("estimates minutes at the configured rates, rounding and with a 1-minute floor", () => {
  assert.equal(estimateReadingMinutes(""), 0);
  assert.equal(estimateReadingMinutes("   [[attachment:x]] "), 0);
  assert.equal(estimateReadingMinutes("one"), 1);
  assert.equal(estimateReadingMinutes(words(WORDS_PER_MINUTE * 5)), 5);
  assert.equal(estimateReadingMinutes(words(Math.round(WORDS_PER_MINUTE * 2.4))), 2);
  assert.equal(estimateReadingMinutes(words(Math.round(WORDS_PER_MINUTE * 2.6))), 3);
  assert.equal(estimateReadingMinutes("字".repeat(CJK_CHARS_PER_MINUTE * 3)), 3);
  assert.equal(estimateReadingMinutes(`${words(WORDS_PER_MINUTE)} ${"字".repeat(CJK_CHARS_PER_MINUTE)}`), 2, "mixed text adds up");
});

test("article estimate uses the reader's language, then falls back", () => {
  const article = {
    content: { en: words(WORDS_PER_MINUTE * 4), zh: "字".repeat(CJK_CHARS_PER_MINUTE * 2), ja: "" },
    excerpt: { en: "short" },
  };
  assert.equal(articleReadingMinutes(article, "en"), 4);
  assert.equal(articleReadingMinutes(article, "zh"), 2);
  assert.equal(articleReadingMinutes(article, "ja"), 4, "empty translation falls back to English");
  assert.equal(articleReadingMinutes({ excerpt: { en: "just an excerpt" } }, "en"), 1, "no body falls back to the excerpt");
  assert.equal(articleReadingMinutes({}, "en"), 1, "never shows 0 minutes for an article");
  const withNotes = { content: { en: words(WORDS_PER_MINUTE) }, footnotes: { en: [words(WORDS_PER_MINUTE), words(WORDS_PER_MINUTE)] } };
  assert.equal(articleReadingMinutes(withNotes, "en"), 3, "footnotes count");
});

test("labels are localised and a manual readTime wins", () => {
  assert.equal(formatReadingTime(3, "en"), "3 min");
  assert.equal(formatReadingTime(3, "zh"), "3 分钟");
  assert.equal(formatReadingTime(3, "ja"), "3 分");
  assert.equal(formatReadingTime(3, "ko"), "3분");
  assert.equal(formatReadingTime(3, "xx"), "3 min");

  const article = { content: { en: words(WORDS_PER_MINUTE * 2) } };
  assert.equal(articleReadingTime(article, "en"), "2 min");
  assert.equal(articleReadingTime({ ...article, readTime: "" }, "ko"), "2분");
  assert.equal(articleReadingTime({ ...article, readTime: "AUTO" }, "en"), "2 min");
  assert.equal(articleReadingTime({ ...article, readTime: " 10 min " }, "zh"), "10 min");
  assert.equal(isAutoReadTime(undefined), true);
  assert.equal(isAutoReadTime("6 min"), false);
});

test("machine-readable minutes honour a numeric override", () => {
  const article = { content: { en: words(WORDS_PER_MINUTE * 2) } };
  assert.equal(articleReadingMinutesOrOverride(article, "en"), 2);
  assert.equal(articleReadingMinutesOrOverride({ ...article, readTime: "6 min" }, "en"), 6);
  assert.equal(articleReadingMinutesOrOverride({ ...article, readTime: "a while" }, "en"), 2, "non-numeric override falls back to the estimate");
  assert.equal(readingTimeIsoDuration(6), "PT6M");
  assert.equal(readingTimeIsoDuration(0), "PT1M");
});

test("seed articles get a sensible label in every language", () => {
  for (const article of articles) {
    for (const language of ["zh", "en", "ja", "ko"]) {
      assert.match(articleReadingTime(article, language), /\d/);
    }
  }
});

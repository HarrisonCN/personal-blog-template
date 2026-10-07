// Reading-time estimate for articles, aware of CJK text.
//
// Latin, Cyrillic, Hangul and other space-separated scripts are counted in
// words; Chinese characters and Japanese kana are counted one by one, since
// those scripts do not separate words with spaces. Pure module with no
// imports, so the Node server (JSON-LD) and the browser share it.

export const WORDS_PER_MINUTE = 220;
export const CJK_CHARS_PER_MINUTE = 400;

const LANGS = ["zh", "en", "ja", "ko"];
const ATTACHMENT_TOKEN = /\[\[attachment:[^\]]*\]\]/g;
// Han ideographs (incl. extension A and compatibility), Hiragana, Katakana and half-width Katakana.
const CJK_CHAR = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/g;
const WORD = /[\p{L}\p{N}]+(?:['’\-.][\p{L}\p{N}]+)*/gu;

/** Remove things a reader does not read: attachment tokens, URLs, markdown markers. */
export function stripForCounting(text) {
  return String(text ?? "")
    .replace(ATTACHMENT_TOKEN, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_`~|]/g, " ");
}

/** Count words and CJK characters in a block of text. */
export function countReadingUnits(text) {
  const clean = stripForCounting(text);
  const cjk = (clean.match(CJK_CHAR) || []).length;
  const words = (clean.replace(CJK_CHAR, " ").match(WORD) || []).length;
  return { words, cjk };
}

/** Whole minutes needed to read `text`; at least 1 for any readable text, 0 for none. */
export function estimateReadingMinutes(text) {
  const { words, cjk } = countReadingUnits(text);
  const minutes = words / WORDS_PER_MINUTE + cjk / CJK_CHARS_PER_MINUTE;
  if (minutes <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(minutes));
}

function pickLocalized(value, language) {
  if (value && typeof value === "object") {
    const order = [language, "en", "zh", ...LANGS];
    for (const lang of order) {
      const entry = value[lang];
      const text = Array.isArray(entry) ? entry.join("\n") : entry;
      if (typeof text === "string" && text.trim()) {
        return text;
      }
    }
    return "";
  }
  return typeof value === "string" ? value : "";
}

/** Text of the article body in `language`, falling back to another language and then the excerpt. */
export function articleBodyText(article, language = "en") {
  return pickLocalized(article?.content, language) || pickLocalized(article?.excerpt, language);
}

/** Estimated minutes for an article in `language` (ignores any manual readTime). */
export function articleReadingMinutes(article, language = "en") {
  const body = articleBodyText(article, language);
  const footnotes = pickLocalized(article?.footnotes, language);
  return Math.max(1, estimateReadingMinutes(`${body}\n${footnotes}`));
}

const LABELS = {
  zh: (minutes) => `${minutes} 分钟`,
  en: (minutes) => `${minutes} min`,
  ja: (minutes) => `${minutes} 分`,
  ko: (minutes) => `${minutes}분`,
};

export function formatReadingTime(minutes, language = "en") {
  return (LABELS[language] || LABELS.en)(minutes);
}

/** True when the studio left readTime empty (or set it to "auto"), so the estimate is shown. */
export function isAutoReadTime(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return !text || text === "auto";
}

/**
 * The label to show for an article. A manual `readTime` set in the studio wins;
 * otherwise the time is estimated from the article body in the reader's language.
 */
export function articleReadingTime(article, language = "en") {
  if (!isAutoReadTime(article?.readTime)) {
    return String(article.readTime).trim();
  }
  return formatReadingTime(articleReadingMinutes(article, language), language);
}

/** Minutes for machine-readable output: the number in a manual readTime ("6 min") if there is one, else the estimate. */
export function articleReadingMinutesOrOverride(article, language = "en") {
  if (!isAutoReadTime(article?.readTime)) {
    const manual = /\d+/.exec(String(article.readTime));
    if (manual && Number(manual[0]) > 0) {
      return Number(manual[0]);
    }
  }
  return articleReadingMinutes(article, language);
}

/** ISO 8601 duration for schema.org `timeRequired`, e.g. "PT6M". */
export function readingTimeIsoDuration(minutes) {
  return `PT${Math.max(1, Math.round(minutes))}M`;
}

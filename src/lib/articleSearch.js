// Client-side article search and tag filtering.
//
// - Searches every language (title, excerpt, body, footnotes), the tag and date,
//   so a visitor reading in one language can still find a post by its English slug words.
// - Multi-word queries match when every word is found (AND).
// - Compound tags such as "ESSAY / DIRECTION" are split into individual filter tags.

const ATTACHMENT_TOKEN = /\[\[attachment:[^\]]*\]\]/g;
const LANGS = ["zh", "en", "ja", "ko"];

export function splitTags(tag) {
  return String(tag || "")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);
}

function localizedValues(value) {
  if (!value || typeof value !== "object") {
    return [String(value ?? "")];
  }
  return LANGS.map((lang) => {
    const entry = value[lang];
    return Array.isArray(entry) ? entry.join(" ") : String(entry ?? "");
  });
}

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchIndex(articles) {
  return articles.map((article) => ({
    article,
    tags: splitTags(article.tag),
    text: normalizeSearchText(
      [
        article.slug,
        article.tag,
        article.date,
        ...localizedValues(article.title),
        ...localizedValues(article.excerpt),
        ...localizedValues(article.content).map((text) => text.replace(ATTACHMENT_TOKEN, " ")),
        ...localizedValues(article.footnotes),
      ].join(" ")
    ),
  }));
}

export function tokenizeQuery(query) {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

/** Returns the articles matching `query` (every token) and `tag` ("all" or "" = any). */
export function filterArticles(index, { query = "", tag = "all" } = {}) {
  const tokens = tokenizeQuery(query);
  const wantedTag = tag && tag !== "all" ? tag.toLowerCase() : "";
  return index
    .filter((entry) => !wantedTag || entry.tags.some((item) => item.toLowerCase() === wantedTag))
    .filter((entry) => tokens.every((token) => entry.text.includes(token)))
    .map((entry) => entry.article);
}

/** Tag list with counts, most used first, then alphabetical. */
export function collectTags(index) {
  const counts = new Map();
  for (const entry of index) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([tag, count]) => ({ tag, count }));
}

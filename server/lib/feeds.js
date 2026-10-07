// RSS 2.0, sitemap.xml and robots.txt builders.
// Pure functions with no Node-only imports, so both server.js (dynamic) and
// vite.config.js (static build output) can use them.

export const SUPPORTED_LANGUAGES = ["zh", "en", "ja", "ko"];

export function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Strip characters that are not allowed in XML 1.0.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/** Pick a localized string, falling back through en, zh and any other language. */
export function pickText(value, language = "en") {
  if (value && typeof value === "object") {
    return String(value[language] || value.en || value.zh || Object.values(value).find(Boolean) || "");
  }
  return String(value ?? "");
}

/** Ensure an absolute http(s) base URL that ends in "/". Returns "" when invalid. */
export function normalizeSiteUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    url.hash = "";
    url.search = "";
    if (!url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
    }
    return url.toString();
  } catch {
    return "";
  }
}

/** Parse "2026.04.23", ISO strings, or Date into a Date (or null). */
export function parseContentDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const text = String(value);
  const dotted = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(text);
  const parsed = dotted ? new Date(Date.UTC(Number(dotted[1]), Number(dotted[2]) - 1, Number(dotted[3]), 12)) : new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function articlePublishedAt(article) {
  return parseContentDate(article?.date) || parseContentDate(article?.updatedAt);
}

export function articleUpdatedAt(article) {
  return parseContentDate(article?.updatedAt) || parseContentDate(article?.date);
}

/**
 * Link builders. "hash" matches the HashRouter used by the SPA and works on
 * any static host; "path" produces /articles/<slug> share URLs, which only the
 * Node server can answer (it injects SEO meta and the SPA redirects to #/).
 */
export function createLinkBuilder(siteUrl, mode = "hash") {
  const base = normalizeSiteUrl(siteUrl);
  const build = (section, slug) =>
    mode === "path" ? `${base}${section}/${encodeURIComponent(slug)}` : `${base}#/${section}/${encodeURIComponent(slug)}`;
  return {
    base,
    home: base,
    articles: mode === "path" ? `${base}articles` : `${base}#/articles`,
    article: (slug) => build("articles", slug),
    project: (slug) => build("projects", slug),
  };
}

export function sortByPublished(articles) {
  return [...articles].sort((left, right) => {
    const a = articlePublishedAt(left)?.getTime() ?? 0;
    const b = articlePublishedAt(right)?.getTime() ?? 0;
    return b - a;
  });
}

export function buildRssFeed({ siteUrl, title, description, language = "en", articles = [], links, feedUrl, limit = 50 }) {
  const linkBuilder = links || createLinkBuilder(siteUrl);
  const items = sortByPublished(articles)
    .slice(0, limit)
    .map((article) => {
      const link = linkBuilder.article(article.slug);
      const published = articlePublishedAt(article);
      const categories = String(article.tag || "")
        .split("/")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => `      <category>${escapeXml(item)}</category>`)
        .join("\n");
      return [
        "    <item>",
        `      <title>${escapeXml(pickText(article.title, language))}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        published ? `      <pubDate>${published.toUTCString()}</pubDate>` : "",
        `      <description>${escapeXml(pickText(article.excerpt, language))}</description>`,
        categories,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    });
  const newest = articles.map(articleUpdatedAt).filter(Boolean).sort((a, b) => b - a)[0];
  const self = feedUrl || `${linkBuilder.base}rss.xml`;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(linkBuilder.home)}</link>`,
    `    <description>${escapeXml(description || title)}</description>`,
    `    <language>${escapeXml(language)}</language>`,
    `    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml" />`,
    newest ? `    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>` : "",
    "    <generator>personal-blog-template</generator>",
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n")
    .concat("\n");
}

export function buildSitemap({ siteUrl, articles = [], projects = [], links }) {
  const linkBuilder = links || createLinkBuilder(siteUrl);
  const toDay = (date) => (date ? date.toISOString().slice(0, 10) : "");
  const newestArticle = articles.map(articleUpdatedAt).filter(Boolean).sort((a, b) => b - a)[0];
  const entries = [
    { loc: linkBuilder.home, lastmod: toDay(newestArticle) },
    { loc: linkBuilder.articles, lastmod: toDay(newestArticle) },
    ...sortByPublished(articles).map((article) => ({ loc: linkBuilder.article(article.slug), lastmod: toDay(articleUpdatedAt(article)) })),
    ...projects.map((project) => ({ loc: linkBuilder.project(project.slug), lastmod: toDay(parseContentDate(project.updatedAt)) })),
  ];
  const seen = new Set();
  const body = entries
    .filter((entry) => entry.loc && !seen.has(entry.loc) && seen.add(entry.loc))
    .map((entry) =>
      ["  <url>", `    <loc>${escapeXml(entry.loc)}</loc>`, entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : "", "  </url>"]
        .filter(Boolean)
        .join("\n")
    );
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...body, "</urlset>", ""].join("\n");
}

export function buildRobots(siteUrl) {
  const base = normalizeSiteUrl(siteUrl);
  const lines = ["User-agent: *", "Allow: /", "Disallow: /api/"];
  if (base) {
    lines.push(`Sitemap: ${base}sitemap.xml`);
  }
  return `${lines.join("\n")}\n`;
}

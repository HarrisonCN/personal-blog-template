// Server-side SEO meta injection for the SPA shell (dist/index.html).
// Crawlers and link-preview bots do not run the SPA, so the Node server
// rewrites <title>, description, Open Graph, Twitter and canonical tags per
// article/project before sending the HTML.

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MANAGED_META = /\s*<meta\s+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+|article:[^"]+)"[^>]*>/gi;
const MANAGED_LINKS = /\s*<link\s+rel="(?:canonical|alternate)"[^>]*>/gi;
const MANAGED_JSONLD = /\s*<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi;

export function truncate(text, max = 200) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/**
 * @param {string} html  the built index.html
 * @param {object} seo   { title, description, url, image, type, siteName, locale,
 *                         publishedTime, modifiedTime, tags, rssUrl, rssTitle, jsonLd }
 * @param {object} opts  { absoluteAssets: true } rewrites "./assets/..." to "/assets/..."
 *                       so the shell also works when served from a nested path.
 */
export function injectSeo(html, seo = {}, { absoluteAssets = false } = {}) {
  let output = String(html);
  if (absoluteAssets) {
    output = output.replace(/(\s(?:src|href)=")\.\//g, "$1/");
  }

  output = output.replace(MANAGED_META, "").replace(MANAGED_LINKS, "").replace(MANAGED_JSONLD, "");

  if (seo.title) {
    output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  }

  const description = truncate(seo.description, 300);
  const tags = [];
  const meta = (attr, key, value) => {
    if (value) {
      tags.push(`<meta ${attr}="${key}" content="${escapeHtml(value)}" />`);
    }
  };
  meta("name", "description", description);
  meta("property", "og:type", seo.type || "website");
  meta("property", "og:site_name", seo.siteName);
  meta("property", "og:title", seo.title);
  meta("property", "og:description", description);
  meta("property", "og:url", seo.url);
  meta("property", "og:image", seo.image);
  meta("property", "og:locale", seo.locale);
  meta("property", "article:published_time", seo.publishedTime);
  meta("property", "article:modified_time", seo.modifiedTime);
  for (const tag of seo.tags || []) {
    meta("property", "article:tag", tag);
  }
  meta("name", "twitter:card", seo.image ? "summary_large_image" : "summary");
  meta("name", "twitter:title", seo.title);
  meta("name", "twitter:description", description);
  meta("name", "twitter:image", seo.image);
  if (seo.url) {
    tags.push(`<link rel="canonical" href="${escapeHtml(seo.url)}" />`);
  }
  if (seo.rssUrl) {
    tags.push(`<link rel="alternate" type="application/rss+xml" title="${escapeHtml(seo.rssTitle || seo.siteName || "RSS")}" href="${escapeHtml(seo.rssUrl)}" />`);
  }
  if (seo.jsonLd) {
    // "<" is escaped so article text can never close the script element.
    const json = JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c");
    tags.push(`<script type="application/ld+json">${json}</script>`);
  }

  return output.replace(/<\/head>/i, `    ${tags.join("\n    ")}\n  </head>`);
}

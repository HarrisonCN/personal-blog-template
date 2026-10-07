import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { buildRobots, buildRssFeed, buildSitemap, createLinkBuilder, normalizeSiteUrl, pickText } from "./server/lib/feeds.js";
import { articles, featuredProjects, siteMeta } from "./src/data/siteContent.js";

// Emits rss.xml, sitemap.xml and robots.txt into dist/ for static hosts
// (GitHub Pages, Cloudflare). Feeds need absolute URLs, so this only runs when
// SITE_URL is set, e.g. SITE_URL=https://you.github.io/personal-blog-template/.
// Static builds only know the seed content in src/data/siteContent.js; the Node
// server serves live /rss.xml and /sitemap.xml from its store instead.
function staticFeeds(siteUrl, language) {
  return {
    name: "static-feeds",
    apply: "build",
    transformIndexHtml() {
      if (!siteUrl) {
        return [];
      }
      return [
        {
          tag: "link",
          attrs: { rel: "alternate", type: "application/rss+xml", title: siteMeta.name, href: `${siteUrl}rss.xml` },
          injectTo: "head",
        },
      ];
    },
    generateBundle() {
      if (!siteUrl) {
        this.info?.("SITE_URL not set: skipping rss.xml / sitemap.xml generation.");
        return;
      }
      const links = createLinkBuilder(siteUrl, "hash");
      const seedArticles = articles.map((article, index) => ({ ...article, slug: article.slug || `article-${index + 1}` }));
      const files = {
        "rss.xml": buildRssFeed({
          siteUrl,
          title: siteMeta.name,
          description: pickText(siteMeta.intro, language),
          language,
          articles: seedArticles,
          links,
        }),
        "sitemap.xml": buildSitemap({ siteUrl, articles: seedArticles, projects: featuredProjects, links }),
        "robots.txt": buildRobots(siteUrl),
      };
      for (const [fileName, source] of Object.entries(files)) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const siteUrl = normalizeSiteUrl(env.SITE_URL);
  const language = ["zh", "en", "ja", "ko"].includes(env.SITE_LANGUAGE) ? env.SITE_LANGUAGE : "zh";

  return {
    base: "./",
    plugins: [react(), staticFeeds(siteUrl, language)],
    server: {
      proxy: {
        "/api": "http://127.0.0.1:8787",
      },
    },
  };
});

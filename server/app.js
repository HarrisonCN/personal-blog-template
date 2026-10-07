import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { fileURLToPath } from "node:url";
import { buildDefaultStore, formatArticleDate, normalizeSiteContent, normalizeStore } from "./lib/content.js";
import { createCredentialManager } from "./lib/credentials.js";
import { buildRobots, buildRssFeed, buildSitemap, createLinkBuilder, normalizeSiteUrl, pickText, articlePublishedAt, articleUpdatedAt } from "./lib/feeds.js";
import { injectSeo } from "./lib/seo.js";
import { createSessionStore } from "./lib/sessions.js";
import { resolveSlug } from "./lib/slugs.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const LOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const GUESTBOOK_WINDOW_MS = 60 * 1000;
const GUESTBOOK_MAX_POSTS = 5;
const SESSION_COOKIE = "studio_session";
const SUPPORTED_LANGUAGES = new Set(["zh", "en", "ja", "ko"]);

// Only trust X-Forwarded-* from proxies you control. Default "loopback" covers a
// reverse proxy on the same machine (Nginx/PM2). Set TRUST_PROXY=1 behind one
// hosted proxy (Render, Railway, Fly), or "false" when exposed directly.
export function parseTrustProxy(value) {
  if (value === undefined || value === "") {
    return "loopback";
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return /^\d+$/.test(value) ? Number(value) : value;
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCookies(request) {
  const raw = request.headers.cookie || "";
  return Object.fromEntries(
    raw
      .split(";")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const separator = chunk.indexOf("=");
        const key = separator >= 0 ? chunk.slice(0, separator) : chunk;
        const value = separator >= 0 ? chunk.slice(separator + 1) : "";
        try {
          return [key, decodeURIComponent(value)];
        } catch {
          return [key, value];
        }
      })
  );
}

function isPublicImage(value) {
  // Uploaded covers are stored as data: URLs, which are useless (and huge) in meta tags.
  return typeof value === "string" && /^(https?:)?\/\//i.test(value);
}

/**
 * Build the Express app. Everything is configurable so tests can point the
 * runtime data at a temp directory.
 *
 * @param {object} [options]
 * @param {Record<string, string|undefined>} [options.env]  defaults to process.env
 * @param {string} [options.dataDir]  runtime data (store/sessions/auth), default server/data
 * @param {string} [options.distDir]  built front end, default dist
 * @param {object} [options.hashParams]  scrypt cost overrides (tests use a low N)
 * @param {Console} [options.logger]
 */
export function createApp(options = {}) {
  const env = options.env ?? process.env;
  const logger = options.logger ?? console;
  const dataDir = options.dataDir ?? path.join(ROOT_DIR, "server", "data");
  const distDir = options.distDir ?? path.join(ROOT_DIR, "dist");
  const storeFile = path.join(dataDir, "store.json");

  const isProduction = env.NODE_ENV === "production";
  const username = env.STUDIO_USERNAME || "ADMIN";
  const plainPassword = env.STUDIO_PASSWORD || "CHANGE_ME_123";
  const passwordHash = env.STUDIO_PASSWORD_HASH?.trim() || "";
  const sessionSecret = env.SESSION_SECRET || "template-dev-secret-change-me";
  const idleMs = positiveNumber(env.SESSION_IDLE_MINUTES, 45) * 60 * 1000;
  const absoluteMs = positiveNumber(env.SESSION_MAX_DAYS, 7) * 24 * 60 * 60 * 1000;
  const configuredSiteUrl = normalizeSiteUrl(env.SITE_URL);
  const feedLanguage = SUPPORTED_LANGUAGES.has(env.SITE_LANGUAGE) ? env.SITE_LANGUAGE : "zh";

  if (isProduction) {
    if (!env.STUDIO_PASSWORD && !passwordHash) {
      logger.warn("[studio] WARNING: using the default studio password. Set STUDIO_PASSWORD_HASH (npm run hash-password).");
    }
    if (!env.SESSION_SECRET) {
      logger.warn("[studio] WARNING: using the default SESSION_SECRET. Set a long random value.");
    }
    if (!configuredSiteUrl) {
      logger.warn("[studio] SITE_URL is not set; RSS, sitemap and canonical links will use the request host.");
    }
  }

  const credentials = createCredentialManager({
    dataDir,
    username,
    password: plainPassword,
    passwordHash,
    hashParams: options.hashParams,
    logger,
  });
  const sessions = createSessionStore({ file: path.join(dataDir, "sessions.json"), idleMs, absoluteMs, logger });
  const loginGuards = new Map();
  const guestbookGuards = new Map();

  // ---------------------------------------------------------------- store

  function ensureRuntimeStore() {
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(storeFile)) {
      fs.writeFileSync(storeFile, JSON.stringify(buildDefaultStore(), null, 2));
    }
  }

  function readStore() {
    ensureRuntimeStore();
    try {
      return normalizeStore(JSON.parse(fs.readFileSync(storeFile, "utf8")));
    } catch {
      const fallback = buildDefaultStore();
      const backupFile = path.join(dataDir, `store.corrupt.${Date.now()}.json`);
      try {
        if (fs.existsSync(storeFile)) {
          fs.copyFileSync(storeFile, backupFile);
        }
      } catch {}
      fs.writeFileSync(storeFile, JSON.stringify(fallback, null, 2));
      return fallback;
    }
  }

  function writeStore(nextStore) {
    ensureRuntimeStore();
    // Write to a temp file and rename so a crash mid-write cannot corrupt store.json.
    const tempFile = `${storeFile}.${process.pid}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(nextStore, null, 2));
    fs.renameSync(tempFile, storeFile);
  }

  // ------------------------------------------------------------- sessions

  function signSession(sessionId) {
    const signature = crypto.createHmac("sha256", sessionSecret).update(sessionId).digest("hex");
    return `${sessionId}.${signature}`;
  }

  function verifySignedSession(value) {
    if (!value) {
      return null;
    }
    const [sessionId, signature] = value.split(".");
    if (!sessionId || !signature) {
      return null;
    }
    const expected = crypto.createHmac("sha256", sessionSecret).update(sessionId).digest("hex");
    const valid = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    return valid ? sessionId : null;
  }

  function cookieAttributes(value, maxAgeSeconds) {
    const attributes = [`${SESSION_COOKIE}=${value}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAgeSeconds}`];
    if (isProduction) {
      attributes.push("Secure");
    }
    return attributes.join("; ");
  }

  function setSessionCookie(response, sessionId, expiresAt) {
    const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
    response.setHeader("Set-Cookie", cookieAttributes(signSession(sessionId), maxAge));
  }

  function clearSessionCookie(response) {
    response.setHeader("Set-Cookie", cookieAttributes("", 0));
  }

  /** Validates the cookie and slides the idle expiry. Returns { sessionId, session } or null. */
  function readSession(request) {
    const sessionId = verifySignedSession(parseCookies(request)[SESSION_COOKIE]);
    const session = sessionId ? sessions.touch(sessionId) : null;
    return session ? { sessionId, session } : null;
  }

  // --------------------------------------------------------------- guards

  function getRequestIp(request) {
    // request.ip honours the "trust proxy" setting, so a client cannot spoof
    // X-Forwarded-For to dodge the login lockout or guestbook rate limit.
    return request.ip || request.socket?.remoteAddress || "unknown";
  }

  function getGuardKey(name, request) {
    return `${String(name || "").toLowerCase()}::${getRequestIp(request)}`;
  }

  function cleanupExpiredLoginGuards() {
    const now = Date.now();
    for (const [key, value] of loginGuards.entries()) {
      const lockExpired = !value.lockUntil || value.lockUntil <= now;
      const windowExpired = !value.lastAttemptAt || value.lastAttemptAt + LOCK_MS <= now;
      if (lockExpired && windowExpired) {
        loginGuards.delete(key);
      }
    }
  }

  function allowGuestbookPost(request) {
    const now = Date.now();
    for (const [key, value] of guestbookGuards.entries()) {
      if (value.windowStart + GUESTBOOK_WINDOW_MS <= now) {
        guestbookGuards.delete(key);
      }
    }
    const key = getRequestIp(request);
    const guard = guestbookGuards.get(key) || { windowStart: now, count: 0 };
    guard.count += 1;
    guestbookGuards.set(key, guard);
    return guard.count <= GUESTBOOK_MAX_POSTS;
  }

  function isTrustedOrigin(request) {
    const forwardedProto = request.headers["x-forwarded-proto"];
    const protocol = typeof forwardedProto === "string" ? forwardedProto.split(",")[0].trim() : request.protocol;
    const host = request.headers["x-forwarded-host"] || request.headers.host;
    const expectedOrigin = `${protocol}://${host}`;
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    if (origin) {
      return origin === expectedOrigin;
    }
    if (referer) {
      return referer.startsWith(`${expectedOrigin}/`) || referer === expectedOrigin;
    }
    return true;
  }

  function requireTrustedOrigin(request, response, next) {
    if (!isTrustedOrigin(request)) {
      response.status(403).json({ error: "forbidden_origin" });
      return;
    }
    next();
  }

  function requireStudioAuth(request, response, next) {
    const current = readSession(request);
    if (!current) {
      clearSessionCookie(response);
      response.status(401).json({ error: "unauthorized" });
      return;
    }
    setSessionCookie(response, current.sessionId, current.session.expiresAt);
    request.session = current.session;
    request.sessionId = current.sessionId;
    next();
  }

  // ---------------------------------------------------------------- app

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", parseTrustProxy(env.TRUST_PROXY));

  // Large bodies (base64 attachments, covers) are only accepted on authenticated
  // studio routes; public endpoints such as the guestbook get a small limit.
  app.use("/api/studio", express.json({ limit: "25mb" }));
  app.use(express.json({ limit: "100kb" }));

  app.use((_request, response, next) => {
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "same-origin");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "script-src 'self'",
        "connect-src 'self'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' data: blob: https:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "frame-src https://open.spotify.com",
      ].join("; ")
    );
    next();
  });

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, studioAvailable: true });
  });

  app.get("/api/bootstrap", (_request, response) => {
    const store = readStore();
    response.json({
      studioAvailable: true,
      articles: store.articles,
      projects: store.projects,
      siteContent: store.siteContent,
      guestbook: store.guestbook,
    });
  });

  app.get("/api/studio/session", (request, response) => {
    const current = readSession(request);
    if (!current) {
      clearSessionCookie(response);
      response.json({ authenticated: false, lockUntil: 0 });
      return;
    }
    setSessionCookie(response, current.sessionId, current.session.expiresAt);
    response.json({ authenticated: true, lockUntil: 0, expiresAt: current.session.expiresAt });
  });

  app.post("/api/studio/login", requireTrustedOrigin, async (request, response, next) => {
    try {
      cleanupExpiredLoginGuards();
      const inputUsername = String(request.body?.username || "");
      const inputPassword = String(request.body?.password || "");
      const guardKey = getGuardKey(inputUsername, request);
      const currentGuard = loginGuards.get(guardKey) || { attempts: 0, lockUntil: 0 };
      const now = Date.now();

      if (currentGuard.lockUntil && currentGuard.lockUntil > now) {
        response.status(429).json({ ok: false, reason: "locked", lockUntil: currentGuard.lockUntil });
        return;
      }

      const valid = await credentials.verify(inputUsername, inputPassword);
      if (!valid) {
        // A finished lock starts a fresh count.
        const previousAttempts = currentGuard.lockUntil && currentGuard.lockUntil <= now ? 0 : currentGuard.attempts;
        const attempts = previousAttempts + 1;
        const nextGuard = {
          attempts,
          lockUntil: attempts >= MAX_ATTEMPTS ? now + LOCK_MS : 0,
          lastAttemptAt: now,
        };
        loginGuards.set(guardKey, nextGuard);
        response.status(nextGuard.lockUntil ? 429 : 401).json({
          ok: false,
          reason: nextGuard.lockUntil ? "locked" : "invalid",
          lockUntil: nextGuard.lockUntil,
        });
        return;
      }

      loginGuards.delete(guardKey);
      const sessionId = sessions.create(inputUsername);
      const session = sessions.touch(sessionId);
      setSessionCookie(response, sessionId, session.expiresAt);
      response.json({ ok: true, expiresAt: session.expiresAt });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/studio/logout", requireTrustedOrigin, (request, response) => {
    const sessionId = verifySignedSession(parseCookies(request)[SESSION_COOKIE]);
    if (sessionId) {
      sessions.destroy(sessionId);
    }
    clearSessionCookie(response);
    response.json({ ok: true });
  });

  app.post("/api/studio/articles", requireTrustedOrigin, requireStudioAuth, (request, response) => {
    const { article, previousSlug = null } = request.body || {};
    if (!article || typeof article !== "object" || Array.isArray(article)) {
      response.status(400).json({ error: "invalid_article" });
      return;
    }

    const store = readStore();
    const { slug, existingIndex } = resolveSlug({
      items: store.articles,
      requested: article.slug,
      fallbackTitle: pickText(article.title, "en"),
      previousSlug: previousSlug ? String(previousSlug) : null,
      prefix: "article",
    });
    const existing = existingIndex >= 0 ? store.articles[existingIndex] : null;
    const stamped = {
      ...article,
      slug,
      // Editing an article keeps its original publish date; only updatedAt moves.
      date: existing?.date || formatArticleDate(new Date()),
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      store.articles[existingIndex] = stamped;
    } else {
      store.articles.unshift(stamped);
    }
    writeStore(store);
    response.json({ ok: true, slug, slugChanged: slug !== article.slug, articles: store.articles });
  });

  app.post("/api/studio/projects", requireTrustedOrigin, requireStudioAuth, (request, response) => {
    const { project, previousSlug = null } = request.body || {};
    if (!project || typeof project !== "object" || Array.isArray(project)) {
      response.status(400).json({ error: "invalid_project" });
      return;
    }

    const store = readStore();
    const { slug, existingIndex } = resolveSlug({
      items: store.projects,
      requested: project.slug,
      fallbackTitle: typeof project.title === "string" ? project.title : pickText(project.title, "en"),
      previousSlug: previousSlug ? String(previousSlug) : null,
      prefix: "project",
    });
    const stamped = { ...project, slug, updatedAt: project.updatedAt || new Date().toISOString() };
    if (existingIndex >= 0) {
      store.projects[existingIndex] = stamped;
    } else {
      store.projects.unshift(stamped);
    }
    writeStore(store);
    response.json({ ok: true, slug, slugChanged: slug !== project.slug, projects: store.projects });
  });

  app.post("/api/studio/projects/delete", requireTrustedOrigin, requireStudioAuth, (request, response) => {
    const slug = String(request.body?.slug || "");
    if (!slug) {
      response.status(400).json({ error: "invalid_slug" });
      return;
    }

    const store = readStore();
    store.projects = store.projects.filter((project) => project.slug !== slug);
    writeStore(store);
    response.json({ ok: true, projects: store.projects });
  });

  app.post("/api/studio/site-content", requireTrustedOrigin, requireStudioAuth, (request, response) => {
    const { siteContent } = request.body || {};
    if (!siteContent || typeof siteContent !== "object") {
      response.status(400).json({ error: "invalid_site_content" });
      return;
    }

    const store = readStore();
    store.siteContent = normalizeSiteContent(siteContent);
    writeStore(store);
    response.json({ ok: true, siteContent: store.siteContent });
  });

  app.post("/api/guestbook", requireTrustedOrigin, (request, response) => {
    const name = String(request.body?.name || "").trim();
    const message = String(request.body?.message || "").trim();

    if (!name || !message) {
      response.status(400).json({ error: "invalid_guestbook_entry" });
      return;
    }

    if (!allowGuestbookPost(request)) {
      response.status(429).json({ error: "rate_limited" });
      return;
    }

    const store = readStore();
    store.guestbook.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      name: name.slice(0, 80),
      message: message.slice(0, 600),
    });
    store.guestbook = store.guestbook.slice(0, 50);
    writeStore(store);
    response.json({ ok: true, guestbook: store.guestbook });
  });

  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "not_found" });
  });

  // ---------------------------------------------------- feeds and SEO

  function siteUrlFor(request) {
    return configuredSiteUrl || normalizeSiteUrl(`${request.protocol}://${request.get("host")}/`);
  }

  function siteIdentity(store) {
    const meta = store.siteContent.meta;
    const title = pickText(meta.browserTitle, feedLanguage) || meta.name || "Blog";
    const description = pickText(meta.intro, feedLanguage);
    return { meta, title, description };
  }

  app.get(["/rss.xml", "/feed.xml"], (request, response) => {
    const store = readStore();
    const siteUrl = siteUrlFor(request);
    const { title, description } = siteIdentity(store);
    response.type("application/rss+xml; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=600");
    response.send(
      buildRssFeed({
        siteUrl,
        title,
        description,
        language: feedLanguage,
        articles: store.articles,
        links: createLinkBuilder(siteUrl, "path"),
        feedUrl: `${siteUrl}rss.xml`,
      })
    );
  });

  app.get("/sitemap.xml", (request, response) => {
    const store = readStore();
    const siteUrl = siteUrlFor(request);
    response.type("application/xml; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=600");
    response.send(buildSitemap({ siteUrl, articles: store.articles, projects: store.projects, links: createLinkBuilder(siteUrl, "path") }));
  });

  app.get("/robots.txt", (request, response) => {
    response.type("text/plain; charset=utf-8");
    response.send(buildRobots(siteUrlFor(request)));
  });

  const indexFile = path.join(distDir, "index.html");
  let indexCache = null;
  function readIndexHtml() {
    try {
      const stat = fs.statSync(indexFile);
      if (!indexCache || indexCache.mtimeMs !== stat.mtimeMs) {
        indexCache = { mtimeMs: stat.mtimeMs, html: fs.readFileSync(indexFile, "utf8") };
      }
      return indexCache.html;
    } catch {
      return null;
    }
  }

  function sendShell(request, response, seo, status = 200) {
    const html = readIndexHtml();
    if (!html) {
      response.status(404).type("text/plain").send("Front end not built. Run `npm run build`.");
      return;
    }
    const siteUrl = siteUrlFor(request);
    response.status(status);
    response.type("html");
    response.setHeader("Cache-Control", "no-cache");
    response.send(
      injectSeo(html, { rssUrl: `${siteUrl}rss.xml`, ...seo }, { absoluteAssets: true })
    );
  }

  function siteSeo(request, store) {
    const { meta, title, description } = siteIdentity(store);
    const siteUrl = siteUrlFor(request);
    return {
      title,
      description,
      siteName: title,
      url: siteUrl,
      image: isPublicImage(meta.avatarImage) ? meta.avatarImage : "",
      rssTitle: title,
      jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: title, url: siteUrl, description },
    };
  }

  // Shareable /articles/<slug> and /projects/<slug> URLs: crawlers get real
  // meta tags, browsers are redirected into the HashRouter by src/main.jsx.
  app.get("/articles/:slug", (request, response) => {
    const store = readStore();
    const article = store.articles.find((item) => item.slug === request.params.slug);
    const base = siteSeo(request, store);
    if (!article) {
      sendShell(request, response, base, 404);
      return;
    }
    const url = createLinkBuilder(base.url, "path").article(article.slug);
    const title = pickText(article.title, feedLanguage);
    const description = pickText(article.excerpt, feedLanguage);
    const image = isPublicImage(article.coverImage) ? article.coverImage : base.image;
    const published = articlePublishedAt(article)?.toISOString();
    const modified = articleUpdatedAt(article)?.toISOString();
    const tags = String(article.tag || "").split("/").map((item) => item.trim()).filter(Boolean);
    sendShell(request, response, {
      ...base,
      title: `${title} / ${base.siteName}`,
      description,
      url,
      image,
      type: "article",
      publishedTime: published,
      modifiedTime: modified,
      tags,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        description,
        url,
        mainEntityOfPage: url,
        datePublished: published,
        dateModified: modified,
        keywords: tags.join(", ") || undefined,
        image: image || undefined,
        author: { "@type": "Person", name: store.siteContent.meta.name },
      },
    });
  });

  app.get("/projects/:slug", (request, response) => {
    const store = readStore();
    const project = store.projects.find((item) => item.slug === request.params.slug);
    const base = siteSeo(request, store);
    if (!project) {
      sendShell(request, response, base, 404);
      return;
    }
    const title = typeof project.title === "string" ? project.title : pickText(project.title, feedLanguage);
    sendShell(request, response, {
      ...base,
      title: `${title} / ${base.siteName}`,
      description: pickText(project.summary, feedLanguage),
      url: createLinkBuilder(base.url, "path").project(project.slug),
    });
  });

  if (fs.existsSync(distDir)) {
    // Vite emits content-hashed files under /assets, so they can be cached for a long time.
    app.use("/assets", express.static(path.join(distDir, "assets"), { immutable: true, maxAge: "1y" }));
    app.use(express.static(distDir, { index: false }));
  }

  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/api/") || !readIndexHtml()) {
      next();
      return;
    }
    sendShell(request, response, siteSeo(request, readStore()));
  });

  // Return JSON for body-parser errors (bad JSON, payload too large) instead of an HTML stack trace.
  app.use((error, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    const status = Number(error?.status || error?.statusCode) || 500;
    if (status >= 500) {
      logger.error(error);
    }
    response.status(status).json({ error: status === 413 ? "payload_too_large" : status >= 500 ? "server_error" : "bad_request" });
  });

  app.locals.ready = credentials.whenReady().then(() => ensureRuntimeStore());
  app.locals.sessions = sessions;
  app.locals.credentials = credentials;
  return app;
}

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { fileURLToPath } from "node:url";
import { articles as seedArticles, featuredProjects, siteMeta, uiText } from "./src/data/siteContent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.disable("x-powered-by");

const PORT = Number(process.env.PORT || 8787);
const SESSION_MS = 45 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SESSION_COOKIE = "studio_session";
const DEFAULT_USERNAME = process.env.STUDIO_USERNAME || "ADMIN";
const DEFAULT_PASSWORD = process.env.STUDIO_PASSWORD || "CHANGE_ME_123";
const DEFAULT_PASSWORD_HASH = process.env.STUDIO_PASSWORD_HASH?.trim() || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "template-dev-secret-change-me";

const runtimeDir = path.join(__dirname, "server", "data");
const storeFile = path.join(runtimeDir, "store.json");
const distDir = path.join(__dirname, "dist");

const sessions = new Map();
const loginGuards = new Map();

app.use(express.json({ limit: "25mb" }));

app.use((request, response, next) => {
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
      "frame-src https://open.spotify.com"
    ].join("; ")
  );
  next();
});

function formatArticleDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function ensureLocalizedMap(value, fallback = "") {
  if (value && typeof value === "object") {
    return {
      zh: value.zh ?? fallback,
      en: value.en ?? value.zh ?? fallback,
      ja: value.ja ?? value.en ?? value.zh ?? fallback,
      ko: value.ko ?? value.en ?? value.zh ?? fallback,
    };
  }

  return {
    zh: fallback,
    en: fallback,
    ja: fallback,
    ko: fallback,
  };
}

function normalizeSocialLink(link, index = 0) {
  return {
    label: String(link?.label || `Link ${index + 1}`),
    url: String(link?.url || ""),
    icon: String(link?.icon || "link"),
    iconDataUrl: typeof link?.iconDataUrl === "string" ? link.iconDataUrl : "",
  };
}

function normalizeCustomCard(card, index = 0) {
  return {
    id: String(card?.id || `card-${index + 1}`),
    eyebrow: ensureLocalizedMap(card?.eyebrow, ""),
    title: ensureLocalizedMap(card?.title, `Card ${index + 1}`),
    body: ensureLocalizedMap(card?.body, ""),
    linkLabel: ensureLocalizedMap(card?.linkLabel, ""),
    linkUrl: String(card?.linkUrl || ""),
  };
}

function buildDefaultSiteContent() {
  const editableKeys = [
    "navHome",
    "navArticles",
    "navProjects",
    "navAbout",
    "heroEyebrow",
    "heroTitle",
    "heroBody",
    "heroPrimary",
    "heroSecondary",
    "aboutTitle",
    "aboutBody",
    "featuredTitle",
    "articlesTitle",
    "allArticles",
    "articleIndexTitle",
    "articleIndexBody",
    "footer",
  ];

  return {
    meta: {
      name: siteMeta.name,
      email: siteMeta.email,
      location: siteMeta.location,
      role: ensureLocalizedMap(siteMeta.role, ""),
      intro: ensureLocalizedMap(siteMeta.intro, ""),
      stats: { ...siteMeta.stats },
      socialLinks: siteMeta.socialLinks.map(normalizeSocialLink),
      customCards: Array.isArray(siteMeta.customCards) ? siteMeta.customCards.map(normalizeCustomCard) : [],
    },
    text: Object.fromEntries(
      Object.entries(uiText).map(([lang, value]) => [
        lang,
        Object.fromEntries(editableKeys.map((key) => [key, value[key] ?? ""])),
      ])
    ),
  };
}

function buildDefaultStore() {
  const now = new Date().toISOString();

  return {
    articles: seedArticles.map((article, index) => ({
      ...article,
      slug: article.slug || `article-${index + 1}`,
      date: article.date || formatArticleDate(new Date()),
      updatedAt: article.updatedAt || now,
      attachments: Array.isArray(article.attachments) ? article.attachments : [],
      coverImage: article.coverImage || "",
      pinned: Boolean(article.pinned),
    })),
    projects: featuredProjects.map((project, index) => ({
      ...project,
      slug: project.slug || `project-${index + 1}`,
      metrics: Array.isArray(project.metrics) ? project.metrics : [],
    })),
    siteContent: buildDefaultSiteContent(),
    guestbook: [],
  };
}

function ensureRuntimeStore() {
  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(storeFile)) {
    fs.writeFileSync(storeFile, JSON.stringify(buildDefaultStore(), null, 2));
  }
}

function readStore() {
  ensureRuntimeStore();
  return JSON.parse(fs.readFileSync(storeFile, "utf8"));
}

function writeStore(nextStore) {
  ensureRuntimeStore();
  fs.writeFileSync(storeFile, JSON.stringify(nextStore, null, 2));
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
        return [key, decodeURIComponent(value)];
      })
  );
}

function createSignedSession(sessionId) {
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(sessionId).digest("hex");
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

  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(sessionId).digest("hex");
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  return valid ? sessionId : null;
}

function getRequestIp(request) {
  return request.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || request.ip || "unknown";
}

function getGuardKey(username, request) {
  return `${String(username || "").toLowerCase()}::${getRequestIp(request)}`;
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [key, value] of sessions.entries()) {
    if (value.expiresAt <= now) {
      sessions.delete(key);
    }
  }
}

function cleanupExpiredLoginGuards() {
  const now = Date.now();
  for (const [key, value] of loginGuards.entries()) {
    if (!value.lockUntil || value.lockUntil <= now) {
      loginGuards.delete(key);
    }
  }
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyPassword(password) {
  if (DEFAULT_PASSWORD_HASH) {
    return safeEqualText(sha256Hex(password), DEFAULT_PASSWORD_HASH);
  }

  return safeEqualText(password, DEFAULT_PASSWORD);
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

function setSessionCookie(response, sessionId) {
  const maxAge = Math.floor(SESSION_MS / 1000);
  const cookieAttributes = [
    `${SESSION_COOKIE}=${createSignedSession(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ];

  if (process.env.NODE_ENV === "production") {
    cookieAttributes.push("Secure");
  }

  response.setHeader(
    "Set-Cookie",
    cookieAttributes.join("; ")
  );
}

function clearSessionCookie(response) {
  const cookieAttributes = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  if (process.env.NODE_ENV === "production") {
    cookieAttributes.push("Secure");
  }
  response.setHeader("Set-Cookie", cookieAttributes.join("; "));
}

function requireTrustedOrigin(request, response, next) {
  if (!isTrustedOrigin(request)) {
    response.status(403).json({ error: "forbidden_origin" });
    return;
  }

  next();
}

function requireStudioAuth(request, response, next) {
  cleanupExpiredSessions();
  const cookies = parseCookies(request);
  const sessionId = verifySignedSession(cookies[SESSION_COOKIE]);
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session || session.expiresAt <= Date.now()) {
    if (sessionId) {
      sessions.delete(sessionId);
    }
    clearSessionCookie(response);
    response.status(401).json({ error: "unauthorized" });
    return;
  }

  session.expiresAt = Date.now() + SESSION_MS;
  sessions.set(sessionId, session);
  setSessionCookie(response, sessionId);
  request.session = session;
  request.sessionId = sessionId;
  next();
}

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
  cleanupExpiredSessions();
  const cookies = parseCookies(request);
  const sessionId = verifySignedSession(cookies[SESSION_COOKIE]);
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session || session.expiresAt <= Date.now()) {
    if (sessionId) {
      sessions.delete(sessionId);
    }
    clearSessionCookie(response);
    response.json({ authenticated: false, lockUntil: 0 });
    return;
  }

  session.expiresAt = Date.now() + SESSION_MS;
  sessions.set(sessionId, session);
  setSessionCookie(response, sessionId);
  response.json({ authenticated: true, lockUntil: 0 });
});

app.post("/api/studio/login", (request, response) => {
  cleanupExpiredLoginGuards();
  const username = String(request.body?.username || "");
  const password = String(request.body?.password || "");
  const guardKey = getGuardKey(username, request);
  const currentGuard = loginGuards.get(guardKey) || { attempts: 0, lockUntil: 0 };
  const now = Date.now();

  if (currentGuard.lockUntil && currentGuard.lockUntil > now) {
    response.status(429).json({ ok: false, reason: "locked", lockUntil: currentGuard.lockUntil });
    return;
  }

  const validUsername = safeEqualText(username, DEFAULT_USERNAME);
  const validPassword = verifyPassword(password);

  if (!validUsername || !validPassword) {
    const attempts = currentGuard.attempts + 1;
    const nextGuard = {
      attempts,
      lockUntil: attempts >= MAX_ATTEMPTS ? now + LOCK_MS : 0,
    };
    loginGuards.set(guardKey, nextGuard);
    response.status(nextGuard.lockUntil ? 429 : 401).json({
      ok: false,
      reason: nextGuard.lockUntil ? "locked" : "invalid",
      lockUntil: nextGuard.lockUntil,
    });
    return;
  }

  loginGuards.set(guardKey, { attempts: 0, lockUntil: 0 });
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, {
    username,
    expiresAt: now + SESSION_MS,
  });
  setSessionCookie(response, sessionId);
  response.json({ ok: true });
});

app.post("/api/studio/logout", requireTrustedOrigin, (request, response) => {
  const cookies = parseCookies(request);
  const sessionId = verifySignedSession(cookies[SESSION_COOKIE]);
  if (sessionId) {
    sessions.delete(sessionId);
  }
  clearSessionCookie(response);
  response.json({ ok: true });
});

app.post("/api/studio/articles", requireTrustedOrigin, requireStudioAuth, (request, response) => {
  const { article, previousSlug = null } = request.body || {};
  if (!article || typeof article !== "object") {
    response.status(400).json({ error: "invalid_article" });
    return;
  }

  const store = readStore();
  const stamped = {
    ...article,
    date: formatArticleDate(new Date()),
    updatedAt: new Date().toISOString(),
  };
  const currentSlug = previousSlug || stamped.slug;
  const existingIndex = store.articles.findIndex((item) => item.slug === currentSlug);
  if (existingIndex >= 0) {
    store.articles[existingIndex] = stamped;
  } else {
    store.articles.unshift(stamped);
  }
  writeStore(store);
  response.json({ ok: true, articles: store.articles });
});

app.post("/api/studio/projects", requireTrustedOrigin, requireStudioAuth, (request, response) => {
  const { project, previousSlug = null } = request.body || {};
  if (!project || typeof project !== "object") {
    response.status(400).json({ error: "invalid_project" });
    return;
  }

  const store = readStore();
  const currentSlug = previousSlug || project.slug;
  const existingIndex = store.projects.findIndex((item) => item.slug === currentSlug);
  if (existingIndex >= 0) {
    store.projects[existingIndex] = project;
  } else {
    store.projects.unshift(project);
  }
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
  store.siteContent = siteContent;
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

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/api/")) {
      next();
      return;
    }
    response.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  ensureRuntimeStore();
  console.log(`Template server running on http://127.0.0.1:${PORT}`);
});

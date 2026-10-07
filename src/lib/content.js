// Content model: normalisers, slugs, dates and attachment tokens shared by the site and the studio.
// Extracted from App.jsx.
import { siteMeta, uiText } from "../data/siteContent";
import templateAvatar from "../assets/template-avatar.svg";

export const EDITABLE_TEXT_KEYS = [
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
export const VALID_BACKGROUND_PRESETS = new Set(["none", "antigravity", "xflow"]);
export const BACKGROUND_PRESETS = [
  {
    code: "xflow",
    label: { zh: "X Flow", en: "X Flow", ja: "X Flow", ko: "X Flow" },
    eyebrow: { zh: "Hybrid UI", en: "Hybrid UI", ja: "Hybrid UI", ko: "Hybrid UI" },
  },
  {
    code: "none",
    label: { zh: "默认", en: "Default", ja: "Default", ko: "Default" },
    eyebrow: { zh: "Blueprint", en: "Blueprint", ja: "Blueprint", ko: "Blueprint" },
  },
  {
    code: "antigravity",
    label: { zh: "反重力", en: "Antigravity", ja: "Antigravity", ko: "Antigravity" },
    eyebrow: { zh: "Google-like", en: "Google-like", ja: "Google-like", ko: "Google-like" },
  },
];

export const STUDIO_BACKGROUND_PRESETS = BACKGROUND_PRESETS.filter((preset) => VALID_BACKGROUND_PRESETS.has(preset.code));
export function normalizeBackgroundPreset(value) {
  return VALID_BACKGROUND_PRESETS.has(value) ? value : "none";
}

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function parseArticleDate(value) {
  if (!value) {
    return new Date();
  }

  if (typeof value === "string" && /^\d{4}\.\d{2}\.\d{2}$/.test(value)) {
    return new Date(`${value.replace(/\./g, "-")}T12:00:00`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

export function formatArticleDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export function ensureLocalizedMap(value, fallback = "") {
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

export function ensureLocalizedList(value) {
  if (Array.isArray(value)) {
    return {
      zh: value.filter(Boolean),
      en: value.filter(Boolean),
      ja: value.filter(Boolean),
      ko: value.filter(Boolean),
    };
  }

  if (value && typeof value === "object") {
    const normalize = (entry) =>
      Array.isArray(entry)
        ? entry.map((item) => String(item).trim()).filter(Boolean)
        : String(entry || "")
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);

    return {
      zh: normalize(value.zh),
      en: normalize(value.en ?? value.zh),
      ja: normalize(value.ja ?? value.en ?? value.zh),
      ko: normalize(value.ko ?? value.en ?? value.zh),
    };
  }

  const empty = [];
  return { zh: empty, en: empty, ja: empty, ko: empty };
}

export function normalizeArticle(article, index) {
  // 统一文章结构，确保后台、前台、导出逻辑都读取同一份字段。
  const updatedAt = article.updatedAt ?? parseArticleDate(article.date).toISOString();
  const title = ensureLocalizedMap(article.title, `Untitled ${index + 1}`);
  const excerpt = ensureLocalizedMap(article.excerpt, "");
  const content = ensureLocalizedMap(
    article.content,
    excerpt.en || excerpt.zh || excerpt.ja || excerpt.ko || ""
  );

  return {
    slug: article.slug || `article-${index + 1}`,
    tag: article.tag || "NOTE",
    title,
    excerpt,
    content,
    date: article.date || formatArticleDate(parseArticleDate(updatedAt)),
    updatedAt,
    readTime: article.readTime || "5 min",
    attachments: Array.isArray(article.attachments) ? article.attachments : [],
    coverImage: article.coverImage ?? "",
    pinned: Boolean(article.pinned),
    footnotes: ensureLocalizedList(article.footnotes),
  };
}

export function sortArticles(list) {
  return [...list].sort(
    (left, right) => parseArticleDate(right.updatedAt).getTime() - parseArticleDate(left.updatedAt).getTime()
  );
}

export function cloneArticle(article) {
  return {
    ...article,
    title: { ...article.title },
    excerpt: { ...article.excerpt },
    content: { ...article.content },
    attachments: [...article.attachments],
    coverImage: article.coverImage || "",
    pinned: Boolean(article.pinned),
    footnotes: {
      zh: [...(article.footnotes?.zh || [])],
      en: [...(article.footnotes?.en || [])],
      ja: [...(article.footnotes?.ja || [])],
      ko: [...(article.footnotes?.ko || [])],
    },
  };
}

export function normalizeProject(project, index) {
  return {
    slug: project.slug || `project-${index + 1}`,
    category: ensureLocalizedMap(project.category, ""),
    title: project.title || `Project ${index + 1}`,
    summary: ensureLocalizedMap(project.summary, ""),
    metrics: Array.isArray(project.metrics) ? project.metrics : [],
    challenge: ensureLocalizedMap(project.challenge, ""),
    solution: ensureLocalizedMap(project.solution, ""),
    outcome: ensureLocalizedMap(project.outcome, ""),
    updatedAt: project.updatedAt || new Date().toISOString(),
  };
}

export function cloneProject(project) {
  return {
    ...project,
    category: { ...project.category },
    summary: { ...project.summary },
    metrics: [...project.metrics],
    challenge: { ...project.challenge },
    solution: { ...project.solution },
    outcome: { ...project.outcome },
    updatedAt: project.updatedAt,
  };
}

export function normalizeSocialLink(link, index = 0) {
  return {
    label: String(link?.label || `Link ${index + 1}`),
    url: String(link?.url || ""),
    icon: String(link?.icon || "link"),
    iconDataUrl: typeof link?.iconDataUrl === "string" ? link.iconDataUrl : "",
  };
}

export function createBlankSocialLink() {
  return {
    label: "",
    url: "",
    icon: "link",
    iconDataUrl: "",
  };
}

export function normalizeCustomCard(card, index = 0) {
  return {
    id: String(card?.id || `card-${index + 1}`),
    eyebrow: ensureLocalizedMap(card?.eyebrow, ""),
    title: ensureLocalizedMap(card?.title, `Card ${index + 1}`),
    body: ensureLocalizedMap(card?.body, ""),
    linkLabel: ensureLocalizedMap(card?.linkLabel, ""),
    linkUrl: String(card?.linkUrl || ""),
  };
}

export function createBlankCustomCard() {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eyebrow: { zh: "", en: "", ja: "", ko: "" },
    title: { zh: "", en: "", ja: "", ko: "" },
    body: { zh: "", en: "", ja: "", ko: "" },
    linkLabel: { zh: "", en: "", ja: "", ko: "" },
    linkUrl: "",
  };
}

export function normalizePinnedSpace(item, index = 0) {
  return {
    id: String(item?.id || `space-${index + 1}`),
    kind: ["article", "project", "link", "audio"].includes(item?.kind) ? item.kind : "article",
    articleSlug: String(item?.articleSlug || ""),
    projectSlug: String(item?.projectSlug || ""),
    title: ensureLocalizedMap(item?.title, ""),
    body: ensureLocalizedMap(item?.body, ""),
    url: String(item?.url || ""),
    audioTitle: ensureLocalizedMap(item?.audioTitle, ""),
    audioArtist: ensureLocalizedMap(item?.audioArtist, ""),
    audioSrc: String(item?.audioSrc || ""),
  };
}

export function createBlankPinnedSpace() {
  return {
    id: `space-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "article",
    articleSlug: "",
    projectSlug: "",
    title: ensureLocalizedMap(""),
    body: ensureLocalizedMap(""),
    url: "",
    audioTitle: ensureLocalizedMap(""),
    audioArtist: ensureLocalizedMap(""),
    audioSrc: "",
  };
}

export function createBlankProject() {
  return {
    slug: "",
    category: { zh: "", en: "", ja: "", ko: "" },
    title: "",
    summary: { zh: "", en: "", ja: "", ko: "" },
    metrics: [],
    challenge: { zh: "", en: "", ja: "", ko: "" },
    solution: { zh: "", en: "", ja: "", ko: "" },
    outcome: { zh: "", en: "", ja: "", ko: "" },
    updatedAt: new Date().toISOString(),
  };
}

export function createBlankArticle() {
  const now = new Date();
  return {
    slug: "",
    tag: "NOTE / NEW",
    title: { zh: "", en: "", ja: "", ko: "" },
    excerpt: { zh: "", en: "", ja: "", ko: "" },
    content: { zh: "", en: "", ja: "", ko: "" },
    date: formatArticleDate(now),
    updatedAt: now.toISOString(),
    readTime: "4 min",
    attachments: [],
    coverImage: "",
    pinned: false,
    footnotes: { zh: [], en: [], ja: [], ko: [] },
  };
}

export function slugifyHeading(value) {
  return slugify(value).slice(0, 48);
}

export function extractArticleSections(content = "") {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(##|###)\s+/.test(line))
    .map((line, index) => {
      const level = line.startsWith("###") ? 3 : 2;
      const title = line.replace(/^(##|###)\s+/, "").trim();
      return {
        id: slugifyHeading(`${title}-${index}`),
        title,
        level,
      };
    });
}

export function formatRelativeTime(value, language) {
  const localeMap = {
    zh: "zh-CN",
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
  };

  const formatter = new Intl.RelativeTimeFormat(localeMap[language] || "en-US", { numeric: "auto" });
  const diff = parseArticleDate(value).getTime() - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (Math.abs(diff) < hour) {
    return formatter.format(Math.round(diff / minute), "minute");
  }

  if (Math.abs(diff) < day) {
    return formatter.format(Math.round(diff / hour), "hour");
  }

  if (Math.abs(diff) < week) {
    return formatter.format(Math.round(diff / day), "day");
  }

  return formatter.format(Math.round(diff / week), "week");
}

export function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const kind = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("audio/")
          ? "audio"
          : file.type.startsWith("video/")
            ? "video"
            : "file";

      resolve({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        kind,
        dataUrl: reader.result,
      });
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function getAttachmentToken(id) {
  return `[[attachment:${id}]]`;
}

export function contentHasAttachment(content = "", attachmentId) {
  return content.includes(getAttachmentToken(attachmentId));
}

export function insertAttachmentIntoContent(content = "", attachmentId) {
  const token = getAttachmentToken(attachmentId);
  if (contentHasAttachment(content, attachmentId)) {
    return content;
  }

  if (!content.trim()) {
    return token;
  }

  return `${content}\n\n${token}`;
}

export function buildDefaultSiteContent() {
  const textContent = Object.fromEntries(
    Object.entries(uiText).map(([lang, value]) => [
      lang,
      Object.fromEntries(EDITABLE_TEXT_KEYS.map((key) => [key, value[key] ?? ""])),
    ])
  );

  return {
    meta: {
      name: siteMeta.name,
      email: siteMeta.email,
      location: siteMeta.location,
      avatarImage: templateAvatar,
      browserTitle: ensureLocalizedMap(siteMeta.name, siteMeta.name),
      backgroundPreset: "none",
      backgroundImage: "",
      role: ensureLocalizedMap(siteMeta.role, ""),
      intro: ensureLocalizedMap(siteMeta.intro, ""),
      homeLayout: "magazine",
      stats: { ...siteMeta.stats },
      socialLinks: siteMeta.socialLinks.map(normalizeSocialLink),
      customCards: Array.isArray(siteMeta.customCards) ? siteMeta.customCards.map(normalizeCustomCard) : [],
      homeCardOverrides: {},
      pinnedSpaces: [],
    },
    text: textContent,
  };
}

export function normalizeSiteContent(content) {
  const defaults = buildDefaultSiteContent();
  return {
    meta: {
      ...defaults.meta,
      ...(content?.meta ?? {}),
      avatarImage:
        typeof content?.meta?.avatarImage === "string" && content.meta.avatarImage
          ? content.meta.avatarImage
          : defaults.meta.avatarImage,
      browserTitle: ensureLocalizedMap(content?.meta?.browserTitle ?? defaults.meta.browserTitle, defaults.meta.name),
      backgroundPreset:
        typeof content?.meta?.backgroundPreset === "string"
          ? normalizeBackgroundPreset(content.meta.backgroundPreset)
          : defaults.meta.backgroundPreset,
      backgroundImage:
        typeof content?.meta?.backgroundImage === "string" ? content.meta.backgroundImage : defaults.meta.backgroundImage,
      role: ensureLocalizedMap(content?.meta?.role ?? defaults.meta.role, ""),
      intro: ensureLocalizedMap(content?.meta?.intro ?? defaults.meta.intro, ""),
      homeLayout: ["magazine", "archive", "cards"].includes(content?.meta?.homeLayout) ? content.meta.homeLayout : defaults.meta.homeLayout,
      stats: {
        ...defaults.meta.stats,
        ...(content?.meta?.stats ?? {}),
      },
      socialLinks: Array.isArray(content?.meta?.socialLinks)
        ? content.meta.socialLinks.map(normalizeSocialLink)
        : defaults.meta.socialLinks.map(normalizeSocialLink),
      customCards: Array.isArray(content?.meta?.customCards)
        ? content.meta.customCards.map(normalizeCustomCard)
        : defaults.meta.customCards.map(normalizeCustomCard),
      homeCardOverrides:
        content?.meta?.homeCardOverrides && typeof content.meta.homeCardOverrides === "object"
          ? content.meta.homeCardOverrides
          : defaults.meta.homeCardOverrides,
      pinnedSpaces: Array.isArray(content?.meta?.pinnedSpaces)
        ? content.meta.pinnedSpaces.map(normalizePinnedSpace)
        : defaults.meta.pinnedSpaces.map(normalizePinnedSpace),
    },
    text: Object.fromEntries(
      Object.keys(defaults.text).map((lang) => [
        lang,
        {
          ...defaults.text[lang],
          ...(content?.text?.[lang] ?? {}),
        },
      ])
    ),
  };
}

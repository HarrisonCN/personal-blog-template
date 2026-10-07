// Store shape and normalisers for server/data/store.json.
import { articles as seedArticles, featuredProjects, siteMeta, uiText } from "../../src/data/siteContent.js";

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

export function normalizeSocialLink(link, index = 0) {
  return {
    label: String(link?.label || `Link ${index + 1}`),
    url: String(link?.url || ""),
    icon: String(link?.icon || "link"),
    iconDataUrl: typeof link?.iconDataUrl === "string" ? link.iconDataUrl : "",
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

export function normalizeSiteContent(content) {
  const defaults = buildDefaultSiteContent();

  return {
    meta: {
      ...defaults.meta,
      ...(content?.meta ?? {}),
      avatarImage:
        typeof content?.meta?.avatarImage === "string" ? content.meta.avatarImage : defaults.meta.avatarImage,
      browserTitle: ensureLocalizedMap(content?.meta?.browserTitle ?? defaults.meta.browserTitle, defaults.meta.name),
      backgroundPreset:
        typeof content?.meta?.backgroundPreset === "string" ? content.meta.backgroundPreset : defaults.meta.backgroundPreset,
      backgroundImage:
        typeof content?.meta?.backgroundImage === "string" ? content.meta.backgroundImage : defaults.meta.backgroundImage,
      role: ensureLocalizedMap(content?.meta?.role ?? defaults.meta.role, ""),
      intro: ensureLocalizedMap(content?.meta?.intro ?? defaults.meta.intro, ""),
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

export function buildDefaultSiteContent() {
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
      avatarImage: "",
      browserTitle: ensureLocalizedMap(siteMeta.name, siteMeta.name),
      backgroundPreset: "none",
      backgroundImage: "",
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

export function buildDefaultStore() {
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

export function normalizeStore(store) {
  const defaults = buildDefaultStore();

  return {
    articles: Array.isArray(store?.articles) ? store.articles : defaults.articles,
    projects: Array.isArray(store?.projects) ? store.projects : defaults.projects,
    siteContent: normalizeSiteContent(store?.siteContent ?? defaults.siteContent),
    guestbook: Array.isArray(store?.guestbook) ? store.guestbook : defaults.guestbook,
  };
}

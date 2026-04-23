import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";
import Reveal from "./components/Reveal";
import templateAvatar from "./assets/template-avatar.svg";
import {
  articles as seedArticles,
  featuredProjects,
  fonts,
  languages,
  playlist,
  siteMeta,
  uiText,
} from "./data/siteContent";

const PALETTE_STORAGE_KEY = "template-palette";
const GUESTBOOK_STORAGE_KEY = "template-guestbook";
const STUDIO_MAX_ATTEMPTS = 5;
const STUDIO_LOCK_MS = 15 * 60 * 1000;
const EDITABLE_TEXT_KEYS = [
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
const LEGACY_PALETTES = {
  ocean: { h: 198, s: 49, v: 100 },
  mint: { h: 154, s: 56, v: 91 },
  rose: { h: 336, s: 46, v: 100 },
  mono: { h: 217, s: 15, v: 85 },
};
const DEFAULT_PALETTE = { h: 198, s: 30, v: 100 };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hsvToRgb(h, s, v) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const val = clamp(v, 0, 100) / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function hsvToHex(h, s, v) {
  return rgbToHex(hsvToRgb(h, s, v));
}

function parseStoredPalette(value) {
  if (!value) {
    return DEFAULT_PALETTE;
  }

  if (LEGACY_PALETTES[value]) {
    return LEGACY_PALETTES[value];
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed?.h === "number" && typeof parsed?.s === "number" && typeof parsed?.v === "number") {
      return {
        h: clamp(parsed.h, 0, 360),
        s: clamp(parsed.s, 0, 100),
        v: clamp(parsed.v, 0, 100),
      };
    }
  } catch {}

  return DEFAULT_PALETTE;
}

const fallbackCopy = {
  zh: {
    navStudio: "开发者编辑",
    editedLabel: "最后编辑于",
    saveArticle: "保存文章",
    createArticle: "新建文章",
    openArticle: "查看文章",
    manageArticles: "管理文章",
    studioTitle: "开发者编辑",
    studioBody: "在这里新增文章、补充图片和音频文件，也能继续编辑以前写过的内容。",
    studioHint: "写作台登录和内容保存现在由服务端处理，不再暴露在前端。",
    loginTitle: "登录开发者编辑",
    loginBody: "输入由服务端校验的账户名和密码后才能进入写作台。",
    username: "账户名",
    password: "密码",
    login: "登录",
    logout: "退出登录",
    loginError: "账户名或密码错误",
    articleTitle: "标题",
    articleExcerpt: "摘要",
    articleContent: "正文",
    articleTag: "标签",
    articleReadTime: "阅读时长",
    articleSlug: "链接标识",
    articleLanguage: "编辑语言",
    uploadFiles: "上传图片/音频/视频/文件",
    attachments: "附件展示",
    noAttachments: "还没有上传附件",
    articleSaved: "文章已保存",
    articleListTitle: "已有文章",
    newDraftTitle: "新文章",
    attachmentCount: "个附件",
    mediaImage: "图片",
    mediaAudio: "音频",
    mediaVideo: "视频",
    mediaFile: "文件",
    remove: "删除",
    preview: "预览",
    studioEntry: "进入后台",
    articleEmpty: "这篇文章还没有正文内容。",
    insertAttachment: "插入到正文",
    insertedAttachment: "已插入正文",
    unplacedAttachments: "未插入正文的附件",
    contentEditorTitle: "网页内容编辑",
    contentEditorBody: "这里可以直接修改首页和站内主要文案，保存后页面会立即使用新内容。",
    saveSiteContent: "保存网站内容",
    siteContentSaved: "网站内容已保存",
    brandName: "站点名称",
    brandEmail: "联系邮箱",
    brandLocation: "所在地区",
    roleLabel: "个人角色",
    introLabel: "个人介绍",
    statProjects: "项目数量",
    statEssays: "文章数量",
    statLabs: "实验数量",
    loginLocked: "登录失败次数过多，请稍后再试",
    sessionExpired: "写作台会话已过期，请重新登录",
    projectsEditorTitle: "项目编辑",
    projectsEditorBody: "这里可以新增、修改项目卡片和项目详情内容。",
    saveProject: "保存项目",
    createProject: "新建项目",
    projectSaved: "项目已保存",
    projectListTitle: "已有项目",
    projectTitle: "项目标题",
    projectCategory: "项目分类",
    projectSummary: "项目摘要",
    projectMetrics: "技术标签",
    projectChallenge: "问题",
    projectSolution: "方案",
    projectOutcome: "结果",
    articleSearch: "搜索文章",
    articleSearchPlaceholder: "输入标题、摘要或标签",
    allTags: "全部标签",
    noArticleResults: "没有匹配的文章",
    readingProgress: "阅读进度",
    copyLink: "复制链接",
    linkCopied: "链接已复制",
    nowTitle: "Now",
    nowBody: "正在打磨个人博客、整理长期内容系统，并持续做界面实验与项目写作。",
    nowStatusA: "写博客后台",
    nowStatusB: "做项目重构",
    nowStatusC: "整理内容资产",
    socialEditorTitle: "社交平台链接",
    socialEditorBody: "这里可以修改社交平台名称、链接和图标，支持上传自定义图标。",
    addSocialLink: "新增社交链接",
    socialLabel: "平台名称",
    socialUrl: "平台链接",
    socialIcon: "图标类型",
    uploadSocialIcon: "上传图标",
    removeSocialLink: "删除链接",
    customCardsTitle: "自定义卡片",
    customCardsBody: "新增首页卡片，自定义标题、正文和跳转链接。",
    addCustomCard: "新增卡片",
    removeCustomCard: "删除卡片",
    cardEyebrow: "卡片眉标",
    cardTitle: "卡片标题",
    cardBody: "卡片正文",
    cardLinkLabel: "按钮文字",
    cardLinkUrl: "按钮链接",
  },
  en: {
    navStudio: "Developer Editor",
    editedLabel: "Last edited",
    saveArticle: "Save Article",
    createArticle: "New Article",
    openArticle: "Open Article",
    manageArticles: "Manage Articles",
    studioTitle: "Developer Editor",
    studioBody: "Create, revise, and attach media to articles from one local dashboard.",
    studioHint: "Studio login and content writes are now handled by the server instead of front-end storage.",
    loginTitle: "Developer Editor Login",
    loginBody: "Sign in with server-validated credentials to enter the studio.",
    username: "Username",
    password: "Password",
    login: "Sign In",
    logout: "Log Out",
    loginError: "Incorrect username or password",
    articleTitle: "Title",
    articleExcerpt: "Excerpt",
    articleContent: "Content",
    articleTag: "Tag",
    articleReadTime: "Read Time",
    articleSlug: "Slug",
    articleLanguage: "Editing Language",
    uploadFiles: "Upload images / audio / video / files",
    attachments: "Attachments",
    noAttachments: "No attachments yet",
    articleSaved: "Article saved",
    articleListTitle: "Published / Drafted",
    newDraftTitle: "New Article",
    attachmentCount: "attachments",
    mediaImage: "Image",
    mediaAudio: "Audio",
    mediaVideo: "Video",
    mediaFile: "File",
    remove: "Remove",
    preview: "Preview",
    studioEntry: "Open Studio",
    articleEmpty: "This article has no body content yet.",
    insertAttachment: "Insert Into Body",
    insertedAttachment: "Inserted In Body",
    unplacedAttachments: "Unplaced Attachments",
    contentEditorTitle: "Site Content Editor",
    contentEditorBody: "Edit homepage and site copy here, then save to update the live page immediately.",
    saveSiteContent: "Save Site Content",
    siteContentSaved: "Site content saved",
    brandName: "Site Name",
    brandEmail: "Contact Email",
    brandLocation: "Location",
    uploadAvatar: "Upload Avatar",
    removeAvatar: "Reset Avatar",
    roleLabel: "Role",
    introLabel: "Intro",
    statProjects: "Projects Count",
    statEssays: "Articles Count",
    statLabs: "Labs Count",
    loginLocked: "Too many failed attempts. Try again later.",
    sessionExpired: "Studio session expired. Please sign in again.",
    projectsEditorTitle: "Project Editor",
    projectsEditorBody: "Create and revise project cards and project detail content here.",
    saveProject: "Save Project",
    createProject: "New Project",
    projectSaved: "Project saved",
    projectListTitle: "Projects",
    projectTitle: "Project Title",
    projectCategory: "Project Category",
    projectSummary: "Project Summary",
    projectMetrics: "Tech Tags",
    projectChallenge: "Challenge",
    projectSolution: "Solution",
    projectOutcome: "Outcome",
    articleSearch: "Search Articles",
    articleSearchPlaceholder: "Search title, excerpt, or tag",
    allTags: "All Tags",
    noArticleResults: "No matching articles",
    readingProgress: "Reading Progress",
    copyLink: "Copy Link",
    linkCopied: "Link copied",
    nowTitle: "Now",
    nowBody: "Building the blog as an evolving personal system, refining the writing workflow, and continuing interface experiments.",
    nowStatusA: "Shipping the studio",
    nowStatusB: "Refining project pages",
    nowStatusC: "Organizing content assets",
    socialEditorTitle: "Social Links",
    socialEditorBody: "Edit platform names, URLs, and icons here. Custom icon uploads are supported.",
    addSocialLink: "Add Social Link",
    socialLabel: "Platform Name",
    socialUrl: "Platform URL",
    socialIcon: "Icon Type",
    uploadSocialIcon: "Upload Icon",
    removeSocialLink: "Remove Link",
    customCardsTitle: "Custom Cards",
    customCardsBody: "Create homepage cards with your own title, copy, and destination link.",
    addCustomCard: "Add Card",
    removeCustomCard: "Remove Card",
    cardEyebrow: "Card Eyebrow",
    cardTitle: "Card Title",
    cardBody: "Card Body",
    cardLinkLabel: "Button Label",
    cardLinkUrl: "Button URL",
    paletteLabel: "Palette",
    coverImage: "Cover Image",
    uploadCover: "Upload Cover",
    pinnedArticle: "Pinned Article",
    tocTitle: "Contents",
    guestbookTitle: "Guestbook",
    guestbookBody: "Leave a note here.",
    guestbookName: "Name",
    guestbookMessage: "Message",
    submitMessage: "Post Message",
    guestbookEmpty: "No messages yet",
  },
};

function getCopy(language) {
  if (fallbackCopy[language]) {
    return {
      ...fallbackCopy.en,
      ...fallbackCopy[language],
    };
  }

  return fallbackCopy.en;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parseArticleDate(value) {
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

function normalizeArticle(article, index) {
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
  };
}

function sortArticles(list) {
  return [...list].sort(
    (left, right) => parseArticleDate(right.updatedAt).getTime() - parseArticleDate(left.updatedAt).getTime()
  );
}

function cloneArticle(article) {
  return {
    ...article,
    title: { ...article.title },
    excerpt: { ...article.excerpt },
    content: { ...article.content },
    attachments: [...article.attachments],
    coverImage: article.coverImage || "",
    pinned: Boolean(article.pinned),
  };
}

function normalizeProject(project, index) {
  return {
    slug: project.slug || `project-${index + 1}`,
    category: ensureLocalizedMap(project.category, ""),
    title: project.title || `Project ${index + 1}`,
    summary: ensureLocalizedMap(project.summary, ""),
    metrics: Array.isArray(project.metrics) ? project.metrics : [],
    challenge: ensureLocalizedMap(project.challenge, ""),
    solution: ensureLocalizedMap(project.solution, ""),
    outcome: ensureLocalizedMap(project.outcome, ""),
  };
}

function cloneProject(project) {
  return {
    ...project,
    category: { ...project.category },
    summary: { ...project.summary },
    metrics: [...project.metrics],
    challenge: { ...project.challenge },
    solution: { ...project.solution },
    outcome: { ...project.outcome },
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

function createBlankSocialLink() {
  return {
    label: "",
    url: "",
    icon: "link",
    iconDataUrl: "",
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

function createBlankCustomCard() {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eyebrow: { zh: "", en: "", ja: "", ko: "" },
    title: { zh: "", en: "", ja: "", ko: "" },
    body: { zh: "", en: "", ja: "", ko: "" },
    linkLabel: { zh: "", en: "", ja: "", ko: "" },
    linkUrl: "",
  };
}

function getSiteAvatar(meta, fallbackImage) {
  return typeof meta?.avatarImage === "string" && meta.avatarImage ? meta.avatarImage : fallbackImage;
}

function createBlankProject() {
  return {
    slug: "",
    category: { zh: "", en: "", ja: "", ko: "" },
    title: "",
    summary: { zh: "", en: "", ja: "", ko: "" },
    metrics: [],
    challenge: { zh: "", en: "", ja: "", ko: "" },
    solution: { zh: "", en: "", ja: "", ko: "" },
    outcome: { zh: "", en: "", ja: "", ko: "" },
  };
}

function createBlankArticle() {
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
  };
}

function slugifyHeading(value) {
  return slugify(value).slice(0, 48);
}

function extractArticleSections(content = "") {
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

function formatRelativeTime(value, language) {
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

function fileToAttachment(file) {
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

function getAttachmentToken(id) {
  return `[[attachment:${id}]]`;
}

function contentHasAttachment(content = "", attachmentId) {
  return content.includes(getAttachmentToken(attachmentId));
}

function insertAttachmentIntoContent(content = "", attachmentId) {
  const token = getAttachmentToken(attachmentId);
  if (contentHasAttachment(content, attachmentId)) {
    return content;
  }

  if (!content.trim()) {
    return token;
  }

  return `${content}\n\n${token}`;
}

function renderArticleContent(content = "", attachments, copy) {
  const rendered = [];
  const lines = content.split("\n");

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const attachmentToken = line.match(/^\[\[attachment:([a-zA-Z0-9-]+)\]\]$/);
    if (attachmentToken) {
      const attachment = attachments.find((item) => item.id === attachmentToken[1]);
      if (attachment) {
        rendered.push({
          type: "attachment",
          key: `attachment-${attachment.id}-${index}`,
          value: attachment,
        });
      }
      return;
    }

    if (/^###\s+/.test(line) || /^##\s+/.test(line)) {
      const level = line.startsWith("###") ? 3 : 2;
      const title = line.replace(/^(##|###)\s+/, "").trim();
      rendered.push({
        type: "heading",
        key: `heading-${index}`,
        value: title,
        level,
        id: slugifyHeading(`${title}-${index}`),
      });
      return;
    }

    rendered.push({
      type: "text",
      key: `text-${index}`,
      value: line,
    });
  });

  const remainingAttachments = attachments.filter(
    (attachment) => !contentHasAttachment(content, attachment.id)
  );

  return { rendered, remainingAttachments };
}

function usePreferences() {
  const [theme, setTheme] = useState(() => {
    const storedTheme = window.localStorage.getItem("template-theme");
    if (storedTheme) {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [language, setLanguage] = useState(() => window.localStorage.getItem("template-language") ?? "zh");
  const [font, setFont] = useState(() => window.localStorage.getItem("template-font") ?? "outfit");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("template-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("template-language", language);
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.font = font;
    window.localStorage.setItem("template-font", font);
  }, [font]);

  return { theme, setTheme, language, setLanguage, font, setFont };
}

function usePalette() {
  const [palette, setPalette] = useState(() => parseStoredPalette(window.localStorage.getItem(PALETTE_STORAGE_KEY)));

  useEffect(() => {
    const accent = hsvToHex(palette.h, palette.s, palette.v);
    const warmHue = (palette.h + 26) % 360;
    const warmSat = clamp(palette.s * 0.78 + 12, 18, 100);
    const warmVal = clamp(palette.v * 0.94 + 2, 20, 100);
    const warm = hsvToHex(warmHue, warmSat, warmVal);

    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-warm", warm);
    window.localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palette));
  }, [palette]);

  return { palette, setPalette };
}

function useGlassTracking(pathname) {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return undefined;
    }

    const cards = Array.from(document.querySelectorAll(".glass-card")).map((card) => ({
      card,
      rect: card.getBoundingClientRect(),
      visible: true,
    }));
    const root = document.documentElement;
    let frameId = 0;
    let rectFrameId = 0;
    let latestPointer = null;
    let observer;

    const resetCard = (card) => {
      card.style.setProperty("--mouse-x", `${card.clientWidth / 2}px`);
      card.style.setProperty("--mouse-y", `${card.clientHeight / 2}px`);
      card.style.setProperty("--rotate-x", "0deg");
      card.style.setProperty("--rotate-y", "0deg");
      card.style.setProperty("--light-opacity", "0");
    };

    const measureCards = () => {
      rectFrameId = 0;
      cards.forEach((entry) => {
        if (!entry.visible) {
          return;
        }
        entry.rect = entry.card.getBoundingClientRect();
      });
    };

    const scheduleMeasure = () => {
      if (!rectFrameId) {
        rectFrameId = window.requestAnimationFrame(measureCards);
      }
    };

    const updateCard = (entry, clientX, clientY, active) => {
      const { card, rect } = entry;
      const clampedX = Math.min(Math.max(clientX, rect.left), rect.right);
      const clampedY = Math.min(Math.max(clientY, rect.top), rect.bottom);
      const localX = clampedX - rect.left;
      const localY = clampedY - rect.top;
      const ratioX = rect.width ? localX / rect.width : 0.5;
      const ratioY = rect.height ? localY / rect.height : 0.5;
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      const distance = Math.hypot(dx, dy);
      const falloff = 180;
      const proximity = active ? 1 : Math.max(0, 1 - distance / falloff);

      card.style.setProperty("--mouse-x", `${localX}px`);
      card.style.setProperty("--mouse-y", `${localY}px`);
      card.style.setProperty("--rotate-x", `${(((0.5 - ratioY) * 6) * proximity).toFixed(2)}deg`);
      card.style.setProperty("--rotate-y", `${(((ratioX - 0.5) * 7) * proximity).toFixed(2)}deg`);
      card.style.setProperty("--light-opacity", proximity.toFixed(3));
    };

    const renderPointerFrame = () => {
      frameId = 0;
      if (!latestPointer) {
        return;
      }

      const { clientX, clientY } = latestPointer;
      root.style.setProperty("--cursor-x", `${clientX}px`);
      root.style.setProperty("--cursor-y", `${clientY}px`);

      cards.forEach((entry) => {
        if (!entry.visible) {
          return;
        }

        const { card, rect } = entry;
        const expandedLeft = rect.left - 160;
        const expandedRight = rect.right + 160;
        const expandedTop = rect.top - 160;
        const expandedBottom = rect.bottom + 160;
        const near =
          clientX >= expandedLeft &&
          clientX <= expandedRight &&
          clientY >= expandedTop &&
          clientY <= expandedBottom;

        if (!near) {
          resetCard(card);
          return;
        }

        const inside =
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom;
        updateCard(entry, clientX, clientY, inside);
      });
    };

    const handlePointerMove = (event) => {
      latestPointer = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      if (!frameId) {
        frameId = window.requestAnimationFrame(renderPointerFrame);
      }
    };
    const handleWindowLeave = () => cards.forEach(({ card }) => resetCard(card));
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cards.forEach(({ card }) => resetCard(card));
      }
    };

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((item) => {
          const target = cards.find((entry) => entry.card === item.target);
          if (!target) {
            return;
          }

          target.visible = item.isIntersecting;
          if (target.visible) {
            target.rect = target.card.getBoundingClientRect();
          } else {
            resetCard(target.card);
          }
        });
      },
      { rootMargin: "240px" }
    );

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    window.addEventListener("blur", handleWindowLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    cards.forEach((entry) => {
      resetCard(entry.card);
      observer.observe(entry.card);
    });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (rectFrameId) {
        window.cancelAnimationFrame(rectFrameId);
      }
      observer?.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("blur", handleWindowLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname]);
}

function useInteractionGuard() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let timerId;

    const showBlockedMessage = () => {
      setMessage("被禁止的操作");
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => setMessage(""), 1800);
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
      showBlockedMessage();
    };

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const blocked =
        key === "f12" ||
        (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) ||
        (event.ctrlKey && key === "u");

      if (!blocked) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      showBlockedMessage();
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.clearTimeout(timerId);
    };
  }, []);

  return message;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.error || "request_failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function useBackendContent() {
  const [articles, setArticles] = useState(() => sortArticles(seedArticles.map(normalizeArticle)));
  const [projects, setProjects] = useState(() => featuredProjects.map(normalizeProject));
  const [siteContent, setSiteContent] = useState(() => normalizeSiteContent(buildDefaultSiteContent()));
  const [entries, setEntries] = useState(() => {
    const stored = window.localStorage.getItem(GUESTBOOK_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  });
  const [studioAvailable, setStudioAvailable] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadBootstrap = async () => {
      try {
        const payload = await apiRequest("/api/bootstrap");
        if (cancelled) {
          return;
        }

        setArticles(sortArticles((payload.articles ?? []).map(normalizeArticle)));
        setProjects((payload.projects ?? []).map(normalizeProject));
        setSiteContent(normalizeSiteContent(payload.siteContent ?? buildDefaultSiteContent()));
        setEntries(Array.isArray(payload.guestbook) ? payload.guestbook : []);
        setStudioAvailable(Boolean(payload.studioAvailable));
      } catch {
        if (!cancelled) {
          setStudioAvailable(false);
        }
      } finally {
        if (!cancelled) {
          setContentReady(true);
        }
      }
    };

    loadBootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!studioAvailable) {
      window.localStorage.setItem(GUESTBOOK_STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries, studioAvailable]);

  const saveArticle = async (incoming, previousSlug = null) => {
    if (!studioAvailable) {
      return { ok: false, reason: "studio_unavailable" };
    }

    try {
      const payload = await apiRequest("/api/studio/articles", {
        method: "POST",
        body: JSON.stringify({ article: incoming, previousSlug }),
      });
      setArticles(sortArticles((payload.articles ?? []).map(normalizeArticle)));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.status === 401 ? "unauthorized" : "request_failed" };
    }
  };

  const saveProject = async (incoming, previousSlug = null) => {
    if (!studioAvailable) {
      return { ok: false, reason: "studio_unavailable" };
    }

    try {
      const payload = await apiRequest("/api/studio/projects", {
        method: "POST",
        body: JSON.stringify({ project: incoming, previousSlug }),
      });
      setProjects((payload.projects ?? []).map(normalizeProject));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.status === 401 ? "unauthorized" : "request_failed" };
    }
  };

  const saveContent = async (nextContent) => {
    if (!studioAvailable) {
      return { ok: false, reason: "studio_unavailable" };
    }

    try {
      const payload = await apiRequest("/api/studio/site-content", {
        method: "POST",
        body: JSON.stringify({ siteContent: nextContent }),
      });
      setSiteContent(normalizeSiteContent(payload.siteContent ?? nextContent));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.status === 401 ? "unauthorized" : "request_failed" };
    }
  };

  const addEntry = async (entry) => {
    if (!studioAvailable) {
      setEntries((current) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          ...entry,
        },
        ...current,
      ]);
      return { ok: true };
    }

    const payload = await apiRequest("/api/guestbook", {
      method: "POST",
      body: JSON.stringify(entry),
    });
    setEntries(Array.isArray(payload.guestbook) ? payload.guestbook : []);
    return { ok: true };
  };

  return { articles, projects, siteContent, entries, saveArticle, saveProject, saveContent, addEntry, studioAvailable, contentReady };
}

function useStudioAuth(studioAvailable) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lockUntil, setLockUntil] = useState(0);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!studioAvailable) {
      setIsAuthenticated(false);
      setSessionExpired(false);
      setLockUntil(0);
      setAuthReady(true);
      return;
    }

    const readSession = async () => {
      try {
        const payload = await apiRequest("/api/studio/session");
        if (cancelled) {
          return;
        }
        setIsAuthenticated(Boolean(payload.authenticated));
        setLockUntil(Number(payload.lockUntil) || 0);
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    readSession();
    return () => {
      cancelled = true;
    };
  }, [studioAvailable]);

  const login = async (username, password) => {
    if (!studioAvailable) {
      return { ok: false, reason: "unavailable" };
    }

    try {
      await apiRequest("/api/studio/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setIsAuthenticated(true);
      setSessionExpired(false);
      setLockUntil(0);
      return { ok: true };
    } catch (error) {
      if (error.status === 429) {
        setLockUntil(Number(error.payload?.lockUntil) || Date.now() + STUDIO_LOCK_MS);
        return { ok: false, reason: "locked" };
      }

      return { ok: false, reason: error.status === 401 ? "invalid" : "unavailable" };
    }
  };

  const logout = async () => {
    if (studioAvailable) {
      try {
        await apiRequest("/api/studio/logout", { method: "POST", body: "{}" });
      } catch {}
    }

    setIsAuthenticated(false);
    setSessionExpired(false);
  };

  return { isAuthenticated, login, logout, sessionExpired, lockUntil, studioAvailable, authReady };
}

function buildDefaultSiteContent() {
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
      role: ensureLocalizedMap(siteMeta.role, ""),
      intro: ensureLocalizedMap(siteMeta.intro, ""),
      stats: { ...siteMeta.stats },
      socialLinks: siteMeta.socialLinks.map(normalizeSocialLink),
      customCards: Array.isArray(siteMeta.customCards) ? siteMeta.customCards.map(normalizeCustomCard) : [],
    },
    text: textContent,
  };
}

function normalizeSiteContent(content) {
  const defaults = buildDefaultSiteContent();
  return {
    meta: {
      ...defaults.meta,
      ...(content?.meta ?? {}),
      avatarImage:
        typeof content?.meta?.avatarImage === "string" && content.meta.avatarImage
          ? content.meta.avatarImage
          : defaults.meta.avatarImage,
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

function ThemeToggle({ theme, setTheme, text }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={text.themeAria}
    >
      {theme === "dark" ? text.themeLight : text.themeDark}
    </button>
  );
}

function ExpandableSelector({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const active = options.find((item) => item.code === value);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!rootRef.current || rootRef.current.contains(event.target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  return (
    <div ref={rootRef} className={`selector ${open ? "open" : ""}`}>
      <button type="button" className="selector-trigger" onClick={() => setOpen((prev) => !prev)}>
        <span className="micro-label">{label}</span>
        <strong>{active?.label}</strong>
        <span className="selector-caret">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="selector-menu glass-card">
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              className={`selector-option ${value === option.code ? "active" : ""}`}
              onClick={() => {
                onChange(option.code);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FontSlider({ label, value, onChange, options }) {
  const currentIndex = Math.max(
    0,
    options.findIndex((item) => item.code === value)
  );
  const progress = options.length > 1 ? (currentIndex / (options.length - 1)) * 100 : 0;

  return (
    <div className="font-slider">
      <div className="font-slider__head">
        <span className="micro-label">{label}</span>
        <span className="font-slider__value">{currentIndex + 1}/{options.length}</span>
      </div>
      <div className="font-slider__track" style={{ "--font-progress": `${progress}%` }}>
        <input
          type="range"
          min="0"
          max={options.length - 1}
          step="1"
          value={currentIndex}
          aria-label={label}
          onChange={(event) => onChange(options[Number(event.target.value)]?.code ?? options[0].code)}
        />
      </div>
    </div>
  );
}

function PalettePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const fieldRef = useRef(null);
  const sliderRef = useRef(null);
  const draggingRef = useRef(null);
  const accent = hsvToHex(value.h, value.s, value.v);
  const warm = hsvToHex((value.h + 26) % 360, clamp(value.s * 0.78 + 12, 18, 100), clamp(value.v * 0.94 + 2, 20, 100));
  const pickerStyle = {
    "--picker-hue": `${value.h}`,
    "--picker-sat": `${value.s}%`,
    "--picker-val": `${value.v}%`,
    "--picker-x": `${value.s}%`,
    "--picker-y": `${100 - value.v}%`,
    "--picker-slider": `${(value.h / 360) * 100}%`,
    "--palette-a": accent,
    "--palette-b": warm,
  };

  const updateField = (clientX, clientY) => {
    if (!fieldRef.current) {
      return;
    }

    const rect = fieldRef.current.getBoundingClientRect();
    const nextS = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const nextV = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
    onChange((current) => ({ ...current, s: Math.round(nextS), v: Math.round(nextV) }));
  };

  const updateHue = (clientX) => {
    if (!sliderRef.current) {
      return;
    }

    const rect = sliderRef.current.getBoundingClientRect();
    const nextH = clamp(((clientX - rect.left) / rect.width) * 360, 0, 360);
    onChange((current) => ({ ...current, h: Math.round(nextH) }));
  };

  useEffect(() => {
    const handleOutside = (event) => {
      if (!rootRef.current || rootRef.current.contains(event.target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (draggingRef.current === "field") {
        updateField(event.clientX, event.clientY);
      }

      if (draggingRef.current === "slider") {
        updateHue(event.clientX);
      }
    };

    const stopDragging = () => {
      draggingRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [onChange]);

  return (
    <div ref={rootRef} className={`palette-picker ${open ? "open" : ""}`}>
      <button type="button" className="palette-trigger" onClick={() => setOpen((prev) => !prev)} aria-label={label}>
        <span className="palette-trigger__art" style={pickerStyle}>
          <span className="palette-trigger__dot" />
        </span>
      </button>
      {open ? (
        <div className="palette-menu glass-card">
          <p className="micro-label">{label}</p>
          <div className="palette-editor" style={pickerStyle}>
            <div
              ref={fieldRef}
              className="palette-field"
              onPointerDown={(event) => {
                draggingRef.current = "field";
                updateField(event.clientX, event.clientY);
              }}
            >
              <span className="palette-field__thumb" />
              <span className="palette-field__grid" />
            </div>
            <div
              ref={sliderRef}
              className="palette-slider"
              onPointerDown={(event) => {
                draggingRef.current = "slider";
                updateHue(event.clientX);
              }}
            >
              <span className="palette-slider__track" />
              <span className="palette-slider__thumb" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SocialIcon({ type }) {
  if (typeof type === "object" && type?.iconDataUrl) {
    return <img className="social-pill__icon-image" src={type.iconDataUrl} alt="" aria-hidden="true" />;
  }

  if (type === "link") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10.6 13.4a1 1 0 0 1 0-1.4l4-4a3 3 0 1 1 4.2 4.2l-2.3 2.3a1 1 0 1 1-1.4-1.4l2.3-2.3a1 1 0 1 0-1.4-1.4l-4 4a1 1 0 0 1-1.4 0ZM13.4 10.6a1 1 0 0 1 0 1.4l-4 4a3 3 0 1 1-4.2-4.2l2.3-2.3a1 1 0 0 1 1.4 1.4l-2.3 2.3a1 1 0 1 0 1.4 1.4l4-4a1 1 0 0 1 1.4 0Z" />
      </svg>
    );
  }

  if (type === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.8 3c.4 1.9 1.5 3.4 3.3 4.3.8.4 1.7.7 2.6.8v3.1a9.4 9.4 0 0 1-3.7-.9v5.2a5.5 5.5 0 1 1-5.5-5.5c.4 0 .9 0 1.3.1v3.2a2.5 2.5 0 1 0 1.9 2.4V3h3.1Z" />
      </svg>
    );
  }

  if (type === "x") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h4.1l4.2 5.7L17.1 4H20l-6.3 7.3L20.5 20h-4.1l-4.6-6.2L6.4 20H3.5l6.7-7.7L4 4Z" />
      </svg>
    );
  }

  if (type === "reddit") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.1 11.6c0-.8-.6-1.4-1.4-1.4-.4 0-.7.2-1 .4-1-.7-2.4-1.1-4-1.2l.8-3.5 2.4.5a1.6 1.6 0 1 0 .2-1h-.1l-2.9-.6a.5.5 0 0 0-.6.4l-.9 4.1c-1.7 0-3.2.5-4.3 1.2a1.4 1.4 0 0 0-2.4 1 1.4 1.4 0 0 0 .7 1.2c0 .2-.1.5-.1.8 0 2.7 3 4.9 6.8 4.9s6.8-2.2 6.8-4.9c0-.3 0-.5-.1-.8.4-.2.6-.6.6-1.1Zm-9.9 2.7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5.7 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-5.6 2c.5.4 1.3.6 2.2.6.9 0 1.7-.2 2.2-.6a.5.5 0 1 0-.6-.8c-.3.2-.9.4-1.6.4s-1.3-.2-1.6-.4a.5.5 0 1 0-.6.8Z" />
      </svg>
    );
  }

  if (type === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.4 7.2a2.8 2.8 0 0 0-2-2c-1.8-.5-7.4-.5-7.4-.5s-5.6 0-7.4.5a2.8 2.8 0 0 0-2 2C2 9 2 12 2 12s0 3 .6 4.8a2.8 2.8 0 0 0 2 2c1.8.5 7.4.5 7.4.5s5.6 0 7.4-.5a2.8 2.8 0 0 0 2-2C22 15 22 12 22 12s0-3-.6-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 6.3 17.8.6.6 0 0 0 .2-.5v-1.7c0-.4 0-1.8 0-3.4 0-1.2-.4-2-1-2.4 3.3-.4 6.7-1.6 6.7-7a5.5 5.5 0 0 0-1.5-3.8c.2-.4.7-1.8-.1-3.7 0 0-1.2-.4-4 1.5a13.7 13.7 0 0 0-7.2 0c-2.8-1.9-4-1.5-4-1.5-.8 1.9-.3 3.3-.1 3.7A5.5 5.5 0 0 0 2 9.8c0 5.4 3.4 6.6 6.7 7-.4.3-.8.9-.9 1.8-.8.4-2.8 1.1-4-.9 0 0-.7-1.2-2-1.3 0 0-1.3 0-.1.9 0 0 .9.4 1.5 1.8 0 0 .8 2.5 4.5 1.7v2.7a.6.6 0 0 0 .2.5A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function formatTime(value) {
  if (!Number.isFinite(value)) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function parseSource(input) {
  const value = input.trim();
  if (!value) {
    return null;
  }

  const directPattern = /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i;
  if (directPattern.test(value)) {
    return {
      type: "direct",
      title: "Custom Stream",
      artist: "User Source",
      src: value,
    };
  }

  const spotifyUrl = value.match(
    /^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)/
  );
  if (spotifyUrl) {
    return {
      type: "spotify",
      embedSrc: `https://open.spotify.com/embed/${spotifyUrl[1]}/${spotifyUrl[2]}`,
    };
  }

  const spotifyUri = value.match(/^spotify:(track|album|playlist|episode|show|artist):([a-zA-Z0-9]+)$/);
  if (spotifyUri) {
    return {
      type: "spotify",
      embedSrc: `https://open.spotify.com/embed/${spotifyUri[1]}/${spotifyUri[2]}`,
    };
  }

  return { type: "unsupported", raw: value };
}

function AttachmentBlock({
  attachment,
  copy,
  compact = false,
  onRemove = null,
  onInsert = null,
  inserted = false,
}) {
  return (
    <div className={`attachment-card ${compact ? "compact" : ""}`}>
      <div className="attachment-card__preview">
        {attachment.kind === "image" ? (
          <img src={attachment.dataUrl} alt={attachment.name} />
        ) : attachment.kind === "audio" ? (
          <audio controls src={attachment.dataUrl} preload="metadata" />
        ) : attachment.kind === "video" ? (
          <video controls src={attachment.dataUrl} />
        ) : (
          <div className="attachment-card__file">
            <span>{copy.mediaFile}</span>
            <strong>{attachment.name}</strong>
          </div>
        )}
      </div>
      <div className="attachment-card__meta">
        <strong>{attachment.name}</strong>
        <span>{copy[`media${attachment.kind[0].toUpperCase()}${attachment.kind.slice(1)}`] || copy.mediaFile}</span>
      </div>
      <div className="attachment-card__actions">
        <a className="dock-button" href={attachment.dataUrl} download={attachment.name}>
          {copy.preview}
        </a>
        {onInsert ? (
          <button type="button" className="dock-button" onClick={() => onInsert(attachment.id)}>
            {inserted ? copy.insertedAttachment : copy.insertAttachment}
          </button>
        ) : null}
        {onRemove ? (
          <button type="button" className="dock-button" onClick={() => onRemove(attachment.id)}>
            {copy.remove}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MusicDock({ text }) {
  const audioRef = useRef(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [input, setInput] = useState("");
  const [customSource, setCustomSource] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const currentTrack = customSource?.type === "direct" ? customSource : playlist[trackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return undefined;
    }

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => setTrackIndex((prev) => (prev + 1) % playlist.length);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (customSource?.type === "spotify" || customSource?.type === "unsupported") {
      audio.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    audio.src = currentTrack.src;
    audio.load();
    setCurrentTime(0);

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack, customSource, isPlaying]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const seek = (event) => {
    const audio = audioRef.current;
    const value = Number(event.target.value);
    if (!audio) {
      return;
    }

    audio.currentTime = value;
    setCurrentTime(value);
  };

  const applySource = () => {
    setCustomSource(parseSource(input));
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  };

  const resetSource = () => {
    setCustomSource(null);
    setInput("");
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  };

  const usePlaylistTrack = (direction) => {
    if (customSource) {
      setCustomSource(null);
      setInput("");
    }

    setTrackIndex((prev) => (prev + direction + playlist.length) % playlist.length);
  };

  return (
    <aside className={`music-dock glass-card ${expanded ? "expanded" : "collapsed"}`}>
      <audio ref={audioRef} preload="metadata" />
      <button type="button" className="music-dock__toggle" onClick={() => setExpanded((prev) => !prev)}>
        <div className="music-dock__head">
          <span className="micro-label">{text.nowPlaying}</span>
          <strong>
            {customSource?.type === "spotify"
              ? "Spotify Embed"
              : customSource?.type === "unsupported"
                ? text.directSource
                : currentTrack.title}
          </strong>
          <span className="music-dock__artist">
            {customSource?.type === "spotify"
              ? "Spotify"
              : customSource?.type === "unsupported"
                ? text.unsupportedSource
                : currentTrack.artist}
          </span>
        </div>
        <span className="music-dock__caret">{expanded ? "−" : "+"}</span>
      </button>

      <div className="music-dock__body">
        <div className="music-dock__surface">
          <div className="music-dock__input">
            <label className="micro-label" htmlFor="music-source-input">
              {text.sourceLabel}
            </label>
            <div className="music-dock__input-row">
              <input
                id="music-source-input"
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={text.sourcePlaceholder}
              />
              <div className="music-dock__action-group">
                <button type="button" className="dock-button" onClick={applySource}>
                  {text.applySource}
                </button>
                <button type="button" className="dock-button" onClick={resetSource}>
                  {text.resetSource}
                </button>
              </div>
            </div>
          </div>

          {customSource?.type === "spotify" ? (
            <div className="music-dock__media-shell music-dock__media-shell--embed">
              <iframe
                className="music-dock__embed"
                src={customSource.embedSrc}
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Embed"
              />
            </div>
          ) : customSource?.type === "unsupported" ? (
            <div className="music-dock__media-shell">
              <div className="music-dock__message">{text.unsupportedSource}</div>
            </div>
          ) : (
            <div className="music-dock__media-shell">
              <div className="music-dock__controls">
                <button
                  type="button"
                  className="dock-button dock-button--icon"
                  onClick={() => usePlaylistTrack(-1)}
                  aria-label={text.previousTrack}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="dock-button dock-button--play"
                  onClick={togglePlayback}
                  aria-label={isPlaying ? text.pauseTrack : text.playTrack}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  className="dock-button dock-button--icon"
                  onClick={() => usePlaylistTrack(1)}
                  aria-label={text.nextTrack}
                >
                  Next
                </button>
              </div>

              <div className="music-dock__progress">
                <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={seek} />
                <div className="music-dock__time">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function Header({
  theme,
  setTheme,
  language,
  setLanguage,
  font,
  setFont,
  palette,
  setPalette,
  text,
  copy,
  meta,
  projects,
}) {
  return (
    <header className="site-header">
      <div className="header-panel palette-panel">
        <PalettePicker label={copy.paletteLabel} value={palette} onChange={setPalette} />
      </div>
      <div className="header-panel brand-panel">
        <Link to="/" className="brand">
          <span className="brand-mark" />
          <span>{meta.name}</span>
        </Link>
      </div>

      <div className="header-panel nav-panel">
        <nav className="site-nav">
          <NavLink to="/">{text.navHome}</NavLink>
          <NavLink to="/articles">{text.navArticles}</NavLink>
          <NavLink to={`/projects/${projects[0]?.slug ?? ""}`}>{text.navProjects}</NavLink>
          <a href="#about">{text.navAbout}</a>
          <NavLink to="/studio">{copy.navStudio}</NavLink>
        </nav>
      </div>

      <div className="header-panel tool-panel">
        <div className="tool-stack">
          <ExpandableSelector label={text.languageLabel} value={language} onChange={setLanguage} options={languages} />
          <FontSlider label={text.fontLabel} value={font} onChange={setFont} options={fonts} />
          <ThemeToggle theme={theme} setTheme={setTheme} text={text} />
        </div>
      </div>
    </header>
  );
}

function Shell({
  theme,
  setTheme,
  language,
  setLanguage,
  font,
  setFont,
  palette,
  setPalette,
  text,
  copy,
  meta,
  projects,
  children,
}) {
  const location = useLocation();
  useGlassTracking(location.pathname);
  const blockedMessage = useInteractionGuard();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="site-shell">
      <div className="site-noise" />
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <Header
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
        font={font}
        setFont={setFont}
        palette={palette}
        setPalette={setPalette}
        text={text}
        copy={copy}
        meta={meta}
        projects={projects}
      />
      <div className="cursor-dot" aria-hidden="true" />
      {children}
      <MusicDock text={text} />
      {blockedMessage ? <div className="blocked-toast">{blockedMessage}</div> : null}
      <footer className="site-footer">
        <p>
          {meta.name} / {text.footer}
        </p>
      </footer>
    </div>
  );
}

function ArticleMeta({ article, copy, language }) {
  return (
    <div className="card-meta">
      <span>{article.date}</span>
      <span>{article.readTime}</span>
      <span>
        {copy.editedLabel} {formatRelativeTime(article.updatedAt, language)}
      </span>
    </div>
  );
}

function useReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const update = () => {
      frameId = 0;
      const scrollTop = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const next = total > 0 ? Math.min(1, Math.max(0, scrollTop / total)) : 0;
      setProgress((current) => (Math.abs(current - next) < 0.004 ? current : next));
    };

    const scheduleUpdate = () => {
      if (!frameId) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return progress;
}

function useSeo({ title, description, image }) {
  useEffect(() => {
    document.title = title;

    const ensureMeta = (attr, value) => {
      const selector = attr === "name" ? `meta[name="${value}"]` : `meta[property="${value}"]`;
      let node = document.head.querySelector(selector);
      if (!node) {
        node = document.createElement("meta");
        node.setAttribute(attr, value);
        document.head.appendChild(node);
      }
      return node;
    };

    ensureMeta("name", "description").setAttribute("content", description);
    ensureMeta("property", "og:title").setAttribute("content", title);
    ensureMeta("property", "og:description").setAttribute("content", description);
    ensureMeta("property", "og:image").setAttribute("content", image);
  }, [description, image, title]);
}

function HomePage({ language, text, copy, articles, meta, projects, guestbookEntries, addGuestbookEntry }) {
  const [guestbookForm, setGuestbookForm] = useState({ name: "", message: "" });
  const siteAvatar = getSiteAvatar(meta, templateAvatar);
  useSeo({
    title: `${meta.name} / ${text.heroTitle}`,
    description: text.heroBody,
    image: siteAvatar,
  });

  const topArticles = useMemo(() => {
    const pinned = articles.filter((article) => article.pinned);
    const rest = articles.filter((article) => !article.pinned);
    return [...pinned, ...rest].slice(0, 3);
  }, [articles]);

  const submitGuestbook = async (event) => {
    event.preventDefault();
    if (!guestbookForm.name.trim() || !guestbookForm.message.trim()) {
      return;
    }
    await addGuestbookEntry({
      name: guestbookForm.name.trim(),
      message: guestbookForm.message.trim(),
    });
    setGuestbookForm({ name: "", message: "" });
  };

  return (
    <main className="page home-page">
      <section className="hero-grid">
        <Reveal className="intro-panel glass-card" delay={40}>
          <div className="intro-avatar">
            <img src={siteAvatar} alt={`${meta.name} avatar`} />
          </div>
          <div className="intro-copy">
            <p className="micro-label">{text.heroEyebrow}</p>
            <h1>{meta.name}</h1>
            <h2>{meta.role[language]}</h2>
            <p className="body-copy">{meta.intro[language]}</p>
            <div className="intro-meta">
              <span>{meta.location}</span>
              <span>{meta.email}</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="hero-copy glass-card" delay={120}>
          <p className="micro-label">{text.heroEyebrow}</p>
          <h3>{text.heroTitle}</h3>
          <p className="body-copy">{text.heroBody}</p>
          <div className="hero-actions">
            <Link className="action-button action-button--primary" to="/articles">
              {text.heroPrimary}
            </Link>
            <Link className="action-button action-button--secondary" to={`/projects/${projects[0]?.slug ?? ""}`}>
              {text.heroSecondary}
            </Link>
            <Link className="action-button action-button--secondary" to="/studio">
              {copy.studioEntry}
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="social-strip glass-card">
        {meta.socialLinks.map((item) => (
          <a key={item.label} className="social-pill" href={item.url} target="_blank" rel="noreferrer" aria-label={item.label}>
            <SocialIcon type={item.iconDataUrl ? item : item.icon} />
            <span>{item.label}</span>
          </a>
        ))}
      </section>

      {meta.customCards?.length ? (
        <section className="section">
          <div className="card-grid custom-card-grid">
            {meta.customCards.map((card, index) => (
              <Reveal key={card.id} delay={index * 90}>
                <article className="project-card glass-card">
                  <span className="micro-label">{card.eyebrow[language] || card.eyebrow.en}</span>
                  <h3>{card.title[language] || card.title.en}</h3>
                  <p className="body-copy">{card.body[language] || card.body.en}</p>
                  {card.linkUrl ? (
                    <a className="inline-link" href={card.linkUrl} target="_blank" rel="noreferrer">
                      {card.linkLabel[language] || card.linkLabel.en || "Open"}
                    </a>
                  ) : null}
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <Reveal className="about-panel glass-card now-panel">
          <div className="now-panel__head">
            <p className="micro-label">{copy.nowTitle}</p>
            <h2>{copy.nowTitle}</h2>
          </div>
          <p className="body-copy">{copy.nowBody}</p>
          <div className="tag-row">
            <span className="tag-chip">{copy.nowStatusA}</span>
            <span className="tag-chip">{copy.nowStatusB}</span>
            <span className="tag-chip">{copy.nowStatusC}</span>
          </div>
        </Reveal>
      </section>

      <section className="section split-layout" id="about">
        <Reveal className="about-panel glass-card">
          <p className="micro-label">{text.aboutTitle}</p>
          <h2>{text.aboutTitle}</h2>
          <p className="body-copy">{text.aboutBody}</p>
        </Reveal>

        <Reveal className="stats-panel glass-card" delay={120}>
          <div className="stat-box">
            <strong>{meta.stats.projects}</strong>
            <span>{text.statsLabelOne}</span>
          </div>
          <div className="stat-box">
            <strong>{meta.stats.essays}</strong>
            <span>{text.statsLabelTwo}</span>
          </div>
          <div className="stat-box">
            <strong>{meta.stats.labs}</strong>
            <span>{text.statsLabelThree}</span>
          </div>
        </Reveal>
      </section>

      <section className="section">
        <Reveal className="section-head">
          <p className="micro-label">01</p>
          <h2>{text.featuredTitle}</h2>
        </Reveal>

        <div className="card-grid">
          {projects.map((project, index) => (
            <Reveal key={project.slug} delay={index * 120}>
              <article className="project-card glass-card">
                <span className="micro-label">{project.category[language]}</span>
                <h3>{project.title}</h3>
                <p className="body-copy">{project.summary[language]}</p>
                <div className="tag-row">
                  {project.metrics.map((metric) => (
                    <span className="tag-chip" key={metric}>
                      {metric}
                    </span>
                  ))}
                </div>
                <Link className="inline-link" to={`/projects/${project.slug}`}>
                  {text.heroSecondary}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <Reveal className="section-head">
          <p className="micro-label">02</p>
          <h2>{text.articlesTitle}</h2>
        </Reveal>

        <div className="card-grid article-grid">
          {topArticles.map((article, index) => (
            <Reveal key={article.slug} delay={index * 120}>
              <article className="article-card glass-card">
                {article.coverImage ? <img className="article-card__cover" src={article.coverImage} alt={article.title[language]} /> : null}
                <span className="micro-label">{article.tag}</span>
                {article.pinned ? <span className="tag-chip">Pinned</span> : null}
                <h3>{article.title[language]}</h3>
                <p className="body-copy">{article.excerpt[language]}</p>
                <ArticleMeta article={article} copy={copy} language={language} />
                <Link className="inline-link" to={`/articles/${article.slug}`}>
                  {copy.openArticle}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={260}>
          <Link className="action-button action-button--secondary" to="/articles">
            {text.allArticles}
          </Link>
        </Reveal>
      </section>

      <section className="section split-layout">
        <Reveal className="about-panel glass-card">
          <p className="micro-label">{copy.guestbookTitle}</p>
          <h2>{copy.guestbookTitle}</h2>
          <p className="body-copy">{copy.guestbookBody}</p>
          <form className="studio-form" onSubmit={submitGuestbook}>
            <label className="studio-field">
              <span>{copy.guestbookName}</span>
              <input
                type="text"
                value={guestbookForm.name}
                onChange={(event) => setGuestbookForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="studio-field">
              <span>{copy.guestbookMessage}</span>
              <textarea
                rows="4"
                value={guestbookForm.message}
                onChange={(event) => setGuestbookForm((current) => ({ ...current, message: event.target.value }))}
              />
            </label>
            <button type="submit" className="action-button action-button--primary">
              {copy.submitMessage}
            </button>
          </form>
        </Reveal>

        <Reveal className="stats-panel glass-card guestbook-list" delay={120}>
          {guestbookEntries.length ? guestbookEntries.slice(0, 5).map((entry) => (
            <article key={entry.id} className="guestbook-entry">
              <strong>{entry.name}</strong>
              <p className="body-copy">{entry.message}</p>
              <span>{formatRelativeTime(entry.createdAt, language)}</span>
            </article>
          )) : <p className="body-copy">{copy.guestbookEmpty}</p>}
        </Reveal>
      </section>
    </main>
  );
}

function ArticlesPage({ language, text, copy, articles, meta }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const siteAvatar = getSiteAvatar(meta, templateAvatar);
  useSeo({
    title: `${text.articleIndexTitle} / ${meta.name}`,
    description: text.articleIndexBody,
    image: siteAvatar,
  });

  const tags = useMemo(
    () => ["all", ...Array.from(new Set(articles.map((article) => article.tag)))],
    [articles]
  );

  const filteredArticles = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchTag = activeTag === "all" || article.tag === activeTag;
      if (!matchTag) {
        return false;
      }

      if (!lowered) {
        return true;
      }

      const haystack = [
        article.tag,
        article.title[language],
        article.title.en,
        article.excerpt[language],
        article.excerpt.en,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(lowered);
    });
  }, [activeTag, articles, language, query]);

  return (
    <main className="page">
      <section className="page-banner glass-card">
        <p className="micro-label">{text.articleIndexEyebrow}</p>
        <h1>{text.articleIndexTitle}</h1>
        <p className="body-copy">{text.articleIndexBody}</p>
      </section>

      <section className="glass-card article-tools">
        <label className="studio-field">
          <span>{copy.articleSearch}</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.articleSearchPlaceholder}
          />
        </label>
        <div className="tag-row">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-chip tag-chip--button ${activeTag === tag ? "active" : ""}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag === "all" ? copy.allTags : tag}
            </button>
          ))}
        </div>
      </section>

      <section className="section article-list">
        {filteredArticles.length ? filteredArticles.map((article, index) => (
          <Reveal key={article.slug} delay={index * 90}>
            <article className="article-row glass-card">
              <div className="article-row__main">
                {article.coverImage ? <img className="article-row__cover" src={article.coverImage} alt={article.title[language]} /> : null}
                <span className="micro-label">{article.tag}</span>
                {article.pinned ? <span className="tag-chip">Pinned</span> : null}
                <h2>{article.title[language]}</h2>
                <p className="body-copy">{article.excerpt[language]}</p>
                <Link className="inline-link" to={`/articles/${article.slug}`}>
                  {copy.openArticle}
                </Link>
              </div>
              <div className="article-row__meta">
                <span>{article.date}</span>
                <span>{article.readTime}</span>
                <span>
                  {copy.editedLabel} {formatRelativeTime(article.updatedAt, language)}
                </span>
              </div>
            </article>
          </Reveal>
        )) : <div className="glass-card empty-state">{copy.noArticleResults}</div>}
      </section>
    </main>
  );
}

function ArticleDetailPage({ language, copy, articles, meta }) {
  const { slug } = useParams();
  const article = useMemo(
    () => articles.find((item) => item.slug === slug) ?? articles[0],
    [articles, slug]
  );
  const progress = useReadingProgress();
  const [copied, setCopied] = useState(false);
  const siteAvatar = getSiteAvatar(meta, templateAvatar);
  const seoTitle = article ? `${article.title[language]} / ${meta.name}` : meta.name;
  const seoDescription = article ? article.excerpt[language] || article.excerpt.en : "";
  const seoImage = article?.coverImage || siteAvatar;
  useSeo({
    title: seoTitle,
    description: seoDescription,
    image: seoImage,
  });

  if (!article) {
    return null;
  }

  const localizedContent = article.content[language] || "";
  const { rendered, remainingAttachments } = renderArticleContent(localizedContent, article.attachments, copy);
  const sections = extractArticleSections(localizedContent);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main className="page">
      <div className="reading-progress glass-card">
        <span>{copy.readingProgress}</span>
        <div className="reading-progress__bar">
          <div className="reading-progress__fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <button type="button" className="dock-button" onClick={handleCopyLink}>
          {copied ? copy.linkCopied : copy.copyLink}
        </button>
      </div>
      <section className="page-banner glass-card">
        <p className="micro-label">{article.tag}</p>
        {article.coverImage ? <img className="page-banner__cover" src={article.coverImage} alt={article.title[language]} /> : null}
        <h1>{article.title[language]}</h1>
        <p className="body-copy">{article.excerpt[language]}</p>
        <ArticleMeta article={article} copy={copy} language={language} />
      </section>

      <section className="detail-grid detail-grid--article">
        {sections.length ? (
          <Reveal>
            <article className="detail-card glass-card article-detail-card toc-card">
              <p className="micro-label">{copy.tocTitle}</p>
              <div className="toc-list">
                {sections.map((section) => (
                  <a key={section.id} className={`toc-link level-${section.level}`} href={`#${section.id}`}>
                    {section.title}
                  </a>
                ))}
              </div>
            </article>
          </Reveal>
        ) : null}
        <Reveal>
          <article className="detail-card glass-card article-detail-card">
            <p className="micro-label">ARTICLE</p>
            <div className="article-detail__body">
              {localizedContent ? (
                rendered.map((block) =>
                  block.type === "text" ? (
                    <p key={block.key} className="body-copy article-detail__copy">
                      {block.value}
                    </p>
                  ) : block.type === "heading" ? (
                    block.level === 2 ? (
                      <h2 key={block.key} id={block.id} className="article-heading level-2">
                        {block.value}
                      </h2>
                    ) : (
                      <h3 key={block.key} id={block.id} className="article-heading level-3">
                        {block.value}
                      </h3>
                    )
                  ) : (
                    <AttachmentBlock key={block.key} attachment={block.value} copy={copy} />
                  )
                )
              ) : (
                <p className="body-copy">{copy.articleEmpty}</p>
              )}
            </div>
          </article>
        </Reveal>

        <Reveal delay={120}>
          <article className="detail-card glass-card article-detail-card">
            <p className="micro-label">{copy.unplacedAttachments}</p>
            <div className="attachment-grid">
              {remainingAttachments.length ? (
                remainingAttachments.map((attachment) => (
                  <AttachmentBlock key={attachment.id} attachment={attachment} copy={copy} />
                ))
              ) : (
                <p className="body-copy">{copy.noAttachments}</p>
              )}
            </div>
          </article>
        </Reveal>
      </section>
    </main>
  );
}

function ProjectDetailPage({ language, text, projects }) {
  const { slug } = useParams();
  const project = useMemo(
    () => projects.find((item) => item.slug === slug) ?? projects[0],
    [projects, slug]
  );

  return (
    <main className="page">
      <section className="page-banner glass-card">
        <p className="micro-label">{text.projectDetailEyebrow}</p>
        <h1>{project.title}</h1>
        <p className="body-copy">{project.summary[language]}</p>
        <div className="tag-row">
          {project.metrics.map((metric) => (
            <span className="tag-chip" key={metric}>
              {metric}
            </span>
          ))}
        </div>
      </section>

      <section className="detail-grid">
        <Reveal>
          <article className="detail-card glass-card">
            <p className="micro-label">Challenge</p>
            <h2>{text.challenge}</h2>
            <p className="body-copy">{project.challenge[language]}</p>
          </article>
        </Reveal>
        <Reveal delay={120}>
          <article className="detail-card glass-card">
            <p className="micro-label">Solution</p>
            <h2>{text.solution}</h2>
            <p className="body-copy">{project.solution[language]}</p>
          </article>
        </Reveal>
        <Reveal delay={240}>
          <article className="detail-card glass-card">
            <p className="micro-label">Outcome</p>
            <h2>{text.outcome}</h2>
            <p className="body-copy">{project.outcome[language]}</p>
          </article>
        </Reveal>
      </section>
    </main>
  );
}

function StudioPage({
  language,
  copy,
  articles,
  saveArticle,
  projects,
  saveProject,
  isAuthenticated,
  login,
  logout,
  sessionExpired,
  lockUntil,
  studioAvailable,
  authReady,
  siteContent,
  saveSiteContent,
}) {
  const [selectedSlug, setSelectedSlug] = useState(articles[0]?.slug ?? "__new__");
  const [selectedProjectSlug, setSelectedProjectSlug] = useState(projects[0]?.slug ?? "__new_project__");
  const [editorLanguage, setEditorLanguage] = useState(language);
  const [draft, setDraft] = useState(() => cloneArticle(articles[0] ?? createBlankArticle()));
  const [projectDraft, setProjectDraft] = useState(() => cloneProject(projects[0] ?? createBlankProject()));
  const [siteDraft, setSiteDraft] = useState(() => normalizeSiteContent(siteContent));
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [flash, setFlash] = useState("");
  const [siteFlash, setSiteFlash] = useState("");

  useEffect(() => {
    setEditorLanguage(language);
  }, [language]);

  useEffect(() => {
    setSiteDraft(normalizeSiteContent(siteContent));
  }, [siteContent]);

  useEffect(() => {
    if (selectedSlug === "__new__") {
      setDraft(createBlankArticle());
      return;
    }

    const found = articles.find((item) => item.slug === selectedSlug);
    if (found) {
      setDraft(cloneArticle(found));
    }
  }, [articles, selectedSlug]);

  useEffect(() => {
    if (selectedProjectSlug === "__new_project__") {
      setProjectDraft(createBlankProject());
      return;
    }

    const found = projects.find((item) => item.slug === selectedProjectSlug);
    if (found) {
      setProjectDraft(cloneProject(found));
    }
  }, [projects, selectedProjectSlug]);

  const handleLogin = async (event) => {
    event.preventDefault();
    const result = await login(loginForm.username, loginForm.password);
    if (result.ok) {
      setLoginError("");
      setLoginForm({ username: "", password: "" });
      return;
    }

    setLoginError(
      result.reason === "locked"
        ? copy.loginLocked
        : result.reason === "unavailable"
          ? "Studio requires the Node server API."
          : copy.loginError
    );
  };

  const handleLocalizedField = (section, value) => {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [editorLanguage]: value,
      },
    }));
  };

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    const nextAttachments = await Promise.all(files.map(fileToAttachment));
    setDraft((current) => ({
      ...current,
      attachments: [...current.attachments, ...nextAttachments],
    }));
    event.target.value = "";
  };

  const handleCoverUpload = async (event) => {
    const [file] = Array.from(event.target.files ?? []);
    if (!file) {
      return;
    }
    const [cover] = await Promise.all([fileToAttachment(file)]);
    setDraft((current) => ({
      ...current,
      coverImage: cover.dataUrl,
    }));
    event.target.value = "";
  };

  const handleInsertAttachment = (attachmentId) => {
    setDraft((current) => ({
      ...current,
      content: {
        ...current.content,
        [editorLanguage]: insertAttachmentIntoContent(current.content[editorLanguage] || "", attachmentId),
      },
    }));
  };

  const handleSave = async () => {
    const preferredTitle =
      draft.title.en || draft.title.zh || draft.title.ja || draft.title.ko || copy.newDraftTitle;
    let nextSlug = slugify(draft.slug || preferredTitle);
    if (!nextSlug) {
      nextSlug = `article-${Date.now()}`;
    }

    if (selectedSlug === "__new__" || nextSlug !== selectedSlug) {
      let deduped = nextSlug;
      let suffix = 1;
      while (articles.some((item) => item.slug === deduped && item.slug !== selectedSlug)) {
        suffix += 1;
        deduped = `${nextSlug}-${suffix}`;
      }
      nextSlug = deduped;
    }

    const nextDraft = {
      ...draft,
      slug: nextSlug,
      title: ensureLocalizedMap(draft.title, preferredTitle),
      excerpt: ensureLocalizedMap(
        draft.excerpt,
        (draft.content.en || draft.content.zh || draft.content.ja || draft.content.ko || "").slice(0, 140)
      ),
      content: ensureLocalizedMap(draft.content, ""),
    };

    const result = await saveArticle(nextDraft, selectedSlug === "__new__" ? null : selectedSlug);
    if (!result.ok) {
      setFlash(result.reason === "unauthorized" ? copy.sessionExpired : "Studio save is unavailable without the backend server.");
      window.setTimeout(() => setFlash(""), 1800);
      return;
    }
    setSelectedSlug(nextSlug);
    setFlash(copy.articleSaved);
    window.setTimeout(() => setFlash(""), 1600);
  };

  const handleSiteTextChange = (key, value) => {
    setSiteDraft((current) => ({
      ...current,
      text: {
        ...current.text,
        [editorLanguage]: {
          ...current.text[editorLanguage],
          [key]: value,
        },
      },
    }));
  };

  const handleSiteLocalizedMeta = (key, value) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        [key]: {
          ...current.meta[key],
          [editorLanguage]: value,
        },
      },
    }));
  };

  const handleSiteMetaField = (key, value) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        [key]: value,
      },
    }));
  };

  const handleAvatarUpload = async (event) => {
    const [file] = Array.from(event.target.files ?? []);
    if (!file) {
      return;
    }

    const [avatar] = await Promise.all([fileToAttachment(file)]);
    handleSiteMetaField("avatarImage", avatar.dataUrl);
    event.target.value = "";
  };

  const handleRemoveAvatar = () => {
    handleSiteMetaField("avatarImage", "");
  };

  const handleSocialLinkChange = (index, key, value) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        socialLinks: current.meta.socialLinks.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const handleSocialIconUpload = async (index, event) => {
    const [file] = Array.from(event.target.files ?? []);
    if (!file) {
      return;
    }
    const [icon] = await Promise.all([fileToAttachment(file)]);
    handleSocialLinkChange(index, "iconDataUrl", icon.dataUrl);
    event.target.value = "";
  };

  const handleAddSocialLink = () => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        socialLinks: [...current.meta.socialLinks, createBlankSocialLink()],
      },
    }));
  };

  const handleRemoveSocialLink = (index) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        socialLinks: current.meta.socialLinks.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const handleCustomCardLocalizedField = (index, key, value) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        customCards: current.meta.customCards.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [key]: {
                  ...item[key],
                  [editorLanguage]: value,
                },
              }
            : item
        ),
      },
    }));
  };

  const handleCustomCardField = (index, key, value) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        customCards: current.meta.customCards.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const handleAddCustomCard = () => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        customCards: [...current.meta.customCards, createBlankCustomCard()],
      },
    }));
  };

  const handleRemoveCustomCard = (index) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        customCards: current.meta.customCards.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const handleSaveSiteContent = async () => {
    const result = await saveSiteContent(siteDraft);
    if (!result.ok) {
      setSiteFlash(result.reason === "unauthorized" ? copy.sessionExpired : "Studio save is unavailable without the backend server.");
      window.setTimeout(() => setSiteFlash(""), 1800);
      return;
    }
    setSiteFlash(copy.siteContentSaved);
    window.setTimeout(() => setSiteFlash(""), 1600);
  };

  const handleProjectLocalizedField = (section, value) => {
    setProjectDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [editorLanguage]: value,
      },
    }));
  };

  const handleSaveProject = async () => {
    const baseSlug = slugify(projectDraft.slug || projectDraft.title || `project-${Date.now()}`);
    let nextSlug = baseSlug || `project-${Date.now()}`;

    if (selectedProjectSlug === "__new_project__" || nextSlug !== selectedProjectSlug) {
      let deduped = nextSlug;
      let suffix = 1;
      while (projects.some((item) => item.slug === deduped && item.slug !== selectedProjectSlug)) {
        suffix += 1;
        deduped = `${nextSlug}-${suffix}`;
      }
      nextSlug = deduped;
    }

    const nextProject = {
      ...projectDraft,
      slug: nextSlug,
      category: ensureLocalizedMap(projectDraft.category, ""),
      summary: ensureLocalizedMap(projectDraft.summary, ""),
      challenge: ensureLocalizedMap(projectDraft.challenge, ""),
      solution: ensureLocalizedMap(projectDraft.solution, ""),
      outcome: ensureLocalizedMap(projectDraft.outcome, ""),
      metrics: projectDraft.metrics.filter(Boolean),
    };

    const result = await saveProject(nextProject, selectedProjectSlug === "__new_project__" ? null : selectedProjectSlug);
    if (!result.ok) {
      setFlash(result.reason === "unauthorized" ? copy.sessionExpired : "Studio save is unavailable without the backend server.");
      window.setTimeout(() => setFlash(""), 1800);
      return;
    }
    setSelectedProjectSlug(nextSlug);
    setFlash(copy.projectSaved);
    window.setTimeout(() => setFlash(""), 1600);
  };

  const studioProgress = useReadingProgress();
  const studioSections = useMemo(
    () => [
      { id: "studio-article", label: copy.articleListTitle },
      { id: "studio-site-meta", label: copy.contentEditorTitle },
      { id: "studio-site-copy", label: "Site Copy" },
      { id: "studio-social", label: copy.socialEditorTitle },
      { id: "studio-custom-cards", label: copy.customCardsTitle },
      { id: "studio-projects", label: copy.projectsEditorTitle },
    ],
    [copy]
  );
  const scrollToStudioSection = (sectionId) => {
    const node = document.getElementById(sectionId);
    if (!node) {
      return;
    }

    const headerOffset = 108;
    const top = node.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  if (!studioAvailable) {
    return (
      <main className="page">
        <section className="page-banner glass-card auth-card">
          <p className="micro-label">STUDIO</p>
          <h1>{copy.loginTitle}</h1>
          <p className="body-copy">This route is read-only without the Node backend. Run <code>npm run dev:full</code> or <code>npm run start</code>.</p>
        </section>
      </main>
    );
  }

  if (!authReady) {
    return (
      <main className="page">
        <section className="page-banner glass-card auth-card">
          <p className="micro-label">STUDIO</p>
          <h1>{copy.loginTitle}</h1>
          <p className="body-copy">Loading secure studio session...</p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="page">
        <section className="page-banner glass-card auth-card">
          <p className="micro-label">STUDIO</p>
          <h1>{copy.loginTitle}</h1>
          <p className="body-copy">{copy.loginBody}</p>
          <form className="studio-login" onSubmit={handleLogin}>
            <label className="studio-field">
              <span>{copy.username}</span>
              <input
                type="text"
                value={loginForm.username}
                onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
              />
            </label>
            <label className="studio-field">
              <span>{copy.password}</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
            {sessionExpired ? <p className="studio-error">{copy.sessionExpired}</p> : null}
            {lockUntil > Date.now() ? <p className="studio-error">{copy.loginLocked}</p> : null}
            {loginError ? <p className="studio-error">{loginError}</p> : null}
            <button type="submit" className="action-button action-button--primary">
              {copy.login}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="page-banner glass-card studio-banner">
        <div>
          <p className="micro-label">STUDIO</p>
          <h1>{copy.studioTitle}</h1>
          <p className="body-copy">{copy.studioBody}</p>
          <p className="body-copy studio-note">{copy.studioHint}</p>
        </div>
        <button type="button" className="action-button action-button--secondary" onClick={logout}>
          {copy.logout}
        </button>
      </section>

      <section className="studio-workbench">
        <aside className="studio-sidebar glass-card">
          <div className="studio-sidebar__head">
            <div>
              <p className="micro-label">{copy.manageArticles}</p>
              <h2>{copy.articleListTitle}</h2>
            </div>
            <button type="button" className="action-button action-button--secondary" onClick={() => setSelectedSlug("__new__")}>
              {copy.createArticle}
            </button>
          </div>

          <div className="studio-article-list">
            {articles.map((article) => (
              <button
                key={article.slug}
                type="button"
                className={`studio-article-item ${selectedSlug === article.slug ? "active" : ""}`}
                onClick={() => setSelectedSlug(article.slug)}
              >
                <span className="micro-label">{article.tag}</span>
                <strong>{article.title[language] || article.title.en}</strong>
                <span>{copy.editedLabel} {formatRelativeTime(article.updatedAt, language)}</span>
                <span>{article.attachments.length} {copy.attachmentCount}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="studio-stack">
        <section id="studio-article" className="studio-editor glass-card studio-section-card">
          <div className="studio-editor__head">
            <div>
              <p className="micro-label">{selectedSlug === "__new__" ? copy.newDraftTitle : draft.tag}</p>
              <h2>{selectedSlug === "__new__" ? copy.createArticle : draft.title[language] || draft.title.en || copy.newDraftTitle}</h2>
            </div>
            <div className="studio-editor__actions">
              <Link className="action-button action-button--secondary" to={selectedSlug === "__new__" ? "/articles" : `/articles/${draft.slug || selectedSlug}`}>
                {copy.preview}
              </Link>
              <button type="button" className="action-button action-button--primary" onClick={handleSave}>
                {copy.saveArticle}
              </button>
            </div>
          </div>

          {flash ? <div className="studio-flash">{flash}</div> : null}

          <div className="studio-form">
            <div className="studio-form__row">
              <label className="studio-field">
                <span>{copy.articleTag}</span>
                <input type="text" value={draft.tag} onChange={(event) => setDraft((current) => ({ ...current, tag: event.target.value }))} />
              </label>
              <label className="studio-field">
                <span>{copy.articleReadTime}</span>
                <input
                  type="text"
                  value={draft.readTime}
                  onChange={(event) => setDraft((current) => ({ ...current, readTime: event.target.value }))}
                />
              </label>
              <label className="studio-field">
                <span>{copy.articleSlug}</span>
                <input type="text" value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} />
              </label>
            </div>

            <div className="studio-form__row">
              <label className="studio-field">
                <span>{copy.coverImage}</span>
                <input type="file" accept="image/*" onChange={handleCoverUpload} />
              </label>
              <label className="studio-field studio-checkbox">
                <span>{copy.pinnedArticle}</span>
                <input
                  type="checkbox"
                  checked={draft.pinned}
                  onChange={(event) => setDraft((current) => ({ ...current, pinned: event.target.checked }))}
                />
              </label>
            </div>

            {draft.coverImage ? <img className="studio-cover-preview" src={draft.coverImage} alt={copy.coverImage} /> : null}

            <div className="studio-language-bar">
              <span className="micro-label">{copy.articleLanguage}</span>
              <div className="studio-language-tabs">
                {languages.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className={`studio-tab ${editorLanguage === item.code ? "active" : ""}`}
                    onClick={() => setEditorLanguage(item.code)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="studio-field">
              <span>{copy.articleTitle}</span>
              <input
                type="text"
                value={draft.title[editorLanguage] || ""}
                onChange={(event) => handleLocalizedField("title", event.target.value)}
              />
            </label>

            <label className="studio-field">
              <span>{copy.articleExcerpt}</span>
              <textarea
                rows="4"
                value={draft.excerpt[editorLanguage] || ""}
                onChange={(event) => handleLocalizedField("excerpt", event.target.value)}
              />
            </label>

            <label className="studio-field">
              <span>{copy.articleContent}</span>
              <textarea
                rows="10"
                value={draft.content[editorLanguage] || ""}
                onChange={(event) => handleLocalizedField("content", event.target.value)}
              />
            </label>

            <label className="studio-field studio-upload">
              <span>{copy.uploadFiles}</span>
              <input type="file" multiple onChange={handleUpload} />
            </label>

            <div className="studio-attachments">
              <div className="studio-attachments__head">
                <span className="micro-label">{copy.attachments}</span>
                <strong>{draft.attachments.length} {copy.attachmentCount}</strong>
              </div>
              <div className="attachment-grid compact">
                {draft.attachments.length ? (
                  draft.attachments.map((attachment) => (
                    <AttachmentBlock
                      key={attachment.id}
                      attachment={attachment}
                      copy={copy}
                      compact
                      inserted={contentHasAttachment(draft.content[editorLanguage] || "", attachment.id)}
                      onInsert={handleInsertAttachment}
                      onRemove={(attachmentId) =>
                        setDraft((current) => ({
                          ...current,
                          attachments: current.attachments.filter((item) => item.id !== attachmentId),
                        }))
                      }
                    />
                  ))
                ) : (
                  <p className="body-copy">{copy.noAttachments}</p>
                )}
              </div>
            </div>
          </div>
        </section>
        <section id="studio-site-meta" className="studio-editor glass-card studio-section-card">
          <div className="studio-editor__head">
            <div>
              <p className="micro-label">SITE</p>
              <h2>{copy.contentEditorTitle}</h2>
              <p className="body-copy">{copy.contentEditorBody}</p>
            </div>
            <button type="button" className="action-button action-button--primary" onClick={handleSaveSiteContent}>
              {copy.saveSiteContent}
            </button>
          </div>

          {siteFlash ? <div className="studio-flash">{siteFlash}</div> : null}

          <div className="studio-form">
            <div className="studio-form__row">
              <label className="studio-field">
                <span>{copy.brandName}</span>
                <input
                  type="text"
                  value={siteDraft.meta.name}
                  onChange={(event) => handleSiteMetaField("name", event.target.value)}
                />
              </label>
              <label className="studio-field">
                <span>{copy.brandEmail}</span>
                <input
                  type="text"
                  value={siteDraft.meta.email}
                  onChange={(event) => handleSiteMetaField("email", event.target.value)}
                />
              </label>
              <label className="studio-field">
                <span>{copy.brandLocation}</span>
                <input
                  type="text"
                  value={siteDraft.meta.location}
                  onChange={(event) => handleSiteMetaField("location", event.target.value)}
                />
              </label>
              <label className="studio-field">
                <span>{copy.statProjects}</span>
                <input
                  type="text"
                  value={siteDraft.meta.stats.projects}
                  onChange={(event) =>
                    setSiteDraft((current) => ({
                      ...current,
                      meta: { ...current.meta, stats: { ...current.meta.stats, projects: event.target.value } },
                    }))
                  }
                />
              </label>
              <label className="studio-field">
                <span>{copy.statEssays}</span>
                <input
                  type="text"
                  value={siteDraft.meta.stats.essays}
                  onChange={(event) =>
                    setSiteDraft((current) => ({
                      ...current,
                      meta: { ...current.meta, stats: { ...current.meta.stats, essays: event.target.value } },
                    }))
                  }
                />
              </label>
              <label className="studio-field">
                <span>{copy.statLabs}</span>
                <input
                  type="text"
                  value={siteDraft.meta.stats.labs}
                  onChange={(event) =>
                    setSiteDraft((current) => ({
                      ...current,
                      meta: { ...current.meta, stats: { ...current.meta.stats, labs: event.target.value } },
                    }))
                  }
                />
              </label>
            </div>
            <div className="studio-inline-actions studio-inline-actions--avatar">
              <label className="studio-field studio-field--inline">
                <span>{copy.uploadAvatar || "Upload Avatar"}</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} />
              </label>
              {siteDraft.meta.avatarImage ? (
                <img
                  className="studio-avatar-preview"
                  src={siteDraft.meta.avatarImage}
                  alt={`${siteDraft.meta.name || "Site"} avatar`}
                />
              ) : null}
              <button type="button" className="action-button action-button--secondary" onClick={handleRemoveAvatar}>
                {copy.removeAvatar || "Reset Avatar"}
              </button>
            </div>
          </div>
        </section>

        <section id="studio-site-copy" className="studio-editor glass-card studio-section-card">
          <div className="studio-editor__head">
            <div>
              <p className="micro-label">COPY</p>
              <h2>Site Copy</h2>
              <p className="body-copy">{copy.contentEditorBody}</p>
            </div>
            <button type="button" className="action-button action-button--primary" onClick={handleSaveSiteContent}>
              {copy.saveSiteContent}
            </button>
          </div>

          <div className="studio-form">
            <div className="studio-language-bar">
              <span className="micro-label">{copy.articleLanguage}</span>
              <div className="studio-language-tabs">
                {languages.map((item) => (
                  <button
                    key={`site-${item.code}`}
                    type="button"
                    className={`studio-tab ${editorLanguage === item.code ? "active" : ""}`}
                    onClick={() => setEditorLanguage(item.code)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="studio-field">
              <span>{copy.roleLabel}</span>
              <input
                type="text"
                value={siteDraft.meta.role[editorLanguage] || ""}
                onChange={(event) => handleSiteLocalizedMeta("role", event.target.value)}
              />
            </label>

            <label className="studio-field">
              <span>{copy.introLabel}</span>
              <textarea
                rows="4"
                value={siteDraft.meta.intro[editorLanguage] || ""}
                onChange={(event) => handleSiteLocalizedMeta("intro", event.target.value)}
              />
            </label>

            {EDITABLE_TEXT_KEYS.map((key) => (
              <label key={key} className="studio-field">
                <span>{key}</span>
                {String(siteDraft.text[editorLanguage]?.[key] ?? "").length > 90 ? (
                  <textarea
                    rows="4"
                    value={siteDraft.text[editorLanguage]?.[key] ?? ""}
                    onChange={(event) => handleSiteTextChange(key, event.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    value={siteDraft.text[editorLanguage]?.[key] ?? ""}
                    onChange={(event) => handleSiteTextChange(key, event.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </section>

        <section id="studio-social" className="studio-editor glass-card studio-section-card">
          <div className="studio-editor__head">
            <div>
              <p className="micro-label">SOCIAL</p>
              <h2>{copy.socialEditorTitle}</h2>
              <p className="body-copy">{copy.socialEditorBody}</p>
            </div>
            <button type="button" className="action-button action-button--secondary" onClick={handleAddSocialLink}>
              {copy.addSocialLink}
            </button>
          </div>

          <div className="studio-list">
            {siteDraft.meta.socialLinks.map((item, index) => (
              <div key={`${item.label}-${index}`} className="studio-block">
                <div className="studio-form__row">
                  <label className="studio-field">
                    <span>{copy.socialLabel}</span>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(event) => handleSocialLinkChange(index, "label", event.target.value)}
                    />
                  </label>
                  <label className="studio-field">
                    <span>{copy.socialUrl}</span>
                    <input
                      type="text"
                      value={item.url}
                      onChange={(event) => handleSocialLinkChange(index, "url", event.target.value)}
                    />
                  </label>
                  <label className="studio-field">
                    <span>{copy.socialIcon}</span>
                    <input
                      type="text"
                      value={item.icon}
                      onChange={(event) => handleSocialLinkChange(index, "icon", event.target.value)}
                    />
                  </label>
                </div>
                <div className="studio-inline-actions">
                  <label className="studio-field studio-field--inline">
                    <span>{copy.uploadSocialIcon}</span>
                    <input type="file" accept="image/*" onChange={(event) => handleSocialIconUpload(index, event)} />
                  </label>
                  {item.iconDataUrl ? <img className="studio-icon-preview" src={item.iconDataUrl} alt={item.label || "icon"} /> : null}
                  <button type="button" className="action-button action-button--secondary" onClick={() => handleRemoveSocialLink(index)}>
                    {copy.removeSocialLink}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="studio-custom-cards" className="studio-editor glass-card studio-section-card">
          <div className="studio-editor__head">
            <div>
              <p className="micro-label">CARDS</p>
              <h2>{copy.customCardsTitle}</h2>
              <p className="body-copy">{copy.customCardsBody}</p>
            </div>
            <button type="button" className="action-button action-button--secondary" onClick={handleAddCustomCard}>
              {copy.addCustomCard}
            </button>
          </div>

          <div className="studio-list">
            {siteDraft.meta.customCards.map((item, index) => (
              <div key={item.id} className="studio-block">
                <div className="studio-form__row">
                  <label className="studio-field">
                    <span>{copy.cardEyebrow}</span>
                    <input
                      type="text"
                      value={item.eyebrow[editorLanguage] || ""}
                      onChange={(event) => handleCustomCardLocalizedField(index, "eyebrow", event.target.value)}
                    />
                  </label>
                  <label className="studio-field">
                    <span>{copy.cardTitle}</span>
                    <input
                      type="text"
                      value={item.title[editorLanguage] || ""}
                      onChange={(event) => handleCustomCardLocalizedField(index, "title", event.target.value)}
                    />
                  </label>
                  <label className="studio-field">
                    <span>{copy.cardLinkUrl}</span>
                    <input
                      type="text"
                      value={item.linkUrl}
                      onChange={(event) => handleCustomCardField(index, "linkUrl", event.target.value)}
                    />
                  </label>
                </div>
                <label className="studio-field">
                  <span>{copy.cardBody}</span>
                  <textarea
                    rows="4"
                    value={item.body[editorLanguage] || ""}
                    onChange={(event) => handleCustomCardLocalizedField(index, "body", event.target.value)}
                  />
                </label>
                <div className="studio-inline-actions">
                  <label className="studio-field studio-field--inline">
                    <span>{copy.cardLinkLabel}</span>
                    <input
                      type="text"
                      value={item.linkLabel[editorLanguage] || ""}
                      onChange={(event) => handleCustomCardLocalizedField(index, "linkLabel", event.target.value)}
                    />
                  </label>
                  <button type="button" className="action-button action-button--secondary" onClick={() => handleRemoveCustomCard(index)}>
                    {copy.removeCustomCard}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section id="studio-projects" className="studio-editor glass-card studio-section-card">
          <div className="studio-editor__head">
            <div>
              <p className="micro-label">PROJECTS</p>
              <h2>{copy.projectsEditorTitle}</h2>
              <p className="body-copy">{copy.projectsEditorBody}</p>
            </div>
            <button type="button" className="action-button action-button--primary" onClick={handleSaveProject}>
              {copy.saveProject}
            </button>
          </div>

          <div className="studio-grid-mini">
            <aside className="studio-project-list">
              <button
                type="button"
                className={`studio-article-item ${selectedProjectSlug === "__new_project__" ? "active" : ""}`}
                onClick={() => setSelectedProjectSlug("__new_project__")}
              >
                <strong>{copy.createProject}</strong>
              </button>
              {projects.map((project) => (
                <button
                  key={project.slug}
                  type="button"
                  className={`studio-article-item ${selectedProjectSlug === project.slug ? "active" : ""}`}
                  onClick={() => setSelectedProjectSlug(project.slug)}
                >
                  <span className="micro-label">{project.category[language] || project.category.en}</span>
                  <strong>{project.title}</strong>
                </button>
              ))}
            </aside>

            <div className="studio-form">
              <div className="studio-form__row">
                <label className="studio-field">
                  <span>{copy.projectTitle}</span>
                  <input
                    type="text"
                    value={projectDraft.title}
                    onChange={(event) => setProjectDraft((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label className="studio-field">
                  <span>{copy.articleSlug}</span>
                  <input
                    type="text"
                    value={projectDraft.slug}
                    onChange={(event) => setProjectDraft((current) => ({ ...current, slug: event.target.value }))}
                  />
                </label>
                <label className="studio-field">
                  <span>{copy.projectMetrics}</span>
                  <input
                    type="text"
                    value={projectDraft.metrics.join(", ")}
                    onChange={(event) =>
                      setProjectDraft((current) => ({
                        ...current,
                        metrics: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                      }))
                    }
                  />
                </label>
              </div>

              <label className="studio-field">
                <span>{copy.projectCategory}</span>
                <input
                  type="text"
                  value={projectDraft.category[editorLanguage] || ""}
                  onChange={(event) => handleProjectLocalizedField("category", event.target.value)}
                />
              </label>

              <label className="studio-field">
                <span>{copy.projectSummary}</span>
                <textarea
                  rows="4"
                  value={projectDraft.summary[editorLanguage] || ""}
                  onChange={(event) => handleProjectLocalizedField("summary", event.target.value)}
                />
              </label>

              <label className="studio-field">
                <span>{copy.projectChallenge}</span>
                <textarea
                  rows="4"
                  value={projectDraft.challenge[editorLanguage] || ""}
                  onChange={(event) => handleProjectLocalizedField("challenge", event.target.value)}
                />
              </label>

              <label className="studio-field">
                <span>{copy.projectSolution}</span>
                <textarea
                  rows="4"
                  value={projectDraft.solution[editorLanguage] || ""}
                  onChange={(event) => handleProjectLocalizedField("solution", event.target.value)}
                />
              </label>

              <label className="studio-field">
                <span>{copy.projectOutcome}</span>
                <textarea
                  rows="4"
                  value={projectDraft.outcome[editorLanguage] || ""}
                  onChange={(event) => handleProjectLocalizedField("outcome", event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>
        </section>

        <aside className="studio-rail glass-card">
            <div className="studio-rail__progress">
              <span className="micro-label">Progress</span>
              <div className="studio-rail__bar">
                <div
                  className="studio-rail__fill"
                  style={{
                    "--studio-progress": studioProgress,
                  }}
                />
              </div>
            </div>
          <nav className="studio-rail__nav">
            {studioSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className="studio-rail__link"
                onClick={() => scrollToStudioSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>
      </section>
    </main>
  );
}

export default function App() {
  const { theme, setTheme, language, setLanguage, font, setFont } = usePreferences();
  const { palette, setPalette } = usePalette();
  const copy = getCopy(language);
  const { articles, projects, siteContent, entries, saveArticle, saveProject, saveContent, addEntry, studioAvailable } = useBackendContent();
  const { isAuthenticated, login, logout, sessionExpired, lockUntil, authReady } = useStudioAuth(studioAvailable);
  const text = {
    ...uiText[language],
    ...(siteContent.text?.[language] ?? {}),
  };
  const meta = {
    ...(siteContent.meta ?? {}),
    role: ensureLocalizedMap(siteContent.meta?.role, ""),
    intro: ensureLocalizedMap(siteContent.meta?.intro, ""),
    stats: {
      ...siteMeta.stats,
      ...(siteContent.meta?.stats ?? {}),
    },
    socialLinks: Array.isArray(siteContent.meta?.socialLinks) ? siteContent.meta.socialLinks.map(normalizeSocialLink) : siteMeta.socialLinks.map(normalizeSocialLink),
    customCards: Array.isArray(siteContent.meta?.customCards) ? siteContent.meta.customCards.map(normalizeCustomCard) : [],
  };

  return (
    <Shell
      theme={theme}
      setTheme={setTheme}
      language={language}
      setLanguage={setLanguage}
      font={font}
      setFont={setFont}
      palette={palette}
      setPalette={setPalette}
      text={text}
      copy={copy}
      meta={meta}
      projects={projects}
    >
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              language={language}
              text={text}
              copy={copy}
              articles={articles}
              meta={meta}
              projects={projects}
              guestbookEntries={entries}
              addGuestbookEntry={addEntry}
            />
          }
        />
        <Route path="/articles" element={<ArticlesPage language={language} text={text} copy={copy} articles={articles} meta={meta} />} />
        <Route path="/articles/:slug" element={<ArticleDetailPage language={language} copy={copy} articles={articles} meta={meta} />} />
        <Route path="/projects/:slug" element={<ProjectDetailPage language={language} text={text} projects={projects} />} />
        <Route
          path="/studio"
          element={
            <StudioPage
              language={language}
              copy={copy}
              articles={articles}
              saveArticle={saveArticle}
              projects={projects}
              saveProject={saveProject}
              isAuthenticated={isAuthenticated}
              login={login}
              logout={logout}
              sessionExpired={sessionExpired}
              lockUntil={lockUntil}
              studioAvailable={studioAvailable}
              authReady={authReady}
              siteContent={siteContent}
              saveSiteContent={saveContent}
            />
          }
        />
      </Routes>
    </Shell>
  );
}

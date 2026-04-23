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

const ARTICLES_STORAGE_KEY = "template-articles";
const STUDIO_AUTH_KEY = "template-studio-auth";
const STUDIO_AUTH_META_KEY = "template-studio-auth-meta";
const STUDIO_LOGIN_GUARD_KEY = "template-studio-login-guard";
const SITE_CONTENT_STORAGE_KEY = "template-site-content";
const PROJECTS_STORAGE_KEY = "template-projects";
const PALETTE_STORAGE_KEY = "template-palette";
const GUESTBOOK_STORAGE_KEY = "template-guestbook";
const STUDIO_AUTH_HASH = "c362a3917539d8e0483c9cc9a59a953928f8fa859227b4cfbebcf454132ef2e0";
const STUDIO_AUTH_SALT = "studio-v1";
const STUDIO_MAX_ATTEMPTS = 5;
const STUDIO_LOCK_MS = 15 * 60 * 1000;
const STUDIO_SESSION_MS = 45 * 60 * 1000;
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
    navStudio: "写作台",
    editedLabel: "最后编辑于",
    saveArticle: "保存文章",
    createArticle: "新建文章",
    openArticle: "查看文章",
    manageArticles: "管理文章",
    studioTitle: "文章后台",
    studioBody: "在这里新增文章、补充图片和音频文件，也能继续编辑以前写过的内容。",
    studioHint: "当前登录仅在本机浏览器本地生效。",
    loginTitle: "登录写作台",
    loginBody: "输入账户名和密码后才能进入文章编辑后台。",
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
  },
  en: {
    navStudio: "Studio",
    editedLabel: "Last edited",
    saveArticle: "Save Article",
    createArticle: "New Article",
    openArticle: "Open Article",
    manageArticles: "Manage Articles",
    studioTitle: "Writing Studio",
    studioBody: "Create, revise, and attach media to articles from one local dashboard.",
    studioHint: "This login is only stored in the current browser locally.",
    loginTitle: "Studio Login",
    loginBody: "Sign in to create and edit articles.",
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

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
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
    const cards = Array.from(document.querySelectorAll(".glass-card"));
    const root = document.documentElement;
    let frameId = 0;
    let latestPointer = null;

    const resetCard = (card) => {
      card.style.setProperty("--mouse-x", `${card.clientWidth / 2}px`);
      card.style.setProperty("--mouse-y", `${card.clientHeight / 2}px`);
      card.style.setProperty("--rotate-x", "0deg");
      card.style.setProperty("--rotate-y", "0deg");
      card.style.setProperty("--light-opacity", "0");
    };

    const updateCard = (card, clientX, clientY, active) => {
      const rect = card.getBoundingClientRect();
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

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
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
          card.style.setProperty("--light-opacity", "0");
          card.style.setProperty("--rotate-x", "0deg");
          card.style.setProperty("--rotate-y", "0deg");
          return;
        }

        const inside =
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom;
        updateCard(card, clientX, clientY, inside);
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
    const handleWindowLeave = () => cards.forEach((card) => resetCard(card));
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cards.forEach((card) => resetCard(card));
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("blur", handleWindowLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    cards.forEach((card) => {
      resetCard(card);
    });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("pointermove", handlePointerMove);
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

function useStudioAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const raw = window.localStorage.getItem(STUDIO_AUTH_META_KEY);
    if (!raw) {
      return false;
    }

    try {
      const parsed = JSON.parse(raw);
      return Number(parsed.expiresAt) > Date.now();
    } catch {
      return false;
    }
  });
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lockUntil, setLockUntil] = useState(() => {
    const raw = window.localStorage.getItem(STUDIO_LOGIN_GUARD_KEY);
    if (!raw) {
      return 0;
    }

    try {
      const parsed = JSON.parse(raw);
      return Number(parsed.lockUntil) || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const raw = window.localStorage.getItem(STUDIO_AUTH_META_KEY);
      if (!raw) {
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (Number(parsed.expiresAt) <= Date.now()) {
          setIsAuthenticated(false);
          setSessionExpired(true);
          window.localStorage.removeItem(STUDIO_AUTH_KEY);
          window.localStorage.removeItem(STUDIO_AUTH_META_KEY);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, []);

  const login = async (username, password) => {
    const now = Date.now();
    const guardRaw = window.localStorage.getItem(STUDIO_LOGIN_GUARD_KEY);
    let guard = { attempts: 0, lockUntil: 0 };

    if (guardRaw) {
      try {
        guard = { ...guard, ...JSON.parse(guardRaw) };
      } catch {
        guard = { attempts: 0, lockUntil: 0 };
      }
    }

    if (guard.lockUntil && guard.lockUntil > now) {
      setLockUntil(guard.lockUntil);
      return { ok: false, reason: "locked" };
    }

    const digest = await sha256Hex(`${username}:${password}:${STUDIO_AUTH_SALT}`);
    if (digest === STUDIO_AUTH_HASH) {
      const expiresAt = Date.now() + STUDIO_SESSION_MS;
      setIsAuthenticated(true);
      setSessionExpired(false);
      setLockUntil(0);
      window.localStorage.setItem(STUDIO_AUTH_KEY, "1");
      window.localStorage.setItem(
        STUDIO_AUTH_META_KEY,
        JSON.stringify({ expiresAt })
      );
      window.localStorage.setItem(
        STUDIO_LOGIN_GUARD_KEY,
        JSON.stringify({ attempts: 0, lockUntil: 0 })
      );
      return { ok: true };
    }

    const attempts = Number(guard.attempts || 0) + 1;
    const nextGuard = {
      attempts,
      lockUntil: attempts >= STUDIO_MAX_ATTEMPTS ? now + STUDIO_LOCK_MS : 0,
    };
    window.localStorage.setItem(STUDIO_LOGIN_GUARD_KEY, JSON.stringify(nextGuard));
    setLockUntil(nextGuard.lockUntil);

    return {
      ok: false,
      reason: nextGuard.lockUntil ? "locked" : "invalid",
    };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setSessionExpired(false);
    window.localStorage.removeItem(STUDIO_AUTH_KEY);
    window.localStorage.removeItem(STUDIO_AUTH_META_KEY);
  };

  return { isAuthenticated, login, logout, sessionExpired, lockUntil };
}

function useArticlesManager() {
  const [articles, setArticles] = useState(() => {
    const stored = window.localStorage.getItem(ARTICLES_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return sortArticles(parsed.map(normalizeArticle));
      } catch {
        return sortArticles(seedArticles.map(normalizeArticle));
      }
    }

    return sortArticles(seedArticles.map(normalizeArticle));
  });

  useEffect(() => {
    window.localStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify(articles));
  }, [articles]);

  const saveArticle = (incoming, previousSlug = null) => {
    const stamped = {
      ...incoming,
      date: formatArticleDate(new Date()),
      updatedAt: new Date().toISOString(),
    };

    setArticles((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((item) => item.slug === (previousSlug || stamped.slug));

      if (existingIndex >= 0) {
        next[existingIndex] = stamped;
      } else {
        next.unshift(stamped);
      }

      return sortArticles(next);
    });
  };

  return { articles, saveArticle };
}

function useProjectsManager() {
  const [projects, setProjects] = useState(() => {
    const stored = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored).map(normalizeProject);
      } catch {
        return featuredProjects.map(normalizeProject);
      }
    }

    return featuredProjects.map(normalizeProject);
  });

  useEffect(() => {
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const saveProject = (incoming, previousSlug = null) => {
    setProjects((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((item) => item.slug === (previousSlug || incoming.slug));
      if (existingIndex >= 0) {
        next[existingIndex] = incoming;
      } else {
        next.unshift(incoming);
      }
      return next;
    });
  };

  return { projects, saveProject };
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
      role: ensureLocalizedMap(siteMeta.role, ""),
      intro: ensureLocalizedMap(siteMeta.intro, ""),
      stats: { ...siteMeta.stats },
      socialLinks: [...siteMeta.socialLinks],
    },
    text: textContent,
  };
}

function useSiteContent(language) {
  const [content, setContent] = useState(() => {
    const fallback = buildDefaultSiteContent();
    const stored = window.localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
    if (!stored) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(stored);
      return {
        meta: {
          ...fallback.meta,
          ...parsed.meta,
          role: ensureLocalizedMap(parsed.meta?.role ?? fallback.meta.role, ""),
          intro: ensureLocalizedMap(parsed.meta?.intro ?? fallback.meta.intro, ""),
          stats: { ...fallback.meta.stats, ...(parsed.meta?.stats ?? {}) },
          socialLinks: Array.isArray(parsed.meta?.socialLinks) ? parsed.meta.socialLinks : fallback.meta.socialLinks,
        },
        text: Object.fromEntries(
          Object.entries(fallback.text).map(([lang, value]) => [
            lang,
            {
              ...value,
              ...(parsed.text?.[lang] ?? {}),
            },
          ])
        ),
      };
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(content));
  }, [content]);

  const saveContent = (nextContent) => setContent(nextContent);
  const text = {
    ...uiText[language],
    ...(content.text[language] ?? {}),
  };

  return { siteContent: content, meta: content.meta, text, saveContent };
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
            <button type="button" className="dock-button" onClick={applySource}>
              {text.applySource}
            </button>
            <button type="button" className="dock-button" onClick={resetSource}>
              {text.resetSource}
            </button>
          </div>
        </div>

        {customSource?.type === "spotify" ? (
          <iframe
            className="music-dock__embed"
            src={customSource.embedSrc}
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify Embed"
          />
        ) : customSource?.type === "unsupported" ? (
          <div className="music-dock__message">{text.unsupportedSource}</div>
        ) : (
          <>
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
          </>
        )}
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
          <ExpandableSelector label={text.fontLabel} value={font} onChange={setFont} options={fonts} />
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
    const update = () => {
      const scrollTop = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const next = total > 0 ? Math.min(1, Math.max(0, scrollTop / total)) : 0;
      setProgress(next);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
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

function useGuestbook() {
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

  useEffect(() => {
    window.localStorage.setItem(GUESTBOOK_STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const addEntry = (entry) => {
    setEntries((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        ...entry,
      },
      ...current,
    ]);
  };

  return { entries, addEntry };
}

function HomePage({ language, text, copy, articles, meta, projects, guestbookEntries, addGuestbookEntry }) {
  const [guestbookForm, setGuestbookForm] = useState({ name: "", message: "" });
  useSeo({
    title: `${meta.name} / ${text.heroTitle}`,
    description: text.heroBody,
    image: templateAvatar,
  });

  const topArticles = useMemo(() => {
    const pinned = articles.filter((article) => article.pinned);
    const rest = articles.filter((article) => !article.pinned);
    return [...pinned, ...rest].slice(0, 3);
  }, [articles]);

  const submitGuestbook = (event) => {
    event.preventDefault();
    if (!guestbookForm.name.trim() || !guestbookForm.message.trim()) {
      return;
    }
    addGuestbookEntry({
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
            <img src={templateAvatar} alt={`${meta.name} avatar`} />
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

      <section className="ticker-strip glass-card">
        <div className="ticker-strip__track">
          {[...text.ticker, ...text.ticker].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </section>

      <section className="social-strip glass-card">
        {meta.socialLinks.map((item) => (
          <a key={item.label} className="social-pill" href={item.url} target="_blank" rel="noreferrer" aria-label={item.label}>
            <SocialIcon type={item.icon} />
            <span>{item.label}</span>
          </a>
        ))}
      </section>

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

function ArticlesPage({ language, text, copy, articles }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  useSeo({
    title: `${text.articleIndexTitle} / ${siteMeta.name}`,
    description: text.articleIndexBody,
    image: templateAvatar,
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

function ArticleDetailPage({ language, copy, articles }) {
  const { slug } = useParams();
  const article = useMemo(
    () => articles.find((item) => item.slug === slug) ?? articles[0],
    [articles, slug]
  );
  const progress = useReadingProgress();
  const [copied, setCopied] = useState(false);
  const seoTitle = article ? `${article.title[language]} / ${siteMeta.name}` : siteMeta.name;
  const seoDescription = article ? article.excerpt[language] || article.excerpt.en : "";
  const seoImage = article?.coverImage || templateAvatar;
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
  siteContent,
  saveSiteContent,
}) {
  const [selectedSlug, setSelectedSlug] = useState(articles[0]?.slug ?? "__new__");
  const [selectedProjectSlug, setSelectedProjectSlug] = useState(projects[0]?.slug ?? "__new_project__");
  const [editorLanguage, setEditorLanguage] = useState(language);
  const [draft, setDraft] = useState(() => cloneArticle(articles[0] ?? createBlankArticle()));
  const [projectDraft, setProjectDraft] = useState(() => cloneProject(projects[0] ?? createBlankProject()));
  const [siteDraft, setSiteDraft] = useState(() => JSON.parse(JSON.stringify(siteContent)));
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [flash, setFlash] = useState("");
  const [siteFlash, setSiteFlash] = useState("");

  useEffect(() => {
    setEditorLanguage(language);
  }, [language]);

  useEffect(() => {
    setSiteDraft(JSON.parse(JSON.stringify(siteContent)));
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

    setLoginError(result.reason === "locked" ? copy.loginLocked : copy.loginError);
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

  const handleSave = () => {
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

    saveArticle(nextDraft, selectedSlug === "__new__" ? null : selectedSlug);
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

  const handleSaveSiteContent = () => {
    saveSiteContent(siteDraft);
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

  const handleSaveProject = () => {
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

    saveProject(nextProject, selectedProjectSlug === "__new_project__" ? null : selectedProjectSlug);
    setSelectedProjectSlug(nextSlug);
    setFlash(copy.projectSaved);
    window.setTimeout(() => setFlash(""), 1600);
  };

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

      <section className="studio-grid">
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
        <section className="studio-editor glass-card">
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
        <section className="studio-editor glass-card">
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
        <section className="studio-editor glass-card">
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
      </section>
    </main>
  );
}

export default function App() {
  const { theme, setTheme, language, setLanguage, font, setFont } = usePreferences();
  const { palette, setPalette } = usePalette();
  const copy = getCopy(language);
  const { isAuthenticated, login, logout, sessionExpired, lockUntil } = useStudioAuth();
  const { articles, saveArticle } = useArticlesManager();
  const { projects, saveProject } = useProjectsManager();
  const { siteContent, meta, text, saveContent } = useSiteContent(language);
  const { entries, addEntry } = useGuestbook();

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
        <Route path="/articles" element={<ArticlesPage language={language} text={text} copy={copy} articles={articles} />} />
        <Route path="/articles/:slug" element={<ArticleDetailPage language={language} copy={copy} articles={articles} />} />
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
              siteContent={siteContent}
              saveSiteContent={saveContent}
            />
          }
        />
      </Routes>
    </Shell>
  );
}

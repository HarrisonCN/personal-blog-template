import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useLayoutEffect } from "react";

import InteractiveSceneBackground from "./components/InteractiveSceneBackground";

import ArchivePreview from "./components/ArchivePreview";
import CommandPalette from "./components/CommandPalette";
import HomeLayoutSwitcher from "./components/HomeLayoutSwitcher";
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

const AntigravityBackground = lazy(() => import("./components/AntigravityBackground"));
const ThemePresetScene = lazy(() => import("./components/ThemePresetScene"));


const PALETTE_STORAGE_KEY = "template-palette";
const GUESTBOOK_STORAGE_KEY = "template-guestbook";
const HOME_LAYOUT_STORAGE_KEY = "template-home-layout";
const HOME_CARD_META_STORAGE_KEY = "template-home-card-meta";
const HOME_ARCHIVE_STATE_STORAGE_KEY = "template-home-archive-state";
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
const VALID_BACKGROUND_PRESETS = new Set(["none", "antigravity", "xflow"]);
const THEME_PRESET_OPTIONS = [
  { code: "none", label: "Default" },
  { code: "xflow", label: "X Flow" },
  { code: "antigravity", label: "Antigravity" },
];
const BACKGROUND_PRESETS = [
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

const STUDIO_BACKGROUND_PRESETS = BACKGROUND_PRESETS.filter((preset) => VALID_BACKGROUND_PRESETS.has(preset.code));
const HOME_LAYOUT_OPTIONS = [
  { code: "magazine", icon: "M" },
  { code: "archive", icon: "A" },
  { code: "cards", icon: "C" },
];
// 本地缓存键：用于记录用户在站内的访问、阅读和编辑轨迹。
const RECENT_ACCESS_STORAGE_KEY = "template-recent-access";
const RECENT_READING_STORAGE_KEY = "template-recent-reading";
const RECENT_EDITING_STORAGE_KEY = "template-recent-editing";
const HOME_CARD_ORDER_STORAGE_KEY = "template-home-card-order";
const AMBIENT_TRACKS = [
  { code: "rain", title: { zh: "雨幕", en: "Rain Room" }, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { code: "harbor", title: { zh: "港湾", en: "Harbor Hush" }, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { code: "night", title: { zh: "夜读", en: "Night Air" }, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
];
const EXPERIENCE_COPY = {
  zh: {
    commandOpen: "命令面板",
    commandPlaceholder: "搜索文章、项目、主题、背景或后台入口",
    commandEmpty: "没有匹配结果",
    archiveTitle: "时间档案",
    archiveBody: "把文章、项目和持续实验放进同一条时间轴里。",
    archiveOpen: "打开档案",
    pinnedTitle: "Pinned Spaces",
    pinnedBody: "把最想先被看到的内容固定在首页入口。",
    layoutTitle: "首页布局",
    layoutMagazine: "杂志流",
    layoutArchive: "档案流",
    layoutCards: "卡片流",
    readingRoom: "阅读室",
    focusMode: "专注",
    nightMode: "夜读",
    ambientMode: "环境音",
    readAloud: "朗读",
    stopReading: "停止朗读",
    footnotes: "脚注",
    timelineArticles: "文章",
    timelineProjects: "项目",
    pinnedEditorTitle: "固定空间",
    pinnedEditorBody: "把文章、项目、链接或音频固定到首页。",
    addPinnedSpace: "新增固定项",
    removePinnedSpace: "删除固定项",
    pinnedKind: "内容类型",
    pinnedArticle: "文章",
    pinnedProject: "项目",
    pinnedLink: "链接",
    pinnedAudio: "音频",
    pinnedLabel: "标题",
    pinnedBodyLabel: "说明",
    pinnedUrl: "链接地址",
    pinnedAudioTitle: "音频标题",
    pinnedAudioArtist: "音频作者",
    pinnedAudioSrc: "音频地址",
    pinnedTarget: "关联内容",
    footnotesEditor: "脚注",
    openCommand: "打开命令面板",
    recentAccess: "最近访问",
    quickActions: "快捷操作",
    createArticleQuick: "新建文章",
    createProjectQuick: "新建项目",
    highlightAction: "高亮此段",
    noteOnParagraph: "添加批注",
    saveNote: "保存批注",
    removeNote: "删除批注",
    notePlaceholder: "写下这一段的理解、待改点或延展想法",
    highlightedParagraphs: "高亮段落",
    favoriteParagraphs: "收藏段落",
    readingResume: "继续阅读",
    recentReading: "最近阅读",
    recentEditing: "最近编辑",
    quickTheme: "快速切主题",
    quickLanguage: "快速切语言",
    exportNotes: "导出批注",
    importNotesDraft: "批注已导入草稿",
    readingStats: "阅读统计",
    statsWords: "字数",
    statsParagraphs: "段落",
    statsNotes: "批注",
    statsFavorites: "收藏",
    archiveFilter: "筛选",
    archiveSearch: "搜索档案内容",
    archiveAllYears: "全部年份",
    archiveAllTags: "全部标签",
  },
  en: {
    commandOpen: "Command Palette",
    commandPlaceholder: "Search articles, projects, themes, backgrounds, or studio routes",
    commandEmpty: "No results found",
    archiveTitle: "Timeline Archive",
    archiveBody: "Place articles, projects, and ongoing experiments on one shared timeline.",
    archiveOpen: "Open Archive",
    pinnedTitle: "Pinned Spaces",
    pinnedBody: "Pin the content that should be discovered first on the homepage.",
    layoutTitle: "Home Layout",
    layoutMagazine: "Magazine",
    layoutArchive: "Archive",
    layoutCards: "Cards",
    readingRoom: "Reading Room",
    focusMode: "Focus",
    nightMode: "Night",
    ambientMode: "Ambient",
    readAloud: "Read Aloud",
    stopReading: "Stop Reading",
    footnotes: "Footnotes",
    timelineArticles: "Articles",
    timelineProjects: "Projects",
    pinnedEditorTitle: "Pinned Spaces",
    pinnedEditorBody: "Pin articles, projects, links, or audio modules to the homepage.",
    addPinnedSpace: "Add Pinned Space",
    removePinnedSpace: "Remove Item",
    pinnedKind: "Type",
    pinnedArticle: "Article",
    pinnedProject: "Project",
    pinnedLink: "Link",
    pinnedAudio: "Audio",
    pinnedLabel: "Title",
    pinnedBodyLabel: "Description",
    pinnedUrl: "Link URL",
    pinnedAudioTitle: "Audio Title",
    pinnedAudioArtist: "Audio Artist",
    pinnedAudioSrc: "Audio URL",
    pinnedTarget: "Target",
    footnotesEditor: "Footnotes",
    openCommand: "Open Command Palette",
    recentAccess: "Recent",
    quickActions: "Quick Actions",
    createArticleQuick: "New Article",
    createProjectQuick: "New Project",
    highlightAction: "Highlight",
    noteOnParagraph: "Annotate",
    saveNote: "Save Note",
    removeNote: "Remove Note",
    notePlaceholder: "Capture a thought, revision note, or follow-up idea for this paragraph",
    highlightedParagraphs: "Highlights",
    favoriteParagraphs: "Favorites",
    readingResume: "Resume Reading",
    recentReading: "Recent Reading",
    recentEditing: "Recent Editing",
    quickTheme: "Quick Theme",
    quickLanguage: "Quick Language",
    exportNotes: "Export Notes",
    importNotesDraft: "Notes imported into draft",
    readingStats: "Reading Stats",
    statsWords: "Words",
    statsParagraphs: "Paragraphs",
    statsNotes: "Notes",
    statsFavorites: "Favorites",
    archiveFilter: "Filters",
    archiveSearch: "Search archive content",
    archiveAllYears: "All Years",
    archiveAllTags: "All Tags",
  },
};

function normalizeBackgroundPreset(value) {
  return VALID_BACKGROUND_PRESETS.has(value) ? value : "none";
}

function getExperienceCopy(language) {
  return EXPERIENCE_COPY[language] ? { ...EXPERIENCE_COPY.en, ...EXPERIENCE_COPY[language] } : EXPERIENCE_COPY.en;
}

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
    studioBody: "在这里新增文章、补充图片和音频文件，也能继续修改之前写过的内容。",
    studioHint: "写作台登录和内容保存现在由服务端处理，不再暴露在前端。",
    loginTitle: "登录开发者编辑",
    loginBody: "输入由服务端校验的账号和密码后才能进入后台。",
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
    uploadFiles: "上传图片 / 音频 / 视频 / 文件",
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
    browserTitle: "标签页名称",
    backgroundTitle: "网页背景",
    uploadBackground: "上传背景图",
    clearBackground: "清除背景",
    backgroundPreset: "背景预设",
    brandName: "站点名称",
    brandEmail: "联系邮箱",
    brandLocation: "所在地区",
    roleLabel: "个人角色",
    introLabel: "个人介绍",
    statProjects: "项目数量",
    statEssays: "文章数量",
    statLabs: "实验数量",
    loginLocked: "登录失败次数过多，请稍后再试",
    sessionExpired: "后台会话已过期，请重新登录",
    projectsEditorTitle: "项目编辑",
    projectsEditorBody: "这里可以新增、修改项目卡片和项目详情内容。",
    saveProject: "保存项目",
    deleteProject: "删除项目",
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
    browserTitle: "Tab Title",
    backgroundTitle: "Page Background",
    uploadBackground: "Upload Background",
    clearBackground: "Clear Background",
    backgroundPreset: "Background Preset",
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
    deleteProject: "Delete Project",
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

function ensureLocalizedList(value) {
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

function normalizeArticle(article, index) {
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
    footnotes: {
      zh: [...(article.footnotes?.zh || [])],
      en: [...(article.footnotes?.en || [])],
      ja: [...(article.footnotes?.ja || [])],
      ko: [...(article.footnotes?.ko || [])],
    },
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
    updatedAt: project.updatedAt || new Date().toISOString(),
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
    updatedAt: project.updatedAt,
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

function normalizePinnedSpace(item, index = 0) {
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

function createBlankPinnedSpace() {
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

function getSiteAvatar(meta, fallbackImage) {
  return typeof meta?.avatarImage === "string" && meta.avatarImage ? meta.avatarImage : fallbackImage;
}

function getBrowserTitle(meta, language) {
  return meta?.browserTitle?.[language] || meta?.browserTitle?.en || meta?.name || "Site";
}

function SiteBackground({ presetCode, imageSrc }) {
  if (imageSrc) {
    return (
      <div className="site-background site-background--image" aria-hidden="true">
        <div className="site-background__image" style={{ backgroundImage: `url("${String(imageSrc).replace(/"/g, '\\"')}")` }} />
        <span className="site-background__image-glow site-background__image-glow--a" />
        <span className="site-background__image-glow site-background__image-glow--b" />
        <span className="site-background__float site-background__float--image-a" style={{ "--depth-x": 22, "--depth-y": 16, "--drift-x": 20, "--drift-y": -16, "--duration": "17s", "--delay": "-3s" }} />
        <span className="site-background__float site-background__float--image-b" style={{ "--depth-x": -18, "--depth-y": 14, "--drift-x": -18, "--drift-y": 16, "--duration": "15s", "--delay": "-8s" }} />
      </div>
    );
  }

  if (presetCode === "antigravity") {
    return (
      <div className="site-background site-background--antigravity" aria-hidden="true">
        <Suspense fallback={null}><AntigravityBackground /></Suspense>
      </div>
    );
  }

  if (presetCode === "xflow") {
    return (
      <div className="site-background site-background--xflow" aria-hidden="true">
        <Suspense fallback={null}><ThemePresetScene mode="xflow" /></Suspense>
      </div>
    );
  }

  return (
    <div className="site-background site-background--none" aria-hidden="true">
      <InteractiveSceneBackground mode="none" />
    </div>
  );
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
    updatedAt: new Date().toISOString(),
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
    footnotes: { zh: [], en: [], ja: [], ko: [] },
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
      id: `paragraph-${index}`,
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

    const cards = Array.from(document.querySelectorAll(".glass-card:not(.glass-card--static)")).map((card) => ({
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
      root.style.setProperty("--cursor-rx", `${(((clientX / window.innerWidth) - 0.5) * 2).toFixed(4)}`);
      root.style.setProperty("--cursor-ry", `${(((clientY / window.innerHeight) - 0.5) * 2).toFixed(4)}`);

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
      setMessage("琚姝㈢殑鎿嶄綔");
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

  const deleteProject = async (slug) => {
    if (!studioAvailable) {
      return { ok: false, reason: "studio_unavailable" };
    }

    try {
      const payload = await apiRequest("/api/studio/projects/delete", {
        method: "POST",
        body: JSON.stringify({ slug }),
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
      const normalized = normalizeSiteContent(payload.siteContent ?? nextContent);
      setSiteContent(normalized);
      return { ok: true, siteContent: normalized };
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

  return { articles, projects, siteContent, entries, saveArticle, saveProject, deleteProject, saveContent, addEntry, studioAvailable, contentReady };
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

function getTrackCoverStyle(track, customSource) {
  if (customSource?.type === "spotify") {
    return {
      background:
        "radial-gradient(circle at 24% 18%, rgba(255,255,255,.34), transparent 26%), linear-gradient(135deg, #42d392 0%, #19392f 48%, #0d1411 100%)",
    };
  }

  const colors = track?.cover?.colors || ["#dbeafe", "#9dc9ff", "#283759"];
  return {
    background: `radial-gradient(circle at 24% 18%, rgba(255,255,255,.34), transparent 24%), linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 46%, ${colors[2]} 100%)`,
  };
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
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const coverStyle = getTrackCoverStyle(currentTrack, customSource);
  const compactTitle =
    customSource?.type === "spotify"
      ? "Spotify"
      : customSource?.type === "unsupported"
        ? text.directSource
        : currentTrack.title;
  const compactSubtitle =
    customSource?.type === "spotify"
      ? "Spotify"
      : customSource?.type === "unsupported"
        ? text.unsupportedSource
        : currentTrack.artist;

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
        <div className="music-dock__compact">
          <div className="music-dock__cover music-dock__cover--compact" style={coverStyle} aria-hidden="true">
            <span>{compactTitle.slice(0, 1)}</span>
          </div>
          <div className="music-dock__head">
            <span className="micro-label">{text.nowPlaying}</span>
            <strong>{compactTitle}</strong>
            <span className="music-dock__artist">{compactSubtitle}</span>
          </div>
        </div>
        <div className="music-dock__toggle-side">
          <div className="music-dock__mini-progress">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="music-dock__caret">{expanded ? "-" : "+"}</span>
        </div>
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
              <div className="music-dock__player">
                <div className="music-dock__cover" style={coverStyle} aria-hidden="true">
                  <span>{currentTrack.title.slice(0, 1)}</span>
                </div>
                <div className="music-dock__player-main">
                  <div className="music-dock__meta">
                    <strong>{currentTrack.title}</strong>
                    <span>{currentTrack.artist}</span>
                  </div>
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
                </div>
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
  backgroundPreset,
  setBackgroundPreset,
  palette,
  setPalette,
  text,
  copy,
  meta,
  projects,
  onOpenCommandPalette,
}) {
  const experience = getExperienceCopy(language);
  const location = useLocation();
  const navRef = useRef(null);
  const navItemsRef = useRef({});
  const [capsuleStyle, setCapsuleStyle] = useState(null);
  const [capsuleMoving, setCapsuleMoving] = useState(false);

  const activeNavKey = useMemo(() => {
    if (location.pathname.startsWith("/studio")) {
      return "studio";
    }
    if (location.pathname.startsWith("/projects")) {
      return "projects";
    }
    if (location.pathname.startsWith("/articles")) {
      return "articles";
    }
    if (location.hash === "#about") {
      return "about";
    }
    return "home";
  }, [location.hash, location.pathname]);

  useEffect(() => {
    setCapsuleMoving(true);
    const timer = window.setTimeout(() => setCapsuleMoving(false), 360);
    return () => window.clearTimeout(timer);
  }, [activeNavKey]);

  const syncNavCapsule = useMemo(
    () => () => {
      const navNode = navRef.current;
      const activeNode = navItemsRef.current[activeNavKey];
      if (!navNode || !activeNode) {
        setCapsuleStyle(null);
        return;
      }
      const navRect = navNode.getBoundingClientRect();
      const activeRect = activeNode.getBoundingClientRect();
      setCapsuleStyle({
        width: activeRect.width,
        height: activeRect.height,
        transform: `translate(${activeRect.left - navRect.left + navNode.scrollLeft}px, ${activeRect.top - navRect.top + navNode.scrollTop}px)`,
        "--nav-transform": `translate(${activeRect.left - navRect.left + navNode.scrollLeft}px, ${activeRect.top - navRect.top + navNode.scrollTop}px)`,
        opacity: 1,
      });
    },
    [activeNavKey]
  );

  useLayoutEffect(() => {
    syncNavCapsule();
  }, [syncNavCapsule, backgroundPreset, language, location.hash, location.pathname]);

  useEffect(() => {
    const navNode = navRef.current;
    if (!navNode) {
      return undefined;
    }
    window.addEventListener("resize", syncNavCapsule);
    navNode.addEventListener("scroll", syncNavCapsule, { passive: true });
    return () => {
      window.removeEventListener("resize", syncNavCapsule);
      navNode.removeEventListener("scroll", syncNavCapsule);
    };
  }, [syncNavCapsule]);

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
        <nav ref={navRef} className={`site-nav ${capsuleStyle ? "site-nav--ready" : ""} ${capsuleMoving ? "is-moving" : ""}`}>
          <span className={`site-nav__capsule ${capsuleMoving ? "is-moving" : ""}`} style={capsuleStyle || undefined} aria-hidden="true" />
          <NavLink to="/" ref={(node) => (navItemsRef.current.home = node)}>
            <span className="nav-label">{text.navHome}</span>
          </NavLink>
          <NavLink to="/articles" ref={(node) => (navItemsRef.current.articles = node)}>
            <span className="nav-label">{text.navArticles}</span>
          </NavLink>
          <NavLink to={`/projects/${projects[0]?.slug ?? ""}`} ref={(node) => (navItemsRef.current.projects = node)}>
            <span className="nav-label">{text.navProjects}</span>
          </NavLink>
          <a href="#about" ref={(node) => (navItemsRef.current.about = node)}>
            <span className="nav-label">{text.navAbout}</span>
          </a>
          <NavLink to="/studio" ref={(node) => (navItemsRef.current.studio = node)}>
            <span className="nav-label">{copy.navStudio}</span>
          </NavLink>
        </nav>
      </div>

      <div className="header-panel tool-panel">
        <div className="tool-stack">
          <button type="button" className="selector-trigger selector-trigger--command" onClick={onOpenCommandPalette}>
            <span className="micro-label">⌘K</span>
            <strong>{experience.commandOpen}</strong>
          </button>
          <ExpandableSelector label={text.backgroundPreset} value={backgroundPreset} onChange={setBackgroundPreset} options={THEME_PRESET_OPTIONS} />
          <ExpandableSelector label={text.languageLabel} value={language} onChange={setLanguage} options={languages} />
          <FontSlider label={text.fontLabel} value={font} onChange={setFont} options={fonts} />
          <ThemeToggle theme={theme} setTheme={setTheme} text={text} />
        </div>
      </div>
    </header>
  );
}

function PageTransitionOverlay({ transitionKey }) {
  const [phase, setPhase] = useState("enter");

  useEffect(() => {
    setPhase("enter");
    const fadeTimer = window.setTimeout(() => setPhase("leave"), 560);
    const removeTimer = window.setTimeout(() => setPhase("idle"), 1080);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [transitionKey]);

  if (phase === "idle") {
    return null;
  }

  return (
    <div className={`page-transition page-transition--${phase}`} aria-hidden="true">
      <div className="page-transition__core" />
      <div className="page-transition__bar" />
      <div className="page-transition__mesh" />
    </div>
  );
}

function Shell({
  theme,
  setTheme,
  language,
  setLanguage,
  font,
  setFont,
  backgroundPreset,
  setBackgroundPreset,
  palette,
  setPalette,
  text,
  copy,
  meta,
  articles,
  projects,
  homeLayout,
  children,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useGlassTracking(location.pathname);
  const blockedMessage = useInteractionGuard();
  const transitionKey = `${location.pathname}|${backgroundPreset}`;
  const commandActions = useMemo(() => {
    const experience = getExperienceCopy(language);
    // 主题、语言、布局、最近轨迹统一汇总到命令面板里，作为全站控制中心。
    const themeActions = THEME_PRESET_OPTIONS.map((item) => ({
      id: `theme-${item.code}`,
      group: experience.quickTheme,
      label: item.label,
      keywords: `theme ${item.label}`,
      run: () => setBackgroundPreset(item.code),
    }));
    const languageActions = languages.map((item) => ({
      id: `language-${item.code}`,
      group: experience.quickLanguage,
      label: item.label,
      keywords: `language ${item.label}`,
      run: () => setLanguage(item.code),
    }));
    const layoutActions = HOME_LAYOUT_OPTIONS.map((item) => ({
      id: `layout-${item.code}`,
      group: experience.quickActions,
      label:
        item.code === "archive"
          ? experience.layoutArchive
          : item.code === "cards"
            ? experience.layoutCards
            : experience.layoutMagazine,
      keywords: `layout ${item.code}`,
      run: () => {
        const next = normalizeHomeLayout(item.code);
        window.localStorage.setItem(HOME_LAYOUT_STORAGE_KEY, next);
        window.dispatchEvent(new CustomEvent("template:home-layout", { detail: next }));
        if (location.pathname !== "/") {
          navigate("/");
        }
      },
    }));
    const currentLayoutLabel =
      homeLayout === "archive"
        ? experience.layoutArchive
        : homeLayout === "cards"
          ? experience.layoutCards
          : experience.layoutMagazine;
    const currentLayoutAction = {
      id: "layout-current",
      group: experience.layoutTitle,
      label: `${experience.layoutTitle}: ${currentLayoutLabel}`,
      keywords: `current layout ${currentLayoutLabel}`,
      run: () => {
        if (location.pathname !== "/") {
          navigate("/");
        }
      },
    };

    const routeActions = [
      { id: "route-home", group: "Route", label: text.navHome, keywords: "home", run: () => navigate("/") },
      { id: "route-articles", group: "Route", label: text.navArticles, keywords: "articles writing", run: () => navigate("/articles") },
      { id: "route-archive", group: "Route", label: experience.archiveTitle, keywords: "archive timeline", run: () => navigate("/archive") },
      { id: "route-studio", group: "Route", label: copy.navStudio, keywords: "studio editor", run: () => navigate("/studio") },
      { id: "create-article", group: experience.quickActions, label: experience.createArticleQuick, keywords: "new article write", run: () => navigate("/studio?create=article") },
      { id: "create-project", group: experience.quickActions, label: experience.createProjectQuick, keywords: "new project", run: () => navigate("/studio?create=project") },
    ];
    const recentActions = getRecentAccesses().map((item) => ({
      id: `recent-${item.path}`,
      group: experience.recentAccess,
      label: item.label,
      keywords: item.label,
      run: () => navigate(item.path),
    }));
    const recentReadingActions = getRecentReadings().map((item) => ({
      id: `recent-reading-${item.path}`,
      group: experience.recentReading,
      label: item.label,
      keywords: `${item.label} reading article`,
      run: () => navigate(item.path),
    }));
    const recentEditingActions = getRecentEdits().map((item) => ({
      id: `recent-edit-${item.id}`,
      group: experience.recentEditing,
      label: item.label,
      keywords: `${item.label} edit studio`,
      run: () => navigate(item.path),
    }));

    const articleActions = articles.slice(0, 12).map((article) => ({
      id: `article-${article.slug}`,
      group: "Article",
      label: article.title[language] || article.title.en,
      keywords: `${article.tag} ${article.excerpt[language] || article.excerpt.en || ""}`,
      run: () => navigate(`/articles/${article.slug}`),
    }));

    const projectActions = projects.slice(0, 12).map((project) => ({
      id: `project-${project.slug}`,
      group: "Project",
      label: project.title,
      keywords: `${project.category[language] || project.category.en} ${project.summary[language] || project.summary.en || ""}`,
      run: () => navigate(`/projects/${project.slug}`),
    }));

    const archiveEntries = buildArchiveEntries(articles, projects);
    const archiveYears = Array.from(new Set(archiveEntries.map((item) => item.year)));
    const archiveParams = new URLSearchParams(location.search);
    const currentArchiveType = archiveParams.get("archiveType") || "all";
    const currentArchiveYear = archiveParams.get("archiveYear") || "all";
    const currentArchiveTypeLabel =
      currentArchiveType === "article"
        ? experience.timelineArticles
        : currentArchiveType === "project"
          ? experience.timelineProjects
          : experience.timelineAll || "All";
    const currentArchiveAction = {
      id: "archive-current",
      group: experience.archiveTitle,
      label: `${experience.archiveTitle}: ${currentArchiveYear === "all" ? "All Years" : currentArchiveYear} / ${currentArchiveTypeLabel}`,
      keywords: `archive current ${currentArchiveYear} ${currentArchiveType}`,
      run: () => navigate(location.pathname === "/archive" ? `${location.pathname}${location.search}` : "/archive"),
    };
    const archiveTypeActions = [
      { code: "all", label: experience.timelineAll || "All" },
      { code: "article", label: experience.timelineArticles },
      { code: "project", label: experience.timelineProjects },
    ].map((item) => ({
      id: `archive-type-${item.code}`,
      group: experience.archiveTitle,
      label: `${experience.archiveTitle}: ${item.label}`,
      keywords: `archive ${item.code} filter`,
      run: () => navigate(item.code === "all" ? "/archive" : `/archive?archiveType=${item.code}`),
    }));
    const archiveYearActions = archiveYears.map((year) => ({
      id: `archive-year-${year}`,
      group: experience.archiveTitle,
      label: `${experience.archiveTitle}: ${year}`,
      keywords: `archive year ${year}`,
      run: () => navigate(`/archive?archiveYear=${year}`),
    }));

    return [
      ...recentActions,
      ...recentReadingActions,
      ...recentEditingActions,
      currentLayoutAction,
      ...routeActions,
      ...layoutActions,
      ...themeActions,
      ...languageActions,
      currentArchiveAction,
      ...archiveTypeActions,
      ...archiveYearActions,
      ...articleActions,
      ...projectActions,
    ];
  }, [articles, copy.navStudio, language, location.pathname, location.search, navigate, projects, setBackgroundPreset, setLanguage, text.navArticles, text.navHome]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    const article = articles.find((item) => `/articles/${item.slug}` === location.pathname);
    const project = projects.find((item) => `/projects/${item.slug}` === location.pathname);
    const experience = getExperienceCopy(language);
    const label = article
      ? article.title[language] || article.title.en
      : project
        ? project.title
        : location.pathname === "/archive"
          ? experience.archiveTitle
          : location.pathname === "/articles"
            ? text.navArticles
            : location.pathname === "/studio"
              ? copy.navStudio
              : text.navHome;
    pushRecentAccess({ path: location.pathname, label, timestamp: Date.now(), layout: homeLayout });
  }, [articles, copy.navStudio, homeLayout, language, location.pathname, projects, text.navArticles, text.navHome]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <div className="site-shell">
      <PageTransitionOverlay transitionKey={transitionKey} />
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
        backgroundPreset={backgroundPreset}
        setBackgroundPreset={setBackgroundPreset}
        palette={palette}
        setPalette={setPalette}
        text={text}
        copy={copy}
        meta={meta}
        projects={projects}
        onOpenCommandPalette={() => setPaletteOpen(true)}
      />
      <div className="cursor-dot" aria-hidden="true" />
      {children}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={commandActions}
        experience={getExperienceCopy(language)}
      />
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

function useStudioBackgroundPreview(siteDraft, setPreviewBackground) {
  useEffect(() => {
    if (!setPreviewBackground) {
      return undefined;
    }

    setPreviewBackground({
      backgroundPreset: normalizeBackgroundPreset(siteDraft?.meta?.backgroundPreset || "none"),
      backgroundImage: siteDraft?.meta?.backgroundImage || "",
    });

    return () => setPreviewBackground(null);
  }, [setPreviewBackground, siteDraft?.meta?.backgroundImage, siteDraft?.meta?.backgroundPreset]);
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

// 读取最近轨迹：站内控制中心会复用这组读取/写入逻辑。
function getStoredTrail(storageKey) {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "[]");
  } catch {
    return [];
  }
}

function pushStoredTrail(storageKey, entry, limit = 8) {
  const current = getStoredTrail(storageKey).filter((item) => item.path !== entry.path);
  const next = [entry, ...current].slice(0, limit);
  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

function getRecentAccesses() {
  return getStoredTrail(RECENT_ACCESS_STORAGE_KEY);
}

function getRecentReadings() {
  return getStoredTrail(RECENT_READING_STORAGE_KEY);
}

function getRecentEdits() {
  return getStoredTrail(RECENT_EDITING_STORAGE_KEY);
}

function pushRecentAccess(entry) {
  // 去重后只保留最近几条浏览记录，方便命令面板作为站内中枢使用。
  const current = getRecentAccesses().filter((item) => item.path !== entry.path);
  const next = [entry, ...current].slice(0, 8);
  window.localStorage.setItem(RECENT_ACCESS_STORAGE_KEY, JSON.stringify(next));
}

function pushRecentReading(entry) {
  pushStoredTrail(RECENT_READING_STORAGE_KEY, entry, 10);
}

function pushRecentEdit(entry) {
  pushStoredTrail(RECENT_EDITING_STORAGE_KEY, entry, 10);
}

function normalizeHomeLayout(value) {
  return HOME_LAYOUT_OPTIONS.some((item) => item.code === value) ? value : "magazine";
}

function getTimelineDate(item) {
  return parseArticleDate(item.updatedAt || item.date || new Date().toISOString());
}

function buildArchiveGroups(articles, projects) {
  // 把文章和项目按时间合并，生成统一的档案时间线数据。
  const entries = [
    ...articles.map((article) => ({
      id: `article-${article.slug}`,
      type: "article",
      slug: article.slug,
      title: article.title,
      summary: article.excerpt,
      tag: article.tag,
      date: getTimelineDate(article),
    })),
    ...projects.map((project) => ({
      id: `project-${project.slug}`,
      type: "project",
      slug: project.slug,
      title: ensureLocalizedMap(project.title, project.title),
      summary: project.summary,
      tag: project.category,
      date: getTimelineDate(project),
    })),
  ].sort((left, right) => right.date.getTime() - left.date.getTime());

  return entries.reduce((groups, entry) => {
    const year = String(entry.date.getFullYear());
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(entry);
    return groups;
  }, {});
}

// 把时间档案整理成扁平条目，方便筛选、搜索和跳转。
function buildArchiveEntries(articles, projects) {
  return Object.entries(buildArchiveGroups(articles, projects)).flatMap(([year, items]) =>
    items.map((item) => ({
      ...item,
      year,
      tagLabel: item.tag?.zh || item.tag?.en || item.tag || "",
      titleLabel: item.title?.zh || item.title?.en || item.title || "",
      summaryLabel: item.summary?.zh || item.summary?.en || "",
    }))
  );
}

function moveArrayItem(list, fromIndex, toIndex) {
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function buildHomeCardItems({ language, projects, articles, customCards, text, copy, overrides }) {
  const applyOverride = (item) => {
    const override = overrides?.[item.id];
    if (!override) {
      return item;
    }
    return {
      ...item,
      title: override.title || item.title,
      body: override.body || item.body,
      href: override.href || item.href,
      action: override.action || item.action,
    };
  };

      const projectItems = projects.slice(0, 4).map((project) => ({
        id: `project-${project.slug}`,
        type: "project",
        eyebrow: project.category[language] || project.category.en,
        title: project.title,
        body: project.summary[language] || project.summary.en,
        href: `/projects/${project.slug}`,
        action: text.heroSecondary,
        coverImage: project.coverImage || "",
      }));

  const articleItems = articles.slice(0, 4).map((article) => ({
    id: `article-${article.slug}`,
    type: "article",
    eyebrow: article.tag,
    title: article.title[language] || article.title.en,
    body: article.excerpt[language] || article.excerpt.en,
    href: `/articles/${article.slug}`,
    action: copy.openArticle,
    coverImage: article.coverImage || "",
  }));

  const customItems = (customCards || []).map((card) => ({
    id: `custom-${card.id}`,
    type: "custom",
    eyebrow: card.eyebrow[language] || card.eyebrow.en,
    title: card.title[language] || card.title.en,
    body: card.body[language] || card.body.en,
    href: card.linkUrl,
    action: card.linkLabel[language] || card.linkLabel.en || "Open",
    external: Boolean(card.linkUrl),
    coverImage: card.coverImage || "",
  }));

  return [...projectItems, ...articleItems, ...customItems].map(applyOverride);
}

function HomeArchiveFlow({ language, entries, experience }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryType = params.get("archiveType");
      if (queryType === "all" || queryType === "article" || queryType === "project") {
        return queryType;
      }
      const stored = JSON.parse(window.localStorage.getItem(HOME_ARCHIVE_STATE_STORAGE_KEY) || "{}");
      return stored.activeType || "all";
    } catch {
      return "all";
    }
  });
  const [collapsedYears, setCollapsedYears] = useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(HOME_ARCHIVE_STATE_STORAGE_KEY) || "{}");
      return stored.collapsedYears || [];
    } catch {
      return [];
    }
  });
  const [activeYear, setActiveYear] = useState("");
  const yearSectionRefs = useRef({});

  const typeOptions = [
    { code: "all", label: experience.timelineAll || "All" },
    { code: "article", label: experience.timelineArticles },
    { code: "project", label: experience.timelineProjects },
  ];

  const filteredEntries = useMemo(() => {
    if (activeType === "all") {
      return entries;
    }
    return entries.filter((item) => item.type === activeType);
  }, [activeType, entries]);

  const groups = useMemo(
    () =>
      filteredEntries.reduce((acc, item) => {
        if (!acc[item.year]) {
          acc[item.year] = [];
        }
        acc[item.year].push(item);
        return acc;
      }, {}),
    [filteredEntries]
  );

  useEffect(() => {
    window.localStorage.setItem(
      HOME_ARCHIVE_STATE_STORAGE_KEY,
      JSON.stringify({ activeType, collapsedYears })
    );
  }, [activeType, collapsedYears]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const currentType = params.get("archiveType");
    const currentYear = params.get("archiveYear");
    let changed = false;
    if (activeType !== "all") {
      if (currentType !== activeType) {
        params.set("archiveType", activeType);
        changed = true;
      }
    } else if (currentType) {
      params.delete("archiveType");
      changed = true;
    }
    if (activeYear) {
      if (currentYear !== activeYear) {
        params.set("archiveYear", activeYear);
        changed = true;
      }
    } else if (currentYear) {
      params.delete("archiveYear");
      changed = true;
    }
    if (changed) {
      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : "",
          hash: location.hash,
        },
        { replace: true }
      );
    }
  }, [activeType, activeYear, location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const years = Object.keys(groups);
    if (!years.length) {
      setActiveYear("");
      return undefined;
    }
    setActiveYear((current) => (years.includes(current) ? current : years[0]));
    const observer = new IntersectionObserver(
      (entriesList) => {
        const visible = entriesList
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);
        if (visible[0]?.target?.dataset?.year) {
          setActiveYear(visible[0].target.dataset.year);
        }
      },
      {
        rootMargin: "-18% 0px -52% 0px",
        threshold: [0.2, 0.45, 0.7],
      }
    );
    years.forEach((year) => {
      const node = yearSectionRefs.current[year];
      if (node) {
        observer.observe(node);
      }
    });
    return () => observer.disconnect();
  }, [groups]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryYear = params.get("archiveYear");
    if (!queryYear) {
      return;
    }
    const node = yearSectionRefs.current[queryYear];
    if (!node) {
      return;
    }
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [groups, location.search]);

  const toggleYear = (year) => {
    setCollapsedYears((current) =>
      current.includes(year) ? current.filter((item) => item !== year) : [...current, year]
    );
  };

  const jumpToYear = (event, year) => {
    event.preventDefault();
    const node = yearSectionRefs.current[year];
    if (!node) {
      return;
    }
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="section home-archive-flow">
      <aside className="home-archive-flow__rail glass-card">
        <p className="micro-label">{experience.archiveTitle}</p>
        <div className="home-archive-flow__filters">
          {typeOptions.map((option) => (
            <button
              key={option.code}
              type="button"
              className={`home-archive-flow__filter ${activeType === option.code ? "active" : ""}`}
              onClick={() => setActiveType(option.code)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="home-archive-flow__map">
          <span className="micro-label">{experience.timelineMap || "Year map"}</span>
          <div className="home-archive-flow__map-track">
            {Object.keys(groups).map((year) => (
              <button
                key={`map-${year}`}
                type="button"
                className={`home-archive-flow__map-dot ${activeYear === year ? "active" : ""}`}
                onClick={(event) => jumpToYear(event, year)}
                aria-label={`Jump to ${year}`}
              />
            ))}
          </div>
        </div>
        <div className="home-archive-flow__years">
          {Object.keys(groups).map((year) => (
            <a
              key={year}
              href={`#home-archive-${year}`}
              className={`home-archive-flow__year ${activeYear === year ? "active" : ""}`}
              onClick={(event) => jumpToYear(event, year)}
            >
              {year}
            </a>
          ))}
        </div>
      </aside>
      <div className="home-archive-flow__stream">
        {Object.entries(groups).map(([year, items], yearIndex) => {
          const collapsed = collapsedYears.includes(year);
          return (
            <Reveal key={year} delay={yearIndex * 70}>
              <article
                id={`home-archive-${year}`}
                ref={(node) => {
                  yearSectionRefs.current[year] = node;
                }}
                data-year={year}
                className={`home-archive-flow__year-group glass-card ${collapsed ? "collapsed" : ""}`}
              >
                <div className="home-archive-flow__year-head">
                  <div>
                    <strong>{year}</strong>
                    <span>{items.length} entries</span>
                  </div>
                  <button
                    type="button"
                    className="home-archive-flow__collapse"
                    onClick={() => toggleYear(year)}
                  >
                    {collapsed ? (experience.expandLabel || "Expand") : (experience.collapseLabel || "Collapse")}
                  </button>
                </div>
                <div className="home-archive-flow__list" hidden={collapsed}>
                  {items.map((item) => (
                    <div key={item.id} className="home-archive-flow__item">
                      <span className="micro-label">{item.type === "article" ? experience.timelineArticles : experience.timelineProjects}</span>
                      <div>
                        {item.type === "article" ? (
                          <Link to={`/articles/${item.slug}`}>{item.title[language] || item.title.en}</Link>
                        ) : (
                          <Link to={`/projects/${item.slug}`}>{item.title[language] || item.title.en}</Link>
                        )}
                        <p className="body-copy">{item.summary[language] || item.summary.en}</p>
                      </div>
                      <time>{formatArticleDate(item.date)}</time>
                    </div>
                  ))}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function HomeCardBoard({ items, onSaveCardOverride, canEditContent }) {
  const [orderedItems, setOrderedItems] = useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(HOME_CARD_ORDER_STORAGE_KEY) || "[]");
      if (!stored.length) {
        return items;
      }
      const map = new Map(items.map((item) => [item.id, item]));
      const ordered = stored.map((id) => map.get(id)).filter(Boolean);
      const missing = items.filter((item) => !stored.includes(item.id));
      return [...ordered, ...missing];
    } catch {
      return items;
    }
  });
  const [cardMeta, setCardMeta] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(HOME_CARD_META_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [draggingId, setDraggingId] = useState(null);
  const [resizingId, setResizingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const hiddenIds = cardMeta.hiddenIds || [];
  const lockedIds = cardMeta.lockedIds || [];
  const sizeMap = cardMeta.sizeMap || {};
  const pinnedIds = cardMeta.pinnedIds || [];
  const editMap = cardMeta.editMap || {};
  const sizeOrder = ["normal", "wide", "tall"];

  useEffect(() => {
    setOrderedItems((current) => {
      const currentIds = current.map((item) => item.id);
      const next = items.filter((item) => currentIds.includes(item.id));
      const missing = items.filter((item) => !currentIds.includes(item.id));
      return [...next, ...missing];
    });
  }, [items]);

  useEffect(() => {
    window.localStorage.setItem(
      HOME_CARD_ORDER_STORAGE_KEY,
      JSON.stringify(orderedItems.map((item) => item.id))
    );
  }, [orderedItems]);

  useEffect(() => {
    const validIds = new Set(items.map((item) => item.id));
    setCardMeta((current) => ({
      hiddenIds: (current.hiddenIds || []).filter((id) => validIds.has(id)),
      lockedIds: (current.lockedIds || []).filter((id) => validIds.has(id)),
      pinnedIds: (current.pinnedIds || []).filter((id) => validIds.has(id)),
      editMap: Object.fromEntries(
        Object.entries(current.editMap || {}).filter(([id]) => validIds.has(id))
      ),
      sizeMap: Object.fromEntries(
        Object.entries(current.sizeMap || {}).filter(([id]) => validIds.has(id))
      ),
    }));
  }, [items]);

  useEffect(() => {
    window.localStorage.setItem(HOME_CARD_META_STORAGE_KEY, JSON.stringify(cardMeta));
  }, [cardMeta]);

  const visibleItems = orderedItems
    .filter((item) => !hiddenIds.includes(item.id))
    .sort((left, right) => {
      const leftPinned = pinnedIds.includes(left.id) ? 1 : 0;
      const rightPinned = pinnedIds.includes(right.id) ? 1 : 0;
      if (leftPinned !== rightPinned) {
        return rightPinned - leftPinned;
      }
      return 0;
    });
  const hiddenItems = orderedItems.filter((item) => hiddenIds.includes(item.id));

  const handleDrop = (targetId) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const fromIndex = orderedItems.findIndex((item) => item.id === draggingId);
    const toIndex = orderedItems.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      return;
    }
    setOrderedItems((current) => moveArrayItem(current, fromIndex, toIndex));
    setDraggingId(null);
  };

  const toggleCardFlag = (field, id) => {
    setCardMeta((current) => {
      const list = current[field] || [];
      return {
        ...current,
        [field]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id],
      };
    });
  };

  const cycleCardSize = (id) => {
    setCardMeta((current) => {
      const currentSize = (current.sizeMap || {})[id] || "normal";
      const nextSize = sizeOrder[(sizeOrder.indexOf(currentSize) + 1) % sizeOrder.length];
      return {
        ...current,
        sizeMap: {
          ...(current.sizeMap || {}),
          [id]: nextSize,
        },
      };
    });
  };

  const updateCardEdit = (id, field, value) => {
    setCardMeta((current) => ({
      ...current,
      editMap: {
        ...(current.editMap || {}),
        [id]: {
          ...(current.editMap || {})[id],
          [field]: value,
        },
      },
    }));
  };

  const clearCardEdit = (id) => {
    setCardMeta((current) => {
      const nextMap = { ...(current.editMap || {}) };
      delete nextMap[id];
      return {
        ...current,
        editMap: nextMap,
      };
    });
    setEditingId(null);
  };

  const saveCardEdit = async (item) => {
    const edit = editMap[item.id] || {};
    const nextPatch = {
      title: edit.title || item.title,
      body: edit.body || item.body,
      href: edit.href || item.href,
      action: edit.action || item.action,
      coverImage: edit.coverImage || item.coverImage || "",
    };
    if (onSaveCardOverride) {
      await onSaveCardOverride(item.id, nextPatch);
    }
    setEditingId(null);
  };

  const handleCoverUpload = async (itemId, event) => {
    const [file] = Array.from(event.target.files ?? []);
    if (!file) {
      return;
    }
    const [attachment] = await Promise.all([fileToAttachment(file)]);
    updateCardEdit(itemId, "coverImage", attachment.dataUrl);
    event.target.value = "";
  };

  const handleResizeStart = (event, id, currentSize) => {
    event.preventDefault();
    event.stopPropagation();
    setResizingId(id);
    const startX = event.clientX;
    const startY = event.clientY;
    const sizeRank = {
      normal: { width: 1, height: 1 },
      wide: { width: 2, height: 1 },
      tall: { width: 1, height: 2 },
      hero: { width: 2, height: 2 },
    };
    const currentRank = sizeRank[currentSize] || sizeRank.normal;
    const onMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const nextWidth = deltaX > 80 ? 2 : 1;
      const nextHeight = deltaY > 80 ? 2 : 1;
      const nextSize =
        nextWidth === 2 && nextHeight === 2
          ? "hero"
          : nextWidth === 2
            ? "wide"
            : nextHeight === 2
              ? "tall"
              : "normal";
      if (nextSize !== currentSize) {
        setCardMeta((current) => ({
          ...current,
          sizeMap: {
            ...(current.sizeMap || {}),
            [id]: nextSize,
          },
        }));
      } else if (currentRank.width === nextWidth && currentRank.height === nextHeight) {
        setCardMeta((current) => ({
          ...current,
          sizeMap: {
            ...(current.sizeMap || {}),
            [id]: currentSize,
          },
        }));
      }
    };
    const onUp = () => {
      setResizingId(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <section className="section home-card-board">
      {visibleItems.map((item, index) => {
        const isLocked = lockedIds.includes(item.id);
        const size = sizeMap[item.id] || "normal";
        const isPinned = pinnedIds.includes(item.id);
        const edit = editMap[item.id] || {};
        const title = edit.title || item.title;
        const body = edit.body || item.body;
        const href = edit.href || item.href;
        const action = edit.action || item.action;
        const coverImage = edit.coverImage || item.coverImage || "";
        const isEditing = editingId === item.id;
        return (
          <Reveal key={item.id} delay={index * 40}>
            <article
              className={`home-card-board__item home-card-board__item--${size} glass-card ${draggingId === item.id ? "dragging" : ""} ${isLocked ? "locked" : ""} ${isPinned ? "pinned" : ""} ${resizingId === item.id ? "resizing" : ""}`}
              draggable={!isLocked}
              onDragStart={() => !isLocked && setDraggingId(item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(item.id)}
              onDragEnd={() => setDraggingId(null)}
            >
              <div className="home-card-board__toolbar">
                <span className="micro-label">{item.eyebrow}</span>
                <div className="home-card-board__actions">
                  {canEditContent ? (
                    <button type="button" onClick={() => setEditingId((current) => (current === item.id ? null : item.id))}>
                      {isEditing ? "收起编辑" : "快捷编辑"}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => cycleCardSize(item.id)}>
                    {size === "wide" ? "宽" : size === "tall" ? "高" : size === "hero" ? "超大" : "标准"}
                  </button>
                  <button type="button" onClick={() => toggleCardFlag("pinnedIds", item.id)}>
                    {isPinned ? "取消置顶" : "置顶"}
                  </button>
                  <button type="button" onClick={() => toggleCardFlag("lockedIds", item.id)}>
                    {isLocked ? "解锁" : "锁定"}
                  </button>
                  <button type="button" onClick={() => toggleCardFlag("hiddenIds", item.id)}>
                    删除
                  </button>
                </div>
              </div>
              {isEditing && canEditContent ? (
                <div className="home-card-board__editor">
                  <input value={title} onChange={(event) => updateCardEdit(item.id, "title", event.target.value)} placeholder="标题" />
                  <textarea value={body} onChange={(event) => updateCardEdit(item.id, "body", event.target.value)} placeholder="摘要" rows={3} />
                  <input value={href} onChange={(event) => updateCardEdit(item.id, "href", event.target.value)} placeholder="链接" />
                  <input value={action} onChange={(event) => updateCardEdit(item.id, "action", event.target.value)} placeholder="按钮文案" />
                  <div className="home-card-board__editor-cover">
                    <label className="home-card-board__cover-upload">
                      <span>上传封面</span>
                      <input type="file" accept="image/*" onChange={(event) => handleCoverUpload(item.id, event)} />
                    </label>
                    {coverImage ? (
                      <>
                        <img src={coverImage} alt={`${title} cover`} className="home-card-board__cover-preview" />
                        <button type="button" onClick={() => updateCardEdit(item.id, "coverImage", "")}>移除封面</button>
                      </>
                    ) : null}
                  </div>
                  <div className="home-card-board__editor-actions">
                    <button type="button" onClick={() => saveCardEdit(item)}>完成并同步</button>
                    <button type="button" onClick={() => clearCardEdit(item.id)}>恢复默认</button>
                  </div>
                </div>
              ) : null}
              {coverImage ? <img src={coverImage} alt={`${title} cover`} className="home-card-board__cover" /> : null}
              <h3>{title}</h3>
              <p className="body-copy">{body}</p>
              {item.external ? (
                <a className="inline-link" href={href} target="_blank" rel="noreferrer">
                  {action}
                </a>
              ) : (
                <Link className="inline-link" to={href}>
                  {action}
                </Link>
              )}
              <button
                type="button"
                className="home-card-board__resize-handle"
                onPointerDown={(event) => handleResizeStart(event, item.id, size)}
                aria-label="调整卡片尺寸"
              />
            </article>
          </Reveal>
        );
      })}
      {hiddenItems.length ? (
        <div className="home-card-board__hidden glass-card">
          <div className="home-card-board__hidden-head">
            <span className="micro-label">隐藏卡片</span>
            <strong>{hiddenItems.length}</strong>
          </div>
          <div className="home-card-board__hidden-list">
            {hiddenItems.map((item) => (
              <button key={item.id} type="button" onClick={() => toggleCardFlag("hiddenIds", item.id)}>
                恢复 {item.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// 读取单篇文章的阅读室状态，供文章页和开发者编辑之间同步批注。
function getReadingRoomSnapshot(slug) {
  if (!slug) {
    return { highlights: {}, favorites: {}, notes: {}, scrollY: 0 };
  }
  try {
    const stored = JSON.parse(window.localStorage.getItem(`template-reading-room:${slug}`) || "{}");
    return {
      highlights: stored.highlights || {},
      favorites: stored.favorites || {},
      notes: stored.notes || {},
      scrollY: Number(stored.scrollY) || 0,
    };
  } catch {
    return { highlights: {}, favorites: {}, notes: {}, scrollY: 0 };
  }
}

function resolvePinnedSpaces(spaces, articles, projects, language) {
  return spaces
    .map((space) => {
      if (space.kind === "article") {
        const article = articles.find((item) => item.slug === space.articleSlug);
        if (!article) {
          return null;
        }
        return {
          id: space.id,
          kind: space.kind,
          title: space.title[language] || space.title.en || article.title[language] || article.title.en,
          body: space.body[language] || space.body.en || article.excerpt[language] || article.excerpt.en,
          meta: article.tag,
          href: `/articles/${article.slug}`,
        };
      }

      if (space.kind === "project") {
        const project = projects.find((item) => item.slug === space.projectSlug);
        if (!project) {
          return null;
        }
        return {
          id: space.id,
          kind: space.kind,
          title: space.title[language] || space.title.en || project.title,
          body: space.body[language] || space.body.en || project.summary[language] || project.summary.en,
          meta: project.category[language] || project.category.en,
          href: `/projects/${project.slug}`,
        };
      }

      if (space.kind === "audio") {
        return {
          id: space.id,
          kind: space.kind,
          title: space.audioTitle[language] || space.audioTitle.en || "Audio Space",
          body: space.audioArtist[language] || space.audioArtist.en || space.audioSrc,
          meta: "Audio",
          href: space.audioSrc,
          external: true,
        };
      }

      return {
        id: space.id,
        kind: "link",
        title: space.title[language] || space.title.en || "Link Space",
        body: space.body[language] || space.body.en || space.url,
        meta: "Link",
        href: space.url,
        external: true,
      };
    })
    .filter(Boolean);
}

function PinnedSpacesSection({ language, spaces, articles, projects, isXFlow }) {
  const experience = getExperienceCopy(language);
  const resolved = useMemo(() => resolvePinnedSpaces(spaces, articles, projects, language), [spaces, articles, projects, language]);

  if (!resolved.length) {
    return null;
  }

  return (
    <section className={`section pinned-spaces-section ${isXFlow ? "pinned-spaces-section--xflow" : ""}`}>
      <div className="section-head">
        <div>
          <p className="micro-label">{experience.pinnedTitle}</p>
          <h2>{experience.pinnedTitle}</h2>
        </div>
        <p className="body-copy">{experience.pinnedBody}</p>
      </div>
      <div className="pinned-spaces-grid">
        {resolved.map((space, index) => (
          <Reveal key={space.id} delay={index * 80}>
            <article className="pinned-space-card glass-card">
              <span className="micro-label">{space.meta}</span>
              <h3>{space.title}</h3>
              <p className="body-copy">{space.body}</p>
              {space.external ? (
                <a className="inline-link" href={space.href} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : (
                <Link className="inline-link" to={space.href}>
                  Open
                </Link>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ArchivePage({ language, articles, projects, meta }) {
  const experience = getExperienceCopy(language);
  const siteAvatar = getSiteAvatar(meta, templateAvatar);
  const entries = useMemo(() => buildArchiveEntries(articles, projects), [articles, projects]);
  const [yearFilter, setYearFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [query, setQuery] = useState("");
  const years = useMemo(() => ["all", ...Array.from(new Set(entries.map((item) => item.year)))], [entries]);
  const tags = useMemo(
    () => ["all", ...Array.from(new Set(entries.map((item) => item.tag[language] || item.tag.en || item.tag).filter(Boolean)))],
    [entries, language]
  );
  const filteredEntries = useMemo(() => {
    // 档案页支持年份、标签与关键词三重过滤，避免内容增多后难以定位。
    const lowered = query.trim().toLowerCase();
    return entries.filter((item) => {
      const itemYear = item.year;
      const itemTag = item.tag[language] || item.tag.en || item.tag;
      const matchesYear = yearFilter === "all" || itemYear === yearFilter;
      const matchesTag = tagFilter === "all" || itemTag === tagFilter;
      const matchesQuery =
        !lowered ||
        [item.title[language] || item.title.en, item.summary[language] || item.summary.en, itemTag]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(lowered);
      return matchesYear && matchesTag && matchesQuery;
    });
  }, [entries, language, query, tagFilter, yearFilter]);
  const groups = useMemo(
    () =>
      filteredEntries.reduce((acc, item) => {
        if (!acc[item.year]) {
          acc[item.year] = [];
        }
        acc[item.year].push(item);
        return acc;
      }, {}),
    [filteredEntries]
  );

  useSeo({
    title: `${experience.archiveTitle} / ${getBrowserTitle(meta, language)}`,
    description: experience.archiveBody,
    image: siteAvatar,
  });

  return (
    <main className="page archive-page">
      <section className="page-banner glass-card">
        <p className="micro-label">{experience.archiveTitle}</p>
        <h1>{experience.archiveTitle}</h1>
        <p className="body-copy">{experience.archiveBody}</p>
      </section>
      <section className="archive-page__timeline">
        <article className="glass-card archive-filter-card">
          <div className="archive-filter-card__head">
            <p className="micro-label">{experience.archiveFilter}</p>
            <input
              className="command-palette__input archive-filter-card__search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={experience.archiveSearch}
            />
          </div>
          <div className="archive-filter-card__row">
            <div className="tag-row">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  className={`tag-chip tag-chip--button ${yearFilter === year ? "active" : ""}`}
                  onClick={() => setYearFilter(year)}
                >
                  {year === "all" ? experience.archiveAllYears : year}
                </button>
              ))}
            </div>
            <div className="tag-row">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip tag-chip--button ${tagFilter === tag ? "active" : ""}`}
                  onClick={() => setTagFilter(tag)}
                >
                  {tag === "all" ? experience.archiveAllTags : tag}
                </button>
              ))}
            </div>
          </div>
          <div className="archive-filter-card__jump">
            {Object.keys(groups).map((year) => (
              <a key={year} className="tag-chip" href={`#archive-year-${year}`}>
                {year}
              </a>
            ))}
          </div>
        </article>
        {Object.entries(groups).map(([year, items], yearIndex) => (
          <Reveal key={year} delay={yearIndex * 60}>
            <article id={`archive-year-${year}`} className="archive-timeline-year glass-card">
              <div className="archive-timeline-year__head">
                <strong>{year}</strong>
                <span>{items.length} entries</span>
              </div>
              <div className="archive-timeline-year__list">
                {items.map((item) => (
                  <div key={item.id} className="archive-timeline-item">
                    <span className="micro-label">
                      {item.type === "article" ? experience.timelineArticles : experience.timelineProjects}
                    </span>
                    <div>
                      {item.type === "article" ? (
                        <Link to={`/articles/${item.slug}`}>{item.title[language] || item.title.en}</Link>
                      ) : (
                        <Link to={`/projects/${item.slug}`}>{item.title[language] || item.title.en}</Link>
                      )}
                      <p className="body-copy">{item.summary[language] || item.summary.en}</p>
                    </div>
                    <time>{formatArticleDate(item.date)}</time>
                  </div>
                ))}
              </div>
            </article>
          </Reveal>
        ))}
        {!filteredEntries.length ? <div className="glass-card empty-state">{experience.commandEmpty}</div> : null}
      </section>
    </main>
  );
}

function HomePage({ language, text, copy, articles, meta, projects, guestbookEntries, addGuestbookEntry, isXFlow, onSaveCardOverride, canEditCardContent }) {
  const [guestbookForm, setGuestbookForm] = useState({ name: "", message: "" });
  const [homeLayout, setHomeLayout] = useState(() => {
    if (typeof window === "undefined") {
      return normalizeHomeLayout(meta.homeLayout || "magazine");
    }
    return normalizeHomeLayout(window.localStorage.getItem(HOME_LAYOUT_STORAGE_KEY) || meta.homeLayout || "magazine");
  });
  const siteAvatar = getSiteAvatar(meta, templateAvatar);
  const pinnedSpaces = meta.pinnedSpaces || [];
  const archiveGroups = useMemo(() => buildArchiveGroups(articles, projects), [articles, projects]);
  const archiveEntries = useMemo(() => buildArchiveEntries(articles, projects), [articles, projects]);
  useSeo({
    title: getBrowserTitle(meta, language),
    description: text.heroBody,
    image: siteAvatar,
  });

  const topArticles = useMemo(() => {
    const pinned = articles.filter((article) => article.pinned);
    const rest = articles.filter((article) => !article.pinned);
    return [...pinned, ...rest].slice(0, 3);
  }, [articles]);
  const homeCardItems = useMemo(
    () =>
      buildHomeCardItems({
        language,
        projects,
        articles: topArticles,
        customCards: meta.customCards || [],
        text,
        copy,
        overrides: meta.homeCardOverrides || {},
      }),
    [articles, copy, language, meta.customCards, meta.homeCardOverrides, projects, text, topArticles]
  );

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

  // 统一处理首页布局切换，保证点击按钮后本页、命令面板和本地缓存同步。
  const applyHomeLayout = (nextLayout) => {
    const normalized = normalizeHomeLayout(nextLayout);
    setHomeLayout(normalized);
    window.localStorage.setItem(HOME_LAYOUT_STORAGE_KEY, normalized);
    window.dispatchEvent(new CustomEvent("template:home-layout", { detail: normalized }));
  };

  useEffect(() => {
    setHomeLayout((current) => normalizeHomeLayout(current || meta.homeLayout || "magazine"));
  }, [meta.homeLayout]);

  useEffect(() => {
    window.localStorage.setItem(HOME_LAYOUT_STORAGE_KEY, homeLayout);
  }, [homeLayout]);

  useEffect(() => {
    const handleLayoutEvent = (event) => {
      setHomeLayout(normalizeHomeLayout(event.detail));
    };
    window.addEventListener("template:home-layout", handleLayoutEvent);
    return () => window.removeEventListener("template:home-layout", handleLayoutEvent);
  }, []);

  if (isXFlow) {
    const leadProject = projects[0];
    const sideProjects = projects.slice(1, 3);
    const featureArticle = topArticles[0];
    const sideArticles = topArticles.slice(1);

    return (
      <main className={`page home-page xflow-home home-layout--${homeLayout}`}>
        <HomeLayoutSwitcher
          experience={getExperienceCopy(language)}
          layout={homeLayout}
          setLayout={applyHomeLayout}
          options={HOME_LAYOUT_OPTIONS}
        />
        <section className="xflow-hero glass-card">
          <div className="xflow-hero__copy">
            <p className="micro-label">{text.heroEyebrow}</p>
            <h1>{text.heroTitle}</h1>
            <p className="body-copy">{text.heroBody}</p>
            <div className="hero-actions">
              <Link className="action-button action-button--primary" to="/articles">
                {text.heroPrimary}
              </Link>
              <Link className="action-button action-button--secondary" to={`/projects/${leadProject?.slug ?? ""}`}>
                {text.heroSecondary}
              </Link>
            </div>
          </div>
          <div className="xflow-hero__profile">
            <div className="xflow-profile-card">
              <div className="intro-avatar">
                <img src={siteAvatar} alt={`${meta.name} avatar`} />
              </div>
              <div className="intro-copy">
                <p className="micro-label">{meta.location}</p>
                <h2>{meta.name}</h2>
                <p className="body-copy">{meta.intro[language]}</p>
                <div className="intro-meta">
                  <span>{meta.role[language]}</span>
                  <span>{meta.email}</span>
                </div>
              </div>
            </div>
            <div className="xflow-stat-strip">
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
            </div>
          </div>
        </section>

        <PinnedSpacesSection language={language} spaces={pinnedSpaces} articles={articles} projects={projects} isXFlow />

        {homeLayout === "archive" ? (
          <HomeArchiveFlow language={language} entries={archiveEntries} experience={getExperienceCopy(language)} />
        ) : null}

        {homeLayout === "cards" ? <HomeCardBoard items={homeCardItems} onSaveCardOverride={onSaveCardOverride} canEditContent={canEditCardContent} /> : null}

        {homeLayout === "magazine" ? <section className="xflow-shelf">
          <Reveal className="xflow-lead-card glass-card">
            <p className="micro-label">{text.featuredTitle}</p>
            <h2>{leadProject?.title}</h2>
            <p className="body-copy">{leadProject?.summary[language]}</p>
            <div className="tag-row">
              {leadProject?.metrics?.map((metric) => (
                <span className="tag-chip" key={metric}>
                  {metric}
                </span>
              ))}
            </div>
            <Link className="inline-link" to={`/projects/${leadProject?.slug ?? ""}`}>
              {text.heroSecondary}
            </Link>
          </Reveal>
          <div className="xflow-side-stack">
            {sideProjects.map((project, index) => (
              <Reveal key={project.slug} delay={index * 80} className="xflow-mini-card glass-card">
                <p className="micro-label">{project.category[language]}</p>
                <h3>{project.title}</h3>
                <p className="body-copy">{project.summary[language]}</p>
              </Reveal>
            ))}
          </div>
        </section> : null}

        {homeLayout === "magazine" ? <section className="xflow-story-grid">
          <Reveal className="xflow-story-main glass-card">
            <p className="micro-label">{text.articlesTitle}</p>
            {featureArticle?.coverImage ? <img className="article-card__cover" src={featureArticle.coverImage} alt={featureArticle.title[language]} /> : null}
            <h2>{featureArticle?.title[language]}</h2>
            <p className="body-copy">{featureArticle?.excerpt[language]}</p>
            {featureArticle ? <ArticleMeta article={featureArticle} copy={copy} language={language} /> : null}
            <Link className="inline-link" to={`/articles/${featureArticle?.slug ?? ""}`}>
              {copy.openArticle}
            </Link>
          </Reveal>
          <div className="xflow-story-side">
            {sideArticles.map((article, index) => (
              <Reveal key={article.slug} delay={index * 70} className="xflow-story-item glass-card">
                <p className="micro-label">{article.tag}</p>
                <h3>{article.title[language]}</h3>
                <p className="body-copy">{article.excerpt[language]}</p>
                <Link className="inline-link" to={`/articles/${article.slug}`}>
                  {copy.openArticle}
                </Link>
              </Reveal>
            ))}
          </div>
        </section> : null}

        {homeLayout === "magazine" ? <section className="xflow-bottom-grid">
          <Reveal className="about-panel glass-card">
            <p className="micro-label">{text.aboutTitle}</p>
            <h2>{text.aboutTitle}</h2>
            <p className="body-copy">{text.aboutBody}</p>
            <div className="tag-row">
              {meta.socialLinks.map((item) => (
                <a key={item.label} className="social-pill" href={item.url} target="_blank" rel="noreferrer">
                  <SocialIcon type={item.iconDataUrl ? item : item.icon} />
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </Reveal>

          <Reveal className="stats-panel glass-card guestbook-list" delay={120}>
            <p className="micro-label">{copy.guestbookTitle}</p>
            {guestbookEntries.length ? guestbookEntries.slice(0, 4).map((entry) => (
              <article key={entry.id} className="guestbook-entry">
                <strong>{entry.name}</strong>
                <p className="body-copy">{entry.message}</p>
                <span>{formatRelativeTime(entry.createdAt, language)}</span>
              </article>
            )) : <p className="body-copy">{copy.guestbookEmpty}</p>}
          </Reveal>
        </section> : null}

        <ArchivePreview language={language} groups={archiveGroups} experience={getExperienceCopy(language)} />
      </main>
    );
  }

  return (
    <main className={`page home-page home-layout--${homeLayout}`}>
      <HomeLayoutSwitcher
        experience={getExperienceCopy(language)}
        layout={homeLayout}
        setLayout={applyHomeLayout}
        options={HOME_LAYOUT_OPTIONS}
      />
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

      <PinnedSpacesSection language={language} spaces={pinnedSpaces} articles={articles} projects={projects} isXFlow={false} />

      {homeLayout === "archive" ? (
        <HomeArchiveFlow language={language} entries={archiveEntries} experience={getExperienceCopy(language)} />
      ) : null}

      {homeLayout === "cards" ? <HomeCardBoard items={homeCardItems} onSaveCardOverride={onSaveCardOverride} canEditContent={canEditCardContent} /> : null}

      {homeLayout === "magazine" && meta.customCards?.length ? (
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

      {homeLayout === "magazine" ? <section className="section">
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
      </section> : null}

      {homeLayout === "magazine" ? <section className="section split-layout" id="about">
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
      </section> : null}

      {homeLayout === "magazine" ? <section className="section">
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
      </section> : null}

      {homeLayout === "magazine" ? <section className="section">
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
      </section> : null}

      <ArchivePreview language={language} groups={archiveGroups} experience={getExperienceCopy(language)} />

      {homeLayout === "magazine" ? <section className="section split-layout">
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
      </section> : null}
    </main>
  );
}

function ArticlesPage({ language, text, copy, articles, meta, isXFlow }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const siteAvatar = getSiteAvatar(meta, templateAvatar);
  useSeo({
    title: `${text.articleIndexTitle} / ${getBrowserTitle(meta, language)}`,
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

  if (isXFlow) {
    const leadArticle = filteredArticles[0];
    const sideArticles = filteredArticles.slice(1);

    return (
      <main className="page xflow-articles-page">
        <section className="page-banner glass-card xflow-page-banner">
          <div className="xflow-page-banner__copy">
            <p className="micro-label">{text.articleIndexEyebrow}</p>
            <h1>{text.articleIndexTitle}</h1>
            <p className="body-copy">{text.articleIndexBody}</p>
          </div>
          <section className="glass-card article-tools xflow-article-tools">
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
        </section>

        {leadArticle ? (
          <section className="xflow-articles-layout">
            <Reveal className="xflow-articles-lead glass-card">
              {leadArticle.coverImage ? <img className="page-banner__cover" src={leadArticle.coverImage} alt={leadArticle.title[language]} /> : null}
              <p className="micro-label">{leadArticle.tag}</p>
              <h2>{leadArticle.title[language]}</h2>
              <p className="body-copy">{leadArticle.excerpt[language]}</p>
              <ArticleMeta article={leadArticle} copy={copy} language={language} />
              <Link className="inline-link" to={`/articles/${leadArticle.slug}`}>
                {copy.openArticle}
              </Link>
            </Reveal>
            <div className="xflow-articles-stack">
              {sideArticles.length ? sideArticles.map((article, index) => (
                <Reveal key={article.slug} delay={index * 70} className="xflow-articles-item glass-card">
                  <p className="micro-label">{article.tag}</p>
                  <h3>{article.title[language]}</h3>
                  <p className="body-copy">{article.excerpt[language]}</p>
                  <ArticleMeta article={article} copy={copy} language={language} />
                  <Link className="inline-link" to={`/articles/${article.slug}`}>
                    {copy.openArticle}
                  </Link>
                </Reveal>
              )) : <div className="glass-card empty-state">{copy.noArticleResults}</div>}
            </div>
          </section>
        ) : (
          <div className="glass-card empty-state">{copy.noArticleResults}</div>
        )}
      </main>
    );
  }

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

function ArticleDetailPage({ language, copy, articles, meta, isXFlow }) {
  const { slug } = useParams();
  // 每篇文章都有独立阅读室状态，记录高亮、收藏、批注和阅读位置。
  const articleStorageKey = `template-reading-room:${slug || "article"}`;
  const article = useMemo(
    () => articles.find((item) => item.slug === slug) ?? articles[0],
    [articles, slug]
  );
  const progress = useReadingProgress();
  const [copied, setCopied] = useState(false);
  const [readingRoom, setReadingRoom] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  const [ambientTrack, setAmbientTrack] = useState(AMBIENT_TRACKS[0].code);
  const [speaking, setSpeaking] = useState(false);
  const [paragraphState, setParagraphState] = useState(() => ({
    highlights: {},
    favorites: {},
    notes: {},
    scrollY: 0,
  }));
  const [noteOpenId, setNoteOpenId] = useState(null);
  const ambientRef = useRef(null);
  const experience = getExperienceCopy(language);
  const siteAvatar = getSiteAvatar(meta, templateAvatar);
  const browserTitle = getBrowserTitle(meta, language);
  const seoTitle = article ? `${article.title[language]} / ${browserTitle}` : browserTitle;
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
  const footnotes = article.footnotes?.[language]?.length ? article.footnotes[language] : article.footnotes?.en || [];

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(articleStorageKey) || "{}");
      setParagraphState({
        highlights: stored.highlights || {},
        favorites: stored.favorites || {},
        notes: stored.notes || {},
        scrollY: Number(stored.scrollY) || 0,
      });
    } catch {
      setParagraphState({ highlights: {}, favorites: {}, notes: {}, scrollY: 0 });
    }
  }, [articleStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(articleStorageKey, JSON.stringify(paragraphState));
  }, [articleStorageKey, paragraphState]);

  useEffect(() => {
    let frameId = 0;
    const scheduleSave = () => {
      if (frameId) {
        return;
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        setParagraphState((current) => ({ ...current, scrollY: window.scrollY }));
      });
    };
    window.addEventListener("scroll", scheduleSave, { passive: true });
    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", scheduleSave);
    };
  }, []);

  useEffect(() => {
    if (!paragraphState.scrollY) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      window.scrollTo({ top: paragraphState.scrollY, behavior: "auto" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [paragraphState.scrollY, slug]);

  useEffect(() => {
    // 进入文章时写入最近阅读，供命令面板快速回到上次阅读位置。
    if (!article) {
      return;
    }
    pushRecentReading({
      id: article.slug,
      path: `/articles/${article.slug}`,
      label: article.title[language] || article.title.en,
      timestamp: Date.now(),
    });
  }, [article, language]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  useEffect(() => {
    const selectedTrack = AMBIENT_TRACKS.find((item) => item.code === ambientTrack) || AMBIENT_TRACKS[0];
    if (!ambientRef.current) {
      ambientRef.current = new Audio(selectedTrack.src);
      ambientRef.current.loop = true;
      ambientRef.current.volume = 0.18;
    }

    const audio = ambientRef.current;
    audio.src = selectedTrack.src;

    if (ambientOn) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }

    return () => {
      audio.pause();
    };
  }, [ambientOn, ambientTrack]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggleReadAloud = () => {
    if (!window.speechSynthesis) {
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      [article.title[language] || article.title.en, localizedContent, ...footnotes].filter(Boolean).join(". ")
    );
    utterance.lang = language === "zh" ? "zh-CN" : language === "ja" ? "ja-JP" : language === "ko" ? "ko-KR" : "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const toggleHighlight = (paragraphId) => {
    setParagraphState((current) => ({
      ...current,
      highlights: {
        ...current.highlights,
        [paragraphId]: !current.highlights[paragraphId],
      },
    }));
  };

  const setParagraphNote = (paragraphId, value) => {
    setParagraphState((current) => ({
      ...current,
      notes: {
        ...current.notes,
        [paragraphId]: value,
      },
    }));
  };

  const removeParagraphNote = (paragraphId) => {
    setParagraphState((current) => {
      const nextNotes = { ...current.notes };
      delete nextNotes[paragraphId];
      return { ...current, notes: nextNotes };
    });
  };

  const toggleFavorite = (paragraphId) => {
    setParagraphState((current) => ({
      ...current,
      favorites: {
        ...current.favorites,
        [paragraphId]: !current.favorites[paragraphId],
      },
    }));
  };

  const exportNotes = () => {
    // 导出当前文章的高亮/收藏/批注，便于整理为外部笔记。
    const content = rendered
      .filter((block) => block.type === "text" && (paragraphState.notes[block.id] || paragraphState.highlights[block.id] || paragraphState.favorites[block.id]))
      .map((block, index) => {
        const flags = [
          paragraphState.highlights[block.id] ? experience.highlightedParagraphs : "",
          paragraphState.favorites[block.id] ? experience.favoriteParagraphs : "",
        ]
          .filter(Boolean)
          .join(" / ");
        return [
          `## ${index + 1}. ${flags || "Paragraph"}`,
          block.value,
          paragraphState.notes[block.id] ? `\n${paragraphState.notes[block.id]}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");
    const blob = new Blob([content || article.title[language] || article.title.en], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${article.slug || "reading-room-notes"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const highlightCount = Object.values(paragraphState.highlights).filter(Boolean).length;
  const favoriteCount = Object.values(paragraphState.favorites).filter(Boolean).length;
  const noteCount = Object.values(paragraphState.notes).filter((value) => String(value || "").trim()).length;
  const paragraphCount = rendered.filter((block) => block.type === "text").length;
  const wordCount = localizedContent.trim() ? localizedContent.trim().split(/\s+/).length : 0;
  const highlightedEntries = rendered.filter(
    (block) => block.type === "text" && paragraphState.highlights[block.id]
  );
  const favoriteEntries = rendered.filter(
    (block) => block.type === "text" && paragraphState.favorites[block.id]
  );

  const renderArticleBlock = (block) => {
    if (block.type === "text") {
      const noteValue = paragraphState.notes[block.id] || "";
      const isHighlighted = Boolean(paragraphState.highlights[block.id]);
      const isFavorite = Boolean(paragraphState.favorites[block.id]);
      const isNoteOpen = noteOpenId === block.id || Boolean(noteValue);

      return (
        <div
          key={block.key}
          className={`article-paragraph ${isHighlighted ? "highlighted" : ""}`}
        >
          <p
            className="body-copy article-detail__copy"
            onClick={() => toggleHighlight(block.id)}
          >
            {block.value}
          </p>
          <div className="article-paragraph__actions">
            <button
              type="button"
              className={`tag-chip tag-chip--button ${isHighlighted ? "active" : ""}`}
              onClick={() => toggleHighlight(block.id)}
            >
              {isHighlighted ? experience.highlightedParagraphs : experience.highlightAction}
            </button>
            <button
              type="button"
              className={`tag-chip tag-chip--button ${isFavorite ? "active" : ""}`}
              onClick={() => toggleFavorite(block.id)}
            >
              {experience.favoriteParagraphs}
            </button>
            <button
              type="button"
              className="tag-chip tag-chip--button"
              onClick={() =>
                setNoteOpenId((current) => (current === block.id ? null : block.id))
              }
            >
              {experience.noteOnParagraph}
            </button>
          </div>
          {isNoteOpen ? (
            <div className="article-paragraph__note">
              <textarea
                value={noteValue}
                onChange={(event) => setParagraphNote(block.id, event.target.value)}
                placeholder={experience.notePlaceholder}
              />
              <div className="article-paragraph__note-actions">
                <button
                  type="button"
                  className="dock-button"
                  onClick={() => setNoteOpenId(null)}
                >
                  {experience.saveNote}
                </button>
                {noteValue ? (
                  <button
                    type="button"
                    className="dock-button"
                    onClick={() => {
                      removeParagraphNote(block.id);
                      setNoteOpenId(null);
                    }}
                  >
                    {experience.removeNote}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    if (block.type === "heading") {
      return block.level === 2 ? (
        <h2 key={block.key} id={block.id} className="article-heading level-2">
          {block.value}
        </h2>
      ) : (
        <h3 key={block.key} id={block.id} className="article-heading level-3">
          {block.value}
        </h3>
      );
    }

    return <AttachmentBlock key={block.key} attachment={block.value} copy={copy} />;
  };

  if (isXFlow) {
    return (
      <main className={`page xflow-article-detail-page ${readingRoom ? "reading-room reading-room--on" : ""} ${focusMode ? "reading-room--focus" : ""} ${nightMode ? "reading-room--night" : ""}`}>
        <section className="xflow-article-hero glass-card">
          <div className="xflow-article-hero__meta">
            <p className="micro-label">{article.tag}</p>
            <h1>{article.title[language]}</h1>
            <p className="body-copy">{article.excerpt[language]}</p>
            <ArticleMeta article={article} copy={copy} language={language} />
            <div className="xflow-article-hero__actions">
              <button type="button" className="dock-button" onClick={handleCopyLink}>
                {copied ? copy.linkCopied : copy.copyLink}
              </button>
              <button type="button" className="dock-button" onClick={() => setReadingRoom((current) => !current)}>
                {experience.readingRoom}
              </button>
              <button type="button" className="dock-button" onClick={() => setFocusMode((current) => !current)}>
                {experience.focusMode}
              </button>
              <button type="button" className="dock-button" onClick={() => setNightMode((current) => !current)}>
                {experience.nightMode}
              </button>
              <button type="button" className="dock-button" onClick={() => setAmbientOn((current) => !current)}>
                {experience.ambientMode}
              </button>
              <button type="button" className="dock-button" onClick={exportNotes}>
                {experience.exportNotes}
              </button>
              <button type="button" className="dock-button" onClick={toggleReadAloud}>
                {speaking ? experience.stopReading : experience.readAloud}
              </button>
              <div className="reading-progress xflow-reading-progress">
                <span>{copy.readingProgress}</span>
                <div className="reading-progress__bar">
                  <div className="reading-progress__fill" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="reading-room__ambient-row">
              {AMBIENT_TRACKS.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={`tag-chip tag-chip--button ${ambientTrack === item.code ? "active" : ""}`}
                  onClick={() => setAmbientTrack(item.code)}
                >
                  {item.title[language] || item.title.en}
                </button>
              ))}
            </div>
          </div>
          <div className="xflow-article-hero__lead">
            {article.coverImage ? <img className="page-banner__cover" src={article.coverImage} alt={article.title[language]} /> : null}
            <div className="xflow-article-summary-card">
              <p className="micro-label">Summary</p>
              <p className="body-copy">{seoDescription}</p>
            </div>
          </div>
        </section>

        <section className="xflow-article-content-grid">
          <aside className="xflow-article-side">
            {sections.length ? (
              <article className="glass-card xflow-side-card">
                <p className="micro-label">{copy.tocTitle}</p>
                <div className="toc-list">
                  {sections.map((section) => (
                    <a key={section.id} className={`toc-link level-${section.level}`} href={`#${section.id}`}>
                      {section.title}
                    </a>
                  ))}
                </div>
              </article>
            ) : null}
            <article className="glass-card xflow-side-card">
              <p className="micro-label">
                {highlightCount || favoriteCount ? experience.readingStats : copy.unplacedAttachments}
              </p>
              <div className={highlightCount || favoriteCount ? "stack-list" : "attachment-grid"}>
                {highlightCount || favoriteCount ? (
                  <>
                    <article className="article-highlight-chip article-highlight-chip--stats">
                      <strong>{experience.readingStats}</strong>
                      <span>{experience.statsWords}: {wordCount}</span>
                      <span>{experience.statsParagraphs}: {paragraphCount}</span>
                      <span>{experience.statsNotes}: {noteCount}</span>
                      <span>{experience.statsFavorites}: {favoriteCount}</span>
                    </article>
                    {favoriteEntries.map((block) => (
                      <article key={`favorite-${block.id}`} className="article-highlight-chip">
                        <strong>{experience.favoriteParagraphs}</strong>
                        <p className="body-copy">{block.value}</p>
                      </article>
                    ))}
                    {highlightedEntries.map((block) => (
                      <article key={block.id} className="article-highlight-chip">
                        <strong>{experience.highlightedParagraphs}</strong>
                        <p className="body-copy">{block.value}</p>
                        {paragraphState.notes[block.id] ? (
                          <span>{paragraphState.notes[block.id]}</span>
                        ) : null}
                      </article>
                    ))}
                  </>
                ) : remainingAttachments.length ? (
                  remainingAttachments.map((attachment) => <AttachmentBlock key={attachment.id} attachment={attachment} copy={copy} />)
                ) : (
                  <p className="body-copy">{copy.noAttachments}</p>
                )}
              </div>
            </article>
          </aside>

          <article className="glass-card xflow-article-main">
            <p className="micro-label">ARTICLE</p>
            <div className="article-detail__body">
              {localizedContent ? (
                rendered.map(renderArticleBlock)
              ) : (
                <p className="body-copy">{copy.articleEmpty}</p>
              )}
              {footnotes.length ? (
                <div className="article-footnotes">
                  <p className="micro-label">{experience.footnotes}</p>
                  <ol>
                    {footnotes.map((note, index) => (
                      <li key={`${index}-${note}`}>{note}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className={`page ${readingRoom ? "reading-room reading-room--on" : ""} ${focusMode ? "reading-room--focus" : ""} ${nightMode ? "reading-room--night" : ""}`}>
      <div className="reading-progress glass-card">
        <span>{copy.readingProgress}</span>
        <div className="reading-progress__bar">
          <div className="reading-progress__fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <button type="button" className="dock-button" onClick={handleCopyLink}>
          {copied ? copy.linkCopied : copy.copyLink}
        </button>
      </div>
      <section className="article-experience-bar glass-card">
        <button type="button" className="dock-button" onClick={() => setReadingRoom((current) => !current)}>{experience.readingRoom}</button>
        <button type="button" className="dock-button" onClick={() => setFocusMode((current) => !current)}>{experience.focusMode}</button>
        <button type="button" className="dock-button" onClick={() => setNightMode((current) => !current)}>{experience.nightMode}</button>
        <button type="button" className="dock-button" onClick={() => setAmbientOn((current) => !current)}>{experience.ambientMode}</button>
        <button type="button" className="dock-button" onClick={exportNotes}>{experience.exportNotes}</button>
        <button type="button" className="dock-button" onClick={toggleReadAloud}>{speaking ? experience.stopReading : experience.readAloud}</button>
        <div className="reading-room__ambient-row">
          {AMBIENT_TRACKS.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`tag-chip tag-chip--button ${ambientTrack === item.code ? "active" : ""}`}
              onClick={() => setAmbientTrack(item.code)}
            >
              {item.title[language] || item.title.en}
            </button>
          ))}
        </div>
      </section>
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
                rendered.map(renderArticleBlock)
              ) : (
                <p className="body-copy">{copy.articleEmpty}</p>
              )}
              {footnotes.length ? (
                <div className="article-footnotes">
                  <p className="micro-label">{experience.footnotes}</p>
                  <ol>
                    {footnotes.map((note, index) => (
                      <li key={`${index}-${note}`}>{note}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </article>
        </Reveal>

        <Reveal delay={120}>
          <article className="detail-card glass-card article-detail-card">
            <p className="micro-label">
              {highlightCount || favoriteCount ? experience.readingStats : copy.unplacedAttachments}
            </p>
            <div className={highlightCount || favoriteCount ? "stack-list" : "attachment-grid"}>
              {highlightCount || favoriteCount ? (
                <>
                  <article className="article-highlight-chip article-highlight-chip--stats">
                    <strong>{experience.readingStats}</strong>
                    <span>{experience.statsWords}: {wordCount}</span>
                    <span>{experience.statsParagraphs}: {paragraphCount}</span>
                    <span>{experience.statsNotes}: {noteCount}</span>
                    <span>{experience.statsFavorites}: {favoriteCount}</span>
                  </article>
                  {favoriteEntries.map((block) => (
                    <article key={`favorite-${block.id}`} className="article-highlight-chip">
                      <strong>{experience.favoriteParagraphs}</strong>
                      <p className="body-copy">{block.value}</p>
                    </article>
                  ))}
                  {highlightedEntries.map((block) => (
                    <article key={block.id} className="article-highlight-chip">
                      <strong>{experience.highlightedParagraphs}</strong>
                      <p className="body-copy">{block.value}</p>
                      {paragraphState.notes[block.id] ? (
                        <span>{paragraphState.notes[block.id]}</span>
                      ) : null}
                    </article>
                  ))}
                </>
              ) : remainingAttachments.length ? (
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

function ProjectDetailPage({ language, text, projects, meta, isXFlow }) {
  const { slug } = useParams();
  const project = useMemo(
    () => projects.find((item) => item.slug === slug) ?? projects[0],
    [projects, slug]
  );
  const siteAvatar = getSiteAvatar(meta, templateAvatar);
  useSeo({
    title: `${project.title} / ${getBrowserTitle(meta, language)}`,
    description: project.summary[language] || project.summary.en,
    image: siteAvatar,
  });

  if (isXFlow) {
    return (
      <main className="page xflow-project-detail-page">
        <section className="xflow-project-hero glass-card">
          <div>
            <p className="micro-label">{text.projectDetailEyebrow}</p>
            <h1>{project.title}</h1>
            <p className="body-copy">{project.summary[language]}</p>
          </div>
          <div className="xflow-project-metrics">
            {project.metrics.map((metric) => (
              <span className="tag-chip" key={metric}>
                {metric}
              </span>
            ))}
          </div>
        </section>

        <section className="xflow-project-grid">
          <Reveal>
            <article className="glass-card xflow-project-card xflow-project-card--challenge">
              <p className="micro-label">Challenge</p>
              <h2>{text.challenge}</h2>
              <p className="body-copy">{project.challenge[language]}</p>
            </article>
          </Reveal>
          <Reveal delay={120}>
            <article className="glass-card xflow-project-card xflow-project-card--solution">
              <p className="micro-label">Solution</p>
              <h2>{text.solution}</h2>
              <p className="body-copy">{project.solution[language]}</p>
            </article>
          </Reveal>
          <Reveal delay={240}>
            <article className="glass-card xflow-project-card xflow-project-card--outcome">
              <p className="micro-label">Outcome</p>
              <h2>{text.outcome}</h2>
              <p className="body-copy">{project.outcome[language]}</p>
            </article>
          </Reveal>
        </section>
      </main>
    );
  }

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
  deleteProject,
  isAuthenticated,
  login,
  logout,
  sessionExpired,
  lockUntil,
  studioAvailable,
  authReady,
  siteContent,
  saveSiteContent,
  setPreviewBackground,
}) {
  const location = useLocation();
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
  const [authFocusField, setAuthFocusField] = useState("idle");
  const [authPointer, setAuthPointer] = useState({ x: 0, y: 0 });
  const experience = getExperienceCopy(language);
  const readingRoomSnapshot = useMemo(() => getReadingRoomSnapshot(selectedSlug === "__new__" ? draft.slug : selectedSlug), [draft.slug, selectedSlug]);
  const readingRoomBlocks = useMemo(() => {
    const localized = draft.content[editorLanguage] || "";
    const rendered = renderArticleContent(localized, draft.attachments, copy).rendered;
    return rendered.filter((block) => block.type === "text" && (
      readingRoomSnapshot.highlights?.[block.id] ||
      readingRoomSnapshot.favorites?.[block.id] ||
      readingRoomSnapshot.notes?.[block.id]
    ));
  }, [copy, draft.attachments, draft.content, editorLanguage, readingRoomSnapshot]);

  useEffect(() => {
    setEditorLanguage(language);
  }, [language]);

  useEffect(() => {
    setSiteDraft(normalizeSiteContent(siteContent));
  }, [siteContent]);

  useStudioBackgroundPreview(siteDraft, setPreviewBackground);

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

  useEffect(() => {
    // 命令面板可以通过 query 参数直接唤起“新建 / 编辑”状态。
    const params = new URLSearchParams(location.search);
    const createTarget = params.get("create");
    const editArticle = params.get("editArticle");
    const editProject = params.get("editProject");
    if (!createTarget) {
      if (editArticle) {
        setSelectedSlug(editArticle);
      }
      if (editProject) {
        setSelectedProjectSlug(editProject);
      }
      return;
    }
    if (createTarget === "article") {
      setSelectedSlug("__new__");
    }
    if (createTarget === "project") {
      setSelectedProjectSlug("__new_project__");
    }
  }, [location.search]);

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

  const handleImportReadingRoomNotes = () => {
    if (!readingRoomBlocks.length) {
      return;
    }

    const noteDraft = readingRoomBlocks
      .map((block, index) => {
        const flags = [
          readingRoomSnapshot.highlights?.[block.id] ? experience.highlightedParagraphs : "",
          readingRoomSnapshot.favorites?.[block.id] ? experience.favoriteParagraphs : "",
        ]
          .filter(Boolean)
          .join(" / ");
        const noteText = readingRoomSnapshot.notes?.[block.id] || "";
        return [
          `## ${index + 1}. ${flags || experience.readingRoom}`,
          block.value,
          noteText ? `- ${noteText}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    setDraft((current) => ({
      ...current,
      content: {
        ...current.content,
        [editorLanguage]: [current.content[editorLanguage] || "", noteDraft].filter(Boolean).join("\n\n"),
      },
    }));
    setFlash(experience.importNotesDraft);
    window.setTimeout(() => setFlash(""), 1200);
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
    pushRecentEdit({
      id: `article-${nextSlug}`,
      path: `/studio?editArticle=${nextSlug}`,
      label: nextDraft.title[editorLanguage] || nextDraft.title.en || nextSlug,
      timestamp: Date.now(),
    });
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

  const handleBackgroundUpload = async (event) => {
    const [file] = Array.from(event.target.files ?? []);
    if (!file) {
      return;
    }
    const [background] = await Promise.all([fileToAttachment(file)]);
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        backgroundPreset: "none",
        backgroundImage: background.dataUrl,
      },
    }));
    event.target.value = "";
  };

  const handleBackgroundPreset = (presetCode) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        backgroundImage: "",
        backgroundPreset: presetCode,
      },
    }));
  };

  const handleClearBackground = () => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        backgroundImage: "",
        backgroundPreset: "none",
      },
    }));
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

  const handlePinnedSpaceField = (index, key, value) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        pinnedSpaces: current.meta.pinnedSpaces.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const handleRemoveHomeCardOverride = (cardId) => {
    setSiteDraft((current) => {
      const nextOverrides = { ...(current.meta.homeCardOverrides || {}) };
      delete nextOverrides[cardId];
      return {
        ...current,
        meta: {
          ...current.meta,
          homeCardOverrides: nextOverrides,
        },
      };
    });
  };

  const handlePinnedSpaceLocalizedField = (index, key, value) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        pinnedSpaces: current.meta.pinnedSpaces.map((item, itemIndex) =>
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

  const handleAddPinnedSpace = () => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        pinnedSpaces: [...current.meta.pinnedSpaces, createBlankPinnedSpace()],
      },
    }));
  };

  const handleRemovePinnedSpace = (index) => {
    setSiteDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        pinnedSpaces: current.meta.pinnedSpaces.filter((_, itemIndex) => itemIndex !== index),
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
    if (result.siteContent) {
      setSiteDraft(normalizeSiteContent(result.siteContent));
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
      updatedAt: new Date().toISOString(),
    };

    const result = await saveProject(nextProject, selectedProjectSlug === "__new_project__" ? null : selectedProjectSlug);
    if (!result.ok) {
      setFlash(result.reason === "unauthorized" ? copy.sessionExpired : "Studio save is unavailable without the backend server.");
      window.setTimeout(() => setFlash(""), 1800);
      return;
    }
    pushRecentEdit({
      id: `project-${nextSlug}`,
      path: `/studio?editProject=${nextSlug}`,
      label: nextProject.title || nextSlug,
      timestamp: Date.now(),
    });
    setSelectedProjectSlug(nextSlug);
    setFlash(copy.projectSaved);
    window.setTimeout(() => setFlash(""), 1600);
  };

  const handleDeleteProject = async () => {
    if (selectedProjectSlug === "__new_project__" || !projectDraft.slug) {
      return;
    }
    const result = await deleteProject(selectedProjectSlug);
    if (!result.ok) {
      setFlash(result.reason === "unauthorized" ? copy.sessionExpired : "Studio save is unavailable without the backend server.");
      window.setTimeout(() => setFlash(""), 1800);
      return;
    }
    setSelectedProjectSlug("__new_project__");
    setProjectDraft(createBlankProject());
  };

  const studioProgress = useReadingProgress();
  const authSignals = useMemo(
    () =>
      language === "zh"
        ? ["Server Session", "Content Control", "Private Access"]
        : language === "ja"
          ? ["Server Session", "Content Control", "Private Access"]
          : language === "ko"
            ? ["Server Session", "Content Control", "Private Access"]
            : ["Server Session", "Content Control", "Private Access"],
    [language]
  );
  const studioSections = useMemo(
    () => [
      { id: "studio-article", label: copy.articleListTitle },
      { id: "studio-site-meta", label: copy.contentEditorTitle },
      { id: "studio-site-copy", label: "Site Copy" },
      { id: "studio-social", label: copy.socialEditorTitle },
      { id: "studio-pinned", label: getExperienceCopy(language).pinnedEditorTitle },
      { id: "studio-custom-cards", label: copy.customCardsTitle },
      { id: "studio-projects", label: copy.projectsEditorTitle },
    ],
    [copy, language]
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

  const handleAuthHeroPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    setAuthPointer({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    });
  };

  const resetAuthHeroPointer = () => {
    setAuthPointer({ x: 0, y: 0 });
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
        <section className="auth-shell glass-card">
          <div
            className={`auth-hero auth-hero--${authFocusField}`}
            onPointerMove={handleAuthHeroPointerMove}
            onPointerLeave={resetAuthHeroPointer}
            style={{
              "--auth-look-x": authPointer.x.toFixed(3),
              "--auth-look-y": authPointer.y.toFixed(3),
            }}
          >
            <p className="micro-label">DEVELOPER ACCESS</p>
            <div className="auth-mascot" aria-hidden="true">
              <div className="auth-mascot__halo auth-mascot__halo--back" />
              <div className="auth-mascot__halo auth-mascot__halo--front" />
              <div className="auth-mascot__spark auth-mascot__spark--a" />
              <div className="auth-mascot__spark auth-mascot__spark--b" />
              <div className="auth-mascot__spark auth-mascot__spark--c" />

              <div className="auth-mascot__buddy auth-mascot__buddy--a">
                <span className="auth-mascot__buddy-eye" />
                <span className="auth-mascot__buddy-eye" />
              </div>
              <div className="auth-mascot__buddy auth-mascot__buddy--b">
                <span className="auth-mascot__buddy-eye" />
                <span className="auth-mascot__buddy-eye" />
              </div>

              <div className="auth-mascot__figure auth-mascot__figure--main">
                <div className="auth-mascot__orb" />
                <div className="auth-mascot__shell">
                  <div className="auth-mascot__visor">
                    <span className="auth-mascot__eye" />
                    <span className="auth-mascot__eye" />
                  </div>
                  <div className="auth-mascot__smile" />
                  <div className="auth-mascot__arm auth-mascot__arm--left" />
                  <div className="auth-mascot__arm auth-mascot__arm--right" />
                  <div className="auth-mascot__foot auth-mascot__foot--left" />
                  <div className="auth-mascot__foot auth-mascot__foot--right" />
                </div>
              </div>
            </div>
            <h1>{copy.loginTitle}</h1>
            <p className="body-copy">{copy.loginBody}</p>
            <div className="auth-hero__chips">
              {authSignals.map((item) => (
                <span key={item} className="auth-chip">
                  {item}
                </span>
              ))}
            </div>
            <div className="auth-hero__panel">
              <div>
                <span className="micro-label">Identity</span>
                <strong>{siteDraft.meta.name}</strong>
              </div>
              <div>
                <span className="micro-label">Secure Route</span>
                <strong>/studio</strong>
              </div>
              <div>
                <span className="micro-label">Scope</span>
                <strong>{copy.contentEditorTitle}</strong>
              </div>
            </div>
          </div>

          <div className="auth-form-card">
            <div className="auth-form-card__head">
              <p className="micro-label">SIGN IN</p>
              <h2>{copy.login}</h2>
            </div>
            <form className="studio-login" onSubmit={handleLogin}>
              <label className="studio-field">
                <span>{copy.username}</span>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                  onFocus={() => setAuthFocusField("username")}
                  onBlur={() => setAuthFocusField("idle")}
                />
              </label>
              <label className="studio-field">
                <span>{copy.password}</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  onFocus={() => setAuthFocusField("password")}
                  onBlur={() => setAuthFocusField("idle")}
                />
              </label>
              {sessionExpired ? <p className="studio-error">{copy.sessionExpired}</p> : null}
              {lockUntil > Date.now() ? <p className="studio-error">{copy.loginLocked}</p> : null}
              {loginError ? <p className="studio-error">{loginError}</p> : null}
              <button type="submit" className="action-button action-button--primary auth-submit">
                {copy.login}
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="page-banner glass-card glass-card--static studio-banner">
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
          <aside className="studio-sidebar glass-card glass-card--static">
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
        <section id="studio-article" className="studio-editor glass-card glass-card--static studio-section-card">
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

            <label className="studio-field">
              <span>{getExperienceCopy(language).footnotesEditor}</span>
              <textarea
                rows="4"
                value={(draft.footnotes?.[editorLanguage] || []).join("\n")}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    footnotes: {
                      ...current.footnotes,
                      [editorLanguage]: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                    },
                  }))
                }
              />
            </label>

            <div className="studio-reading-room">
              <div className="studio-reading-room__head">
                <div>
                  <span className="micro-label">{experience.readingRoom}</span>
                  <strong>{experience.highlightedParagraphs} / {experience.favoriteParagraphs}</strong>
                </div>
                <button
                  type="button"
                  className="action-button action-button--secondary"
                  onClick={handleImportReadingRoomNotes}
                  disabled={!readingRoomBlocks.length}
                >
                  {experience.importNotesDraft}
                </button>
              </div>
              <div className="studio-reading-room__list">
                {readingRoomBlocks.length ? (
                  readingRoomBlocks.map((block) => (
                    <article key={block.id} className="studio-reading-room__item">
                      <p className="body-copy">{block.value}</p>
                      {readingRoomSnapshot.notes?.[block.id] ? (
                        <span>{readingRoomSnapshot.notes[block.id]}</span>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="body-copy">{copy.noAttachments}</p>
                )}
              </div>
            </div>

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
        <section id="studio-site-meta" className="studio-editor glass-card glass-card--static studio-section-card">
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
                <span>{copy.browserTitle}</span>
                <input
                  type="text"
                  value={siteDraft.meta.browserTitle[editorLanguage] || ""}
                  onChange={(event) => handleSiteLocalizedMeta("browserTitle", event.target.value)}
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
            <div className="studio-block studio-background-block">
              <div className="studio-background-block__head">
                <div>
                  <p className="micro-label">BACKGROUND</p>
                  <strong>{copy.backgroundTitle}</strong>
                </div>
                <button type="button" className="action-button action-button--secondary" onClick={handleClearBackground}>
                  {copy.clearBackground}
                </button>
              </div>
              <div className="studio-background-presets">
                {STUDIO_BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    className={`studio-preset ${siteDraft.meta.backgroundPreset === preset.code ? "active" : ""}`}
                    onClick={() => handleBackgroundPreset(preset.code)}
                  >
                    <span className={`studio-preset__swatch studio-preset__swatch--${preset.code}`} />
                    <span className="studio-preset__text">
                      <strong>{preset.label[language] || preset.label.en}</strong>
                      <span>{preset.eyebrow[language] || preset.eyebrow.en}</span>
                    </span>
                  </button>
                ))}
              </div>
              <label className="studio-field studio-field--inline">
                <span>{copy.uploadBackground}</span>
                <input type="file" accept="image/*" onChange={handleBackgroundUpload} />
              </label>
              {siteDraft.meta.backgroundImage ? (
                <img className="studio-background-preview" src={siteDraft.meta.backgroundImage} alt="background preview" />
              ) : null}
            </div>
          </div>
        </section>

        <section id="studio-site-copy" className="studio-editor glass-card glass-card--static studio-section-card">
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

        <section id="studio-social" className="studio-editor glass-card glass-card--static studio-section-card">
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

        <section id="studio-pinned" className="studio-editor glass-card glass-card--static studio-section-card">
          <div className="studio-editor__head">
            <div>
              <p className="micro-label">PINNED</p>
              <h2>{getExperienceCopy(language).pinnedEditorTitle}</h2>
              <p className="body-copy">{getExperienceCopy(language).pinnedEditorBody}</p>
            </div>
            <button type="button" className="action-button action-button--secondary" onClick={handleAddPinnedSpace}>
              {getExperienceCopy(language).addPinnedSpace}
            </button>
          </div>

          <div className="studio-list">
            {siteDraft.meta.pinnedSpaces.map((item, index) => (
              <div key={item.id} className="studio-block">
                <div className="studio-form__row">
                  <label className="studio-field">
                    <span>{getExperienceCopy(language).pinnedKind}</span>
                    <select value={item.kind} onChange={(event) => handlePinnedSpaceField(index, "kind", event.target.value)}>
                      <option value="article">{getExperienceCopy(language).pinnedArticle}</option>
                      <option value="project">{getExperienceCopy(language).pinnedProject}</option>
                      <option value="link">{getExperienceCopy(language).pinnedLink}</option>
                      <option value="audio">{getExperienceCopy(language).pinnedAudio}</option>
                    </select>
                  </label>
                  {item.kind === "article" ? (
                    <label className="studio-field">
                      <span>{getExperienceCopy(language).pinnedTarget}</span>
                      <select value={item.articleSlug} onChange={(event) => handlePinnedSpaceField(index, "articleSlug", event.target.value)}>
                        <option value="">-</option>
                        {articles.map((article) => (
                          <option key={article.slug} value={article.slug}>
                            {article.title[language] || article.title.en}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {item.kind === "project" ? (
                    <label className="studio-field">
                      <span>{getExperienceCopy(language).pinnedTarget}</span>
                      <select value={item.projectSlug} onChange={(event) => handlePinnedSpaceField(index, "projectSlug", event.target.value)}>
                        <option value="">-</option>
                        {projects.map((project) => (
                          <option key={project.slug} value={project.slug}>
                            {project.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {(item.kind === "link" || item.kind === "audio") ? (
                    <label className="studio-field">
                      <span>{getExperienceCopy(language).pinnedUrl}</span>
                      <input
                        type="text"
                        value={item.kind === "audio" ? item.audioSrc : item.url}
                        onChange={(event) =>
                          handlePinnedSpaceField(index, item.kind === "audio" ? "audioSrc" : "url", event.target.value)
                        }
                      />
                    </label>
                  ) : null}
                </div>

                <div className="studio-form__row">
                  <label className="studio-field">
                    <span>{getExperienceCopy(language).pinnedLabel}</span>
                    <input
                      type="text"
                      value={item.title[editorLanguage] || ""}
                      onChange={(event) => handlePinnedSpaceLocalizedField(index, "title", event.target.value)}
                    />
                  </label>
                  <label className="studio-field">
                    <span>{getExperienceCopy(language).pinnedBodyLabel}</span>
                    <textarea
                      rows="3"
                      value={item.body[editorLanguage] || ""}
                      onChange={(event) => handlePinnedSpaceLocalizedField(index, "body", event.target.value)}
                    />
                  </label>
                </div>

                {item.kind === "audio" ? (
                  <div className="studio-form__row">
                    <label className="studio-field">
                      <span>{getExperienceCopy(language).pinnedAudioTitle}</span>
                      <input
                        type="text"
                        value={item.audioTitle[editorLanguage] || ""}
                        onChange={(event) => handlePinnedSpaceLocalizedField(index, "audioTitle", event.target.value)}
                      />
                    </label>
                    <label className="studio-field">
                      <span>{getExperienceCopy(language).pinnedAudioArtist}</span>
                      <input
                        type="text"
                        value={item.audioArtist[editorLanguage] || ""}
                        onChange={(event) => handlePinnedSpaceLocalizedField(index, "audioArtist", event.target.value)}
                      />
                    </label>
                  </div>
                ) : null}

                <button type="button" className="action-button action-button--secondary" onClick={() => handleRemovePinnedSpace(index)}>
                  {getExperienceCopy(language).removePinnedSpace}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section id="studio-custom-cards" className="studio-editor glass-card glass-card--static studio-section-card">
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
            {Object.keys(siteDraft.meta.homeCardOverrides || {}).length ? (
              <div className="studio-block">
                <div className="studio-editor__head">
                  <div>
                    <p className="micro-label">OVERRIDES</p>
                    <h3>首页卡片快捷编辑覆盖</h3>
                    <p className="body-copy">这里显示卡片流里直接改过的标题、摘要、链接和按钮文案。</p>
                  </div>
                </div>
                <div className="studio-list">
                  {Object.entries(siteDraft.meta.homeCardOverrides || {}).map(([cardId, override]) => (
                    <div key={cardId} className="studio-block">
                      {override.coverImage ? <img className="studio-cover-preview" src={override.coverImage} alt={`${cardId} cover`} /> : null}
                      <div className="studio-form__row">
                        <label className="studio-field">
                          <span>Card ID</span>
                          <input type="text" value={cardId} readOnly />
                        </label>
                        <label className="studio-field">
                          <span>标题</span>
                          <input type="text" value={override.title || ""} readOnly />
                        </label>
                      </div>
                      <label className="studio-field">
                        <span>摘要</span>
                        <textarea rows="3" value={override.body || ""} readOnly />
                      </label>
                      <div className="studio-form__row">
                        <label className="studio-field">
                          <span>链接</span>
                          <input type="text" value={override.href || ""} readOnly />
                        </label>
                        <label className="studio-field">
                          <span>按钮文案</span>
                          <input type="text" value={override.action || ""} readOnly />
                        </label>
                      </div>
                      <button type="button" className="action-button action-button--secondary" onClick={() => handleRemoveHomeCardOverride(cardId)}>
                        清除覆盖
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        <section id="studio-projects" className="studio-editor glass-card glass-card--static studio-section-card">
          <div className="studio-editor__head">
            <div>
              <p className="micro-label">PROJECTS</p>
              <h2>{copy.projectsEditorTitle}</h2>
              <p className="body-copy">{copy.projectsEditorBody}</p>
            </div>
            <div className="studio-inline-actions">
              {selectedProjectSlug !== "__new_project__" ? (
                <button type="button" className="action-button action-button--secondary" onClick={handleDeleteProject}>
                  {copy.deleteProject}
                </button>
              ) : null}
              <button type="button" className="action-button action-button--primary" onClick={handleSaveProject}>
                {copy.saveProject}
              </button>
            </div>
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

        <aside className="studio-rail glass-card glass-card--static">
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
  const [previewBackground, setPreviewBackground] = useState(null);
  const [backgroundPresetOverride, setBackgroundPresetOverride] = useState(null);
  const copy = getCopy(language);
  const { articles, projects, siteContent, entries, saveArticle, saveProject, deleteProject, saveContent, addEntry, studioAvailable } = useBackendContent();
  const { isAuthenticated, login, logout, sessionExpired, lockUntil, authReady } = useStudioAuth(studioAvailable);
  const text = {
    ...uiText[language],
    ...(siteContent.text?.[language] ?? {}),
  };
  const meta = {
    ...(siteContent.meta ?? {}),
    browserTitle: ensureLocalizedMap(siteContent.meta?.browserTitle ?? siteMeta.name, siteMeta.name),
    role: ensureLocalizedMap(siteContent.meta?.role, ""),
    intro: ensureLocalizedMap(siteContent.meta?.intro, ""),
    stats: {
      ...siteMeta.stats,
      ...(siteContent.meta?.stats ?? {}),
    },
    homeLayout: siteContent.meta?.homeLayout || "magazine",
    socialLinks: Array.isArray(siteContent.meta?.socialLinks) ? siteContent.meta.socialLinks.map(normalizeSocialLink) : siteMeta.socialLinks.map(normalizeSocialLink),
    customCards: Array.isArray(siteContent.meta?.customCards) ? siteContent.meta.customCards.map(normalizeCustomCard) : [],
    homeCardOverrides: siteContent.meta?.homeCardOverrides || {},
    pinnedSpaces: Array.isArray(siteContent.meta?.pinnedSpaces) ? siteContent.meta.pinnedSpaces.map(normalizePinnedSpace) : [],
  };
  const activeBackground = previewBackground ?? {
    backgroundPreset: normalizeBackgroundPreset(backgroundPresetOverride || meta.backgroundPreset || "none"),
    backgroundImage: backgroundPresetOverride ? "" : meta.backgroundImage || "",
  };
  const isXFlow = activeBackground.backgroundPreset === "xflow";

  useEffect(() => {
    if (!previewBackground) {
      setBackgroundPresetOverride(normalizeBackgroundPreset(meta.backgroundPreset || "none"));
    }
  }, [meta.backgroundPreset, previewBackground]);

  useEffect(() => {
    document.body.dataset.backgroundPreset = activeBackground.backgroundPreset || "none";
    return () => {
      delete document.body.dataset.backgroundPreset;
    };
  }, [activeBackground.backgroundPreset]);

  const handleSaveCardOverride = async (cardId, patch) => {
    const nextContent = normalizeSiteContent({
      ...siteContent,
      meta: {
        ...(siteContent.meta || {}),
        homeCardOverrides: {
          ...(siteContent.meta?.homeCardOverrides || {}),
          [cardId]: patch,
        },
      },
    });
    await saveContent(nextContent);
  };

  return (
    <>
      <SiteBackground presetCode={activeBackground.backgroundPreset} imageSrc={activeBackground.backgroundImage} />
      <Shell
      theme={theme}
      setTheme={setTheme}
      language={language}
      setLanguage={setLanguage}
      font={font}
      setFont={setFont}
      backgroundPreset={activeBackground.backgroundPreset}
      setBackgroundPreset={setBackgroundPresetOverride}
      palette={palette}
      setPalette={setPalette}
      text={text}
      copy={copy}
      meta={meta}
      articles={articles}
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
              isXFlow={isXFlow}
              onSaveCardOverride={handleSaveCardOverride}
              canEditCardContent={isAuthenticated}
            />
          }
        />
        <Route path="/articles" element={<ArticlesPage language={language} text={text} copy={copy} articles={articles} meta={meta} isXFlow={isXFlow} />} />
        <Route path="/articles/:slug" element={<ArticleDetailPage language={language} copy={copy} articles={articles} meta={meta} isXFlow={isXFlow} />} />
        <Route path="/projects/:slug" element={<ProjectDetailPage language={language} text={text} projects={projects} meta={meta} isXFlow={isXFlow} />} />
        <Route path="/archive" element={<ArchivePage language={language} articles={articles} projects={projects} meta={meta} />} />
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
              deleteProject={deleteProject}
              isAuthenticated={isAuthenticated}
              login={login}
              logout={logout}
              sessionExpired={sessionExpired}
              lockUntil={lockUntil}
              studioAvailable={studioAvailable}
              authReady={authReady}
              siteContent={siteContent}
              saveSiteContent={saveContent}
              setPreviewBackground={setPreviewBackground}
            />
          }
        />
      </Routes>
      </Shell>
    </>
  );
}




import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { buildDefaultSiteContent, ensureLocalizedMap, extractArticleSections, fileToAttachment, formatArticleDate, formatRelativeTime, normalizeArticle, normalizeBackgroundPreset, normalizeCustomCard, normalizePinnedSpace, normalizeProject, normalizeSiteContent, normalizeSocialLink, parseArticleDate, sortArticles } from "./lib/content";
import { clamp, hsvToHex, parseStoredPalette } from "./lib/color";
import { getRecentAccesses, getRecentEdits, getRecentReadings, pushRecentAccess, pushRecentReading, readStoredArray, readStoredJson } from "./lib/storage";
import { getExperienceCopy } from "./lib/experienceCopy";
import { apiRequest } from "./lib/api";
import { loadFont } from "./lib/fonts";
import { buildSearchIndex, collectTags, filterArticles, splitTags } from "./lib/articleSearch";
import { articleReadingTime } from "./lib/readingTime";
import { AttachmentBlock, renderArticleContent } from "./components/ArticleContent";
import { useReadingProgress } from "./hooks/studio";

const AntigravityBackground = lazy(() => import("./components/AntigravityBackground"));
const AmbientThreeLayer = lazy(() => import("./components/AmbientThreeLayer"));
const ThemePresetScene = lazy(() => import("./components/ThemePresetScene"));
const StudioPage = lazy(() => import("./pages/StudioPage"));


const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

// Only allow well-known protocols for user-editable links so a value such as
// "javascript:..." saved through the studio can never execute in a visitor's browser.
function safeExternalHref(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = new URL(raw, window.location.href);
    return SAFE_LINK_PROTOCOLS.has(parsed.protocol) ? raw : undefined;
  } catch {
    return undefined;
  }
}

// The app uses HashRouter, so a plain href="#id" would be read as a route change
// ("/id") and render an empty page. Scroll to the in-page target instead.
function scrollToInPageAnchor(event, id) {
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const PALETTE_STORAGE_KEY = "template-palette";
const GUESTBOOK_STORAGE_KEY = "template-guestbook";
const HOME_LAYOUT_STORAGE_KEY = "template-home-layout";
const HOME_CARD_META_STORAGE_KEY = "template-home-card-meta";
const HOME_ARCHIVE_STATE_STORAGE_KEY = "template-home-archive-state";
const STUDIO_MAX_ATTEMPTS = 5;
const STUDIO_LOCK_MS = 15 * 60 * 1000;
const THEME_PRESET_OPTIONS = [
  { code: "none", label: "Default" },
  { code: "xflow", label: "X Flow" },
  { code: "antigravity", label: "Antigravity" },
];
const HOME_LAYOUT_OPTIONS = [
  { code: "magazine", icon: "M" },
  { code: "archive", icon: "A" },
  { code: "cards", icon: "C" },
];
const HOME_CARD_ORDER_STORAGE_KEY = "template-home-card-order";
const AMBIENT_TRACKS = [
  { code: "rain", title: { zh: "雨幕", en: "Rain Room" }, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { code: "harbor", title: { zh: "港湾", en: "Harbor Hush" }, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { code: "night", title: { zh: "夜读", en: "Night Air" }, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
];
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
    deleteArticle: "删除文章",
    deleteArticleConfirm: "确定删除这篇文章吗？删除后会从站点移除（服务器会在 deleted-articles.json 中保留备份）。",
    articleDeleted: "文章已删除",
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
    articleSearchPlaceholder: "搜索标题、摘要、正文或标签",
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
    deleteArticle: "Delete Article",
    deleteArticleConfirm: "Delete this article? It is removed from the site (the server keeps a backup in deleted-articles.json).",
    articleDeleted: "Article deleted",
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
    articleSearchPlaceholder: "Search titles, excerpts, body text, or tags",
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

function getSiteAvatar(meta, fallbackImage) {
  return typeof meta?.avatarImage === "string" && meta.avatarImage ? meta.avatarImage : fallbackImage;
}

function getBrowserTitle(meta, language) {
  return meta?.browserTitle?.[language] || meta?.browserTitle?.en || meta?.name || "Site";
}

function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: none), (pointer: coarse), (max-width: 760px)");
    const sync = () => setIsCoarse(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  return isCoarse;
}

function SiteBackground({ presetCode, imageSrc }) {
  const isCoarse = useIsCoarsePointer();
  const renderAmbientLayer = (mode) => (
    !isCoarse ? <Suspense fallback={null}><AmbientThreeLayer mode={mode} /></Suspense> : null
  );

  if (imageSrc) {
    return (
      <div className="site-background site-background--image" aria-hidden="true">
        {renderAmbientLayer("image")}
        <div className="site-background__image" style={{ backgroundImage: `url("${String(imageSrc).replace(/"/g, '\\"')}")` }} />
        <span className="site-background__image-glow site-background__image-glow--a" />
        <span className="site-background__image-glow site-background__image-glow--b" />
        <span className="site-background__float site-background__float--image-a" style={{ "--depth-x": 22, "--depth-y": 16, "--drift-x": 20, "--drift-y": -16, "--duration": "17s", "--delay": "-3s" }} />
        <span className="site-background__float site-background__float--image-b" style={{ "--depth-x": -18, "--depth-y": 14, "--drift-x": -18, "--drift-y": 16, "--duration": "15s", "--delay": "-8s" }} />
      </div>
    );
  }

  if (presetCode === "antigravity") {
    if (isCoarse) {
      return <div className="site-background site-background--antigravity site-background--antigravity-static" aria-hidden="true" />;
    }

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
        {renderAmbientLayer("xflow")}
      </div>
    );
  }

  return (
    <div className="site-background site-background--none" aria-hidden="true">
      {!isCoarse && <InteractiveSceneBackground mode="none" />}
      {renderAmbientLayer("none")}
    </div>
  );
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
    loadFont(font);
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

function useBackendContent() {
  const [articles, setArticles] = useState(() => sortArticles(seedArticles.map(normalizeArticle)));
  const [projects, setProjects] = useState(() => featuredProjects.map(normalizeProject));
  const [siteContent, setSiteContent] = useState(() => normalizeSiteContent(buildDefaultSiteContent()));
  const [entries, setEntries] = useState(() => readStoredArray(GUESTBOOK_STORAGE_KEY));
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
      // The server is the source of truth for slugs (it de-duplicates them).
      return { ok: true, slug: payload.slug || incoming.slug };
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
      return { ok: true, slug: payload.slug || incoming.slug };
    } catch (error) {
      return { ok: false, reason: error.status === 401 ? "unauthorized" : "request_failed" };
    }
  };

  const deleteArticle = async (slug) => {
    if (!studioAvailable) {
      return { ok: false, reason: "studio_unavailable" };
    }

    try {
      const payload = await apiRequest("/api/studio/articles/delete", {
        method: "POST",
        body: JSON.stringify({ slug }),
      });
      setArticles(sortArticles((payload.articles ?? []).map(normalizeArticle)));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.status === 401 ? "unauthorized" : error.status === 404 ? "not_found" : "request_failed" };
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

    try {
      const payload = await apiRequest("/api/guestbook", {
        method: "POST",
        body: JSON.stringify(entry),
      });
      setEntries(Array.isArray(payload.guestbook) ? payload.guestbook : []);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.status === 429 ? "rate_limited" : "request_failed" };
    }
  };

  return { articles, projects, siteContent, entries, saveArticle, deleteArticle, saveProject, deleteProject, saveContent, addEntry, studioAvailable, contentReady };
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

  const stepPlaylistTrack = (direction) => {
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
                      onClick={() => stepPlaylistTrack(-1)}
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
                      onClick={() => stepPlaylistTrack(1)}
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
          <Link to={{ pathname: "/", hash: "#about" }} ref={(node) => (navItemsRef.current.about = node)}>
            <span className="nav-label">{text.navAbout}</span>
          </Link>
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
    const isCoarsePointer = typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const fadeDelay = isCoarsePointer ? 260 : 420;
    const removeDelay = isCoarsePointer ? 520 : 760;
    setPhase("enter");
    const fadeTimer = window.setTimeout(() => setPhase("leave"), fadeDelay);
    const removeTimer = window.setTimeout(() => setPhase("idle"), removeDelay);
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
  const commandStatusItems = useMemo(() => {
    const experience = getExperienceCopy(language);
    const themeLabel = THEME_PRESET_OPTIONS.find((item) => item.code === backgroundPreset)?.label || backgroundPreset;
    const layoutLabel =
      homeLayout === "archive"
        ? experience.layoutArchive
        : homeLayout === "cards"
          ? experience.layoutCards
          : experience.layoutMagazine;
    const archiveParams = new URLSearchParams(location.search);
    const archiveType = archiveParams.get("archiveType") || "all";
    const archiveYear = archiveParams.get("archiveYear") || "all";
    const archiveTypeLabel =
      archiveType === "article"
        ? experience.timelineArticles
        : archiveType === "project"
          ? experience.timelineProjects
          : experience.timelineAll || "All";
    return [
      { label: experience.quickTheme, value: themeLabel },
      { label: experience.layoutTitle, value: layoutLabel },
      { label: experience.archiveTitle, value: `${archiveYear === "all" ? "All Years" : archiveYear} / ${archiveTypeLabel}` },
    ];
  }, [backgroundPreset, homeLayout, language, location.search]);

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
        statusItems={commandStatusItems}
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

function ArticleMeta({ article, copy, language }) {
  return (
    <div className="card-meta">
      <span>{article.date}</span>
      <span>{articleReadingTime(article, language)}</span>
      <span>
        {copy.editedLabel} {formatRelativeTime(article.updatedAt, language)}
      </span>
    </div>
  );
}

function useSeo({ title, description, image, type = "website", publishedTime = "", modifiedTime = "" }) {
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
    const setOrRemove = (attr, key, value) => {
      if (value) {
        ensureMeta(attr, key).setAttribute("content", value);
      } else {
        document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
      }
    };

    ensureMeta("name", "description").setAttribute("content", description);
    ensureMeta("property", "og:title").setAttribute("content", title);
    ensureMeta("property", "og:description").setAttribute("content", description);
    ensureMeta("property", "og:image").setAttribute("content", image);
    ensureMeta("property", "og:type").setAttribute("content", type);
    ensureMeta("name", "twitter:title").setAttribute("content", title);
    ensureMeta("name", "twitter:description").setAttribute("content", description);
    setOrRemove("property", "article:published_time", type === "article" ? publishedTime : "");
    setOrRemove("property", "article:modified_time", type === "article" ? modifiedTime : "");
  }, [description, image, modifiedTime, publishedTime, title, type]);
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
      const stored = readStoredJson(window.localStorage.getItem(HOME_ARCHIVE_STATE_STORAGE_KEY), {});
      return stored.activeType || "all";
    } catch {
      return "all";
    }
  });
  const [collapsedYears, setCollapsedYears] = useState(() => {
    const stored = readStoredJson(window.localStorage.getItem(HOME_ARCHIVE_STATE_STORAGE_KEY), {});
    return stored.collapsedYears || [];
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
    const stored = readStoredJson(window.localStorage.getItem(HOME_CARD_ORDER_STORAGE_KEY), []);
    if (!stored.length) {
      return items;
    }
    const map = new Map(items.map((item) => [item.id, item]));
    const ordered = stored.map((id) => map.get(id)).filter(Boolean);
    const missing = items.filter((item) => !stored.includes(item.id));
    return [...ordered, ...missing];
  });
  const [cardMeta, setCardMeta] = useState(() => {
    return readStoredJson(window.localStorage.getItem(HOME_CARD_META_STORAGE_KEY), {});
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

  const restoreOriginalCover = (item) => {
    updateCardEdit(item.id, "coverImage", item.coverImage || "");
  };

  // 将快捷编辑里的文案字段恢复为卡片原始内容，方便只回滚文本覆盖而保留布局设置。
  const restoreDefaultCardContent = (item) => {
    setCardMeta((current) => ({
      ...current,
      editMap: {
        ...(current.editMap || {}),
        [item.id]: {
          ...((current.editMap || {})[item.id] || {}),
          title: item.title || "",
          body: item.body || "",
          href: item.href || "",
          action: item.action || "",
        },
      },
    }));
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
                  <div className="home-card-board__editor-actions">
                    <button type="button" onClick={() => restoreDefaultCardContent(item)}>恢复默认文案</button>
                  </div>
                  <div className="home-card-board__editor-cover">
                    <label className="home-card-board__cover-upload">
                      <span>上传封面</span>
                      <input type="file" accept="image/*" onChange={(event) => handleCoverUpload(item.id, event)} />
                    </label>
                    {coverImage ? (
                      <>
                        <img src={coverImage} alt={`${title} cover`} className="home-card-board__cover-preview" />
                        <div className="home-card-board__editor-actions">
                          {item.coverImage ? (
                            <button type="button" onClick={() => restoreOriginalCover(item)}>恢复原始封面</button>
                          ) : null}
                          <button type="button" onClick={() => updateCardEdit(item.id, "coverImage", "")}>移除封面</button>
                        </div>
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
                <a className="inline-link" href={safeExternalHref(href)} target="_blank" rel="noreferrer">
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
                <a className="inline-link" href={safeExternalHref(space.href)} target="_blank" rel="noreferrer">
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
              <a
                key={year}
                className="tag-chip"
                href={`#archive-year-${year}`}
                onClick={(event) => scrollToInPageAnchor(event, `archive-year-${year}`)}
              >
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
  const location = useLocation();

  // Support in-page anchors such as "#/#about" (the About nav item) under HashRouter.
  useEffect(() => {
    const targetId = location.hash.replace(/^#/, "");
    if (!targetId) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash, homeLayout]);
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
    const result = await addGuestbookEntry({
      name: guestbookForm.name.trim(),
      message: guestbookForm.message.trim(),
    });
    if (result?.ok !== false) {
      setGuestbookForm({ name: "", message: "" });
    }
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
                <a key={item.label} className="social-pill" href={safeExternalHref(item.url)} target="_blank" rel="noreferrer">
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
          <a key={item.label} className="social-pill" href={safeExternalHref(item.url)} target="_blank" rel="noreferrer" aria-label={item.label}>
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
                    <a className="inline-link" href={safeExternalHref(card.linkUrl)} target="_blank" rel="noreferrer">
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
  // Search and tag state live in the URL (#/articles?q=...&tag=...) so filtered
  // views can be bookmarked, shared, and restored with the back button.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const activeTag = searchParams.get("tag") || "all";
  const siteAvatar = getSiteAvatar(meta, templateAvatar);
  useSeo({
    title: `${text.articleIndexTitle} / ${getBrowserTitle(meta, language)}`,
    description: text.articleIndexBody,
    image: siteAvatar,
  });

  const updateParam = (key, value) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value && value !== "all") {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      { replace: true }
    );
  };
  const setQuery = (value) => updateParam("q", value);
  const setActiveTag = (value) => updateParam("tag", value);

  const searchIndex = useMemo(() => buildSearchIndex(articles), [articles]);
  const tagCounts = useMemo(() => collectTags(searchIndex), [searchIndex]);
  const tags = useMemo(() => ["all", ...tagCounts.map((item) => item.tag)], [tagCounts]);
  const tagCountMap = useMemo(() => new Map(tagCounts.map((item) => [item.tag, item.count])), [tagCounts]);

  const filteredArticles = useMemo(
    () => filterArticles(searchIndex, { query, tag: activeTag }),
    [activeTag, query, searchIndex]
  );
  const isFiltering = Boolean(query.trim()) || activeTag !== "all";
  const resultSummary = `${filteredArticles.length} / ${articles.length}`;

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
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setQuery("");
                  }
                }}
                placeholder={copy.articleSearchPlaceholder}
                aria-describedby="article-search-summary"
              />
            </label>
            <div className="tag-row">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip tag-chip--button ${activeTag === tag ? "active" : ""}`}
                  aria-pressed={activeTag === tag}
                  onClick={() => setActiveTag(tag)}
                >
                  {tag === "all" ? copy.allTags : `${tag} · ${tagCountMap.get(tag)}`}
                </button>
              ))}
            </div>
            <p id="article-search-summary" className="article-tools__summary" aria-live="polite">
              {resultSummary}
              {isFiltering ? (
                <button type="button" className="tag-chip tag-chip--button" onClick={() => setSearchParams({}, { replace: true })} aria-label="Clear search and tag filter">
                  ×
                </button>
              ) : null}
            </p>
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
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuery("");
              }
            }}
            placeholder={copy.articleSearchPlaceholder}
            aria-describedby="article-search-summary"
          />
        </label>
        <div className="tag-row">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-chip tag-chip--button ${activeTag === tag ? "active" : ""}`}
              aria-pressed={activeTag === tag}
              onClick={() => setActiveTag(tag)}
            >
              {tag === "all" ? copy.allTags : `${tag} · ${tagCountMap.get(tag)}`}
            </button>
          ))}
        </div>
        <p id="article-search-summary" className="article-tools__summary" aria-live="polite">
          {resultSummary}
          {isFiltering ? (
            <button type="button" className="tag-chip tag-chip--button" onClick={() => setSearchParams({}, { replace: true })} aria-label="Clear search and tag filter">
              ×
            </button>
          ) : null}
        </p>
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
                <span>{articleReadingTime(article, language)}</span>
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

// Each part of a compound tag ("ESSAY / DIRECTION") links to the filtered article index.
function ArticleTagLinks({ tag }) {
  const parts = splitTags(tag);
  if (!parts.length) {
    return null;
  }
  return parts.map((part, index) => (
    <span key={part}>
      {index > 0 ? " / " : null}
      <Link className="article-tag-link" to={`/articles?tag=${encodeURIComponent(part)}`}>
        {part}
      </Link>
    </span>
  ));
}

function ArticleDetailPage(props) {
  const { slug } = useParams();
  const { articles } = props;
  const article = useMemo(
    () => articles.find((item) => item.slug === slug) ?? articles[0],
    [articles, slug]
  );

  // Resolve the article before rendering the reading room so its hooks always
  // run in the same order (previously an early return sat between hooks).
  if (!article) {
    return null;
  }

  return <ArticleDetailContent {...props} article={article} />;
}

function ArticleDetailContent({ language, copy, articles, meta, isXFlow, article }) {
  const { slug } = useParams();
  // 每篇文章都有独立阅读室状态，记录高亮、收藏、批注和阅读位置。
  const articleStorageKey = `template-reading-room:${slug || "article"}`;
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
    type: "article",
    publishedTime: article ? parseArticleDate(article.date).toISOString() : "",
    modifiedTime: article?.updatedAt || "",
  });

  const localizedContent = article.content[language] || "";
  const { rendered, remainingAttachments } = renderArticleContent(localizedContent, article.attachments, copy);
  const sections = extractArticleSections(localizedContent);
  const footnotes = article.footnotes?.[language]?.length ? article.footnotes[language] : article.footnotes?.en || [];

  useEffect(() => {
    const stored = readStoredJson(window.localStorage.getItem(articleStorageKey), {});
    setParagraphState({
      highlights: stored.highlights || {},
      favorites: stored.favorites || {},
      notes: stored.notes || {},
      scrollY: Number(stored.scrollY) || 0,
    });
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
            <p className="micro-label"><ArticleTagLinks tag={article.tag} /></p>
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
                    <a
                      key={section.id}
                      className={`toc-link level-${section.level}`}
                      href={`#${section.id}`}
                      onClick={(event) => scrollToInPageAnchor(event, section.id)}
                    >
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
        <p className="micro-label"><ArticleTagLinks tag={article.tag} /></p>
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
                  <a
                      key={section.id}
                      className={`toc-link level-${section.level}`}
                      href={`#${section.id}`}
                      onClick={(event) => scrollToInPageAnchor(event, section.id)}
                    >
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

export default function App() {
  const { theme, setTheme, language, setLanguage, font, setFont } = usePreferences();
  const { palette, setPalette } = usePalette();
  const [previewBackground, setPreviewBackground] = useState(null);
  const [backgroundPresetOverride, setBackgroundPresetOverride] = useState(null);
  const copy = getCopy(language);
  const { articles, projects, siteContent, entries, saveArticle, deleteArticle, saveProject, deleteProject, saveContent, addEntry, studioAvailable } = useBackendContent();
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
            <Suspense fallback={<main className="page"><div className="glass-card empty-state">…</div></main>}>
            <StudioPage
              language={language}
              copy={copy}
              articles={articles}
              saveArticle={saveArticle}
              deleteArticle={deleteArticle}
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
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Shell>
    </>
  );
}




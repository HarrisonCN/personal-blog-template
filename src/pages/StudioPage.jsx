// The studio editor. Lazy-loaded so visitors never download it.
// Extracted from App.jsx.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { languages } from "../data/siteContent";
import { EDITABLE_TEXT_KEYS, STUDIO_BACKGROUND_PRESETS, cloneArticle, cloneProject, contentHasAttachment, createBlankArticle, createBlankCustomCard, createBlankPinnedSpace, createBlankProject, createBlankSocialLink, ensureLocalizedMap, fileToAttachment, formatRelativeTime, insertAttachmentIntoContent, normalizeSiteContent, slugify } from "../lib/content";
import { getReadingRoomSnapshot, pushRecentEdit } from "../lib/storage";
import { getExperienceCopy } from "../lib/experienceCopy";
import { AttachmentBlock, renderArticleContent } from "../components/ArticleContent";
import { useReadingProgress, useStudioBackgroundPreview } from "../hooks/studio";

export default function StudioPage({
  language,
  copy,
  articles,
  saveArticle,
  deleteArticle,
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
    if (result.slug && result.slug !== nextSlug) {
      nextSlug = result.slug;
      nextDraft.slug = result.slug;
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

  const handleDeleteArticle = async () => {
    if (selectedSlug === "__new__" || !window.confirm(copy.deleteArticleConfirm)) {
      return;
    }
    const deletedSlug = selectedSlug;
    const result = await deleteArticle(deletedSlug);
    if (!result.ok && result.reason !== "not_found") {
      setFlash(result.reason === "unauthorized" ? copy.sessionExpired : "Studio save is unavailable without the backend server.");
      window.setTimeout(() => setFlash(""), 1800);
      return;
    }
    const next = articles.find((item) => item.slug !== deletedSlug);
    setSelectedSlug(next ? next.slug : "__new__");
    setFlash(copy.articleDeleted);
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
    if (result.slug && result.slug !== nextSlug) {
      nextSlug = result.slug;
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
              {selectedSlug !== "__new__" ? (
                <button type="button" className="action-button action-button--secondary" onClick={handleDeleteArticle}>
                  {copy.deleteArticle}
                </button>
              ) : null}
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

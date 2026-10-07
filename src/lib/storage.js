// localStorage helpers: recent trails and reading-room snapshots.
// Extracted from App.jsx.

export function readStoredArray(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 本地缓存键：用于记录用户在站内的访问、阅读和编辑轨迹。
export const RECENT_ACCESS_STORAGE_KEY = "template-recent-access";
export const RECENT_READING_STORAGE_KEY = "template-recent-reading";
export const RECENT_EDITING_STORAGE_KEY = "template-recent-editing";
// 安全读取 JSON：浏览器本地缓存一旦被旧版本或手动修改写坏，不能让整页直接崩掉。
export function readStoredJson(rawValue, fallback) {
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}

// 读取最近轨迹：站内控制中心会复用这组读取/写入逻辑。
export function getStoredTrail(storageKey) {
  return readStoredJson(window.localStorage.getItem(storageKey), []);
}

export function pushStoredTrail(storageKey, entry, limit = 8) {
  const current = getStoredTrail(storageKey).filter((item) => item.path !== entry.path);
  const next = [entry, ...current].slice(0, limit);
  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

export function getRecentAccesses() {
  return getStoredTrail(RECENT_ACCESS_STORAGE_KEY);
}

export function getRecentReadings() {
  return getStoredTrail(RECENT_READING_STORAGE_KEY);
}

export function getRecentEdits() {
  return getStoredTrail(RECENT_EDITING_STORAGE_KEY);
}

export function pushRecentAccess(entry) {
  // 去重后只保留最近几条浏览记录，方便命令面板作为站内中枢使用。
  const current = getRecentAccesses().filter((item) => item.path !== entry.path);
  const next = [entry, ...current].slice(0, 8);
  window.localStorage.setItem(RECENT_ACCESS_STORAGE_KEY, JSON.stringify(next));
}

export function pushRecentReading(entry) {
  pushStoredTrail(RECENT_READING_STORAGE_KEY, entry, 10);
}

export function pushRecentEdit(entry) {
  pushStoredTrail(RECENT_EDITING_STORAGE_KEY, entry, 10);
}

// 读取单篇文章的阅读室状态，供文章页和开发者编辑之间同步批注。
export function getReadingRoomSnapshot(slug) {
  if (!slug) {
    return { highlights: {}, favorites: {}, notes: {}, scrollY: 0 };
  }
  const stored = readStoredJson(window.localStorage.getItem(`template-reading-room:${slug}`), {});
  return {
    highlights: stored.highlights || {},
    favorites: stored.favorites || {},
    notes: stored.notes || {},
    scrollY: Number(stored.scrollY) || 0,
  };
}

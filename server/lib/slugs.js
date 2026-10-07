// Slug helpers shared by the article and project studio routes.

const SLUG_MAX = 64;

/** Lowercase ASCII slug made of a-z, 0-9 and single hyphens (matches the studio's slugify). */
export function sanitizeSlug(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

/**
 * Returns `base` or `base-2`, `base-3`, ... so it does not collide with any
 * slug in `existingSlugs` other than `ownSlug` (the item being edited).
 */
export function uniqueSlug(base, existingSlugs, ownSlug = null) {
  const taken = new Set([...existingSlugs].filter((slug) => slug && slug !== ownSlug));
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base.slice(0, SLUG_MAX - String(suffix).length - 1)}-${suffix}`)) {
    suffix += 1;
  }
  return `${base.slice(0, SLUG_MAX - String(suffix).length - 1)}-${suffix}`;
}

/**
 * Resolve the slug for an item being saved.
 * - `requested` is the slug the client asked for (or a title to derive one from).
 * - `previousSlug` identifies the existing item being edited, if any.
 * Returns { slug, existingIndex }.
 */
export function resolveSlug({ items, requested, fallbackTitle, previousSlug, prefix }) {
  const existingIndex = previousSlug ? items.findIndex((item) => item.slug === previousSlug) : -1;
  const ownSlug = existingIndex >= 0 ? items[existingIndex].slug : null;
  let base = sanitizeSlug(requested) || sanitizeSlug(fallbackTitle);
  if (!base) {
    base = ownSlug || `${prefix}-${Date.now()}`;
  }
  // Keep the stored slug untouched when the editor sends it back unchanged,
  // even if it predates the sanitiser (e.g. hand-edited store.json).
  if (ownSlug && requested === ownSlug) {
    return { slug: ownSlug, existingIndex };
  }
  return { slug: uniqueSlug(base, items.map((item) => item.slug), ownSlug), existingIndex };
}

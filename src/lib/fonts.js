// On-demand Google Fonts loading.
//
// index.html used to request all 13 font families in one render-blocking
// stylesheet. Now only the families the active font preset needs are requested,
// as a non-blocking stylesheet injected at runtime (dynamically inserted <link>
// elements do not block rendering), always with font-display: swap.

const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com/css2";

// Keep in sync with the :root[data-font="..."] rules in styles.css.
export const FONT_FAMILIES = {
  outfit: ["Outfit:wght@300;400;500;700;800", "Space+Grotesk:wght@400;500;700"],
  manrope: ["Manrope:wght@400;500;700;800"],
  sora: ["Sora:wght@300;400;600;700;800"],
  serif: ["Cormorant+Garamond:wght@400;500;600;700"],
  space: ["Space+Grotesk:wght@400;500;700"],
  jakarta: ["Plus+Jakarta+Sans:wght@400;500;700;800"],
  dmsans: ["DM+Sans:wght@400;500;700"],
  urbanist: ["Urbanist:wght@400;500;700;800"],
  fraunces: ["Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700"],
  ibmplex: ["IBM+Plex+Sans:wght@400;500;600;700"],
  notosc: ["Noto+Sans+SC:wght@400;500;700"],
  lxgw: ["LXGW+WenKai:wght@400;700"],
  mashan: ["Ma+Shan+Zheng"],
};

export const DEFAULT_FONT = "outfit";

export function fontStylesheetUrl(code) {
  const families = FONT_FAMILIES[code] || FONT_FAMILIES[DEFAULT_FONT];
  return `${GOOGLE_FONTS_CSS}?${families.map((family) => `family=${family}`).join("&")}&display=swap`;
}

const requested = new Set();

/** Inject the stylesheet for a font preset once. Safe to call repeatedly. */
export function loadFont(code) {
  if (typeof document === "undefined") {
    return;
  }
  const key = FONT_FAMILIES[code] ? code : DEFAULT_FONT;
  if (requested.has(key)) {
    return;
  }
  requested.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = fontStylesheetUrl(key);
  link.dataset.font = key;
  document.head.appendChild(link);
}

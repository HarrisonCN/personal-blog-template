// Palette colour helpers.
// Extracted from App.jsx.

export const LEGACY_PALETTES = {
  ocean: { h: 198, s: 49, v: 100 },
  mint: { h: 154, s: 56, v: 91 },
  rose: { h: 336, s: 46, v: 100 },
  mono: { h: 217, s: 15, v: 85 },
};
export const DEFAULT_PALETTE = { h: 198, s: 30, v: 100 };
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function hsvToRgb(h, s, v) {
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

export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function hsvToHex(h, s, v) {
  return rgbToHex(hsvToRgb(h, s, v));
}

export function parseStoredPalette(value) {
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

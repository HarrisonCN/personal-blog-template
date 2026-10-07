import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PALETTE, LEGACY_PALETTES, clamp, hsvToHex, hsvToRgb, parseStoredPalette, rgbToHex } from "../src/lib/color.js";
import { normalizeSearchText, tokenizeQuery } from "../src/lib/articleSearch.js";
import { hashRouteForPath, redirectPathToHashRoute } from "../src/lib/legacyPathRedirect.js";
import {
  RECENT_ACCESS_STORAGE_KEY,
  getReadingRoomSnapshot,
  getRecentAccesses,
  getRecentReadings,
  pushRecentAccess,
  pushRecentReading,
  readStoredArray,
  readStoredJson,
} from "../src/lib/storage.js";

function installFakeWindow() {
  const data = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (data.has(key) ? data.get(key) : null),
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: (key) => data.delete(key),
    },
  };
  return data;
}

test("hsvToRgb converts the primary hues and wraps the hue angle", () => {
  assert.deepEqual(hsvToRgb(0, 100, 100), { r: 255, g: 0, b: 0 });
  assert.deepEqual(hsvToRgb(120, 100, 100), { r: 0, g: 255, b: 0 });
  assert.deepEqual(hsvToRgb(240, 100, 100), { r: 0, g: 0, b: 255 });
  assert.deepEqual(hsvToRgb(360, 100, 100), hsvToRgb(0, 100, 100));
  assert.deepEqual(hsvToRgb(-120, 100, 100), hsvToRgb(240, 100, 100));
  assert.deepEqual(hsvToRgb(42, 0, 100), { r: 255, g: 255, b: 255 }, "no saturation is grey/white");
  assert.deepEqual(hsvToRgb(42, 100, 0), { r: 0, g: 0, b: 0 });
  assert.deepEqual(hsvToRgb(0, 500, -5), { r: 0, g: 0, b: 0 }, "inputs are clamped");
});

test("hex helpers produce lowercase 6-digit colours", () => {
  assert.equal(rgbToHex({ r: 1, g: 171, b: 255 }), "#01abff");
  assert.equal(hsvToHex(60, 100, 100), "#ffff00");
  assert.match(hsvToHex(DEFAULT_PALETTE.h, DEFAULT_PALETTE.s, DEFAULT_PALETTE.v), /^#[0-9a-f]{6}$/);
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
});

test("parseStoredPalette accepts legacy names and JSON, and never throws", () => {
  assert.equal(parseStoredPalette(null), DEFAULT_PALETTE);
  assert.equal(parseStoredPalette("ocean"), LEGACY_PALETTES.ocean);
  assert.deepEqual(parseStoredPalette('{"h":400,"s":-3,"v":50}'), { h: 360, s: 0, v: 50 });
  assert.equal(parseStoredPalette("{broken"), DEFAULT_PALETTE);
  assert.equal(parseStoredPalette('{"h":"1","s":2,"v":3}'), DEFAULT_PALETTE);
});

test("search text normalisation is case and width insensitive", () => {
  assert.equal(normalizeSearchText("GLASS"), "glass");
  assert.equal(normalizeSearchText("ＧＬＡＳＳ"), "glass", "full-width input matches");
  assert.deepEqual(tokenizeQuery("  liquid   GLASS "), ["liquid", "glass"]);
  assert.deepEqual(tokenizeQuery(""), []);
});

test("hashRouteForPath ignores unrelated paths", () => {
  assert.equal(hashRouteForPath("/about"), null);
  assert.equal(hashRouteForPath("/articles/"), "/#/articles");
});

test("redirectPathToHashRoute rewrites clean share URLs only", () => {
  const calls = [];
  const history = { replaceState: (...args) => calls.push(args[2]) };
  redirectPathToHashRoute({ pathname: "/articles/a", search: "", hash: "" }, history);
  redirectPathToHashRoute({ pathname: "/", search: "", hash: "" }, history);
  assert.deepEqual(calls, ["/#/articles/a"]);
});

test("storage helpers survive corrupt localStorage and de-duplicate trails", (t) => {
  const data = installFakeWindow();
  t.after(() => delete globalThis.window);

  assert.deepEqual(readStoredJson("", "fallback"), "fallback");
  assert.deepEqual(readStoredJson("{bad", []), []);
  data.set("arr", '{"not":"an array"}');
  assert.deepEqual(readStoredArray("arr"), []);
  data.set("arr", "{bad");
  assert.deepEqual(readStoredArray("arr"), []);

  data.set(RECENT_ACCESS_STORAGE_KEY, "{corrupt");
  assert.deepEqual(getRecentAccesses(), []);
  for (let i = 0; i < 12; i += 1) {
    pushRecentAccess({ path: `/p${i}` });
  }
  pushRecentAccess({ path: "/p5", label: "again" });
  const accesses = getRecentAccesses();
  assert.equal(accesses.length, 8, "access trail keeps 8 entries");
  assert.deepEqual(accesses[0], { path: "/p5", label: "again" });
  assert.equal(accesses.filter((item) => item.path === "/p5").length, 1);

  for (let i = 0; i < 12; i += 1) {
    pushRecentReading({ path: `/r${i}` });
  }
  assert.equal(getRecentReadings().length, 10, "reading trail keeps 10 entries");
  assert.equal(getRecentReadings()[0].path, "/r11");
});

test("reading room snapshots default every field", (t) => {
  const data = installFakeWindow();
  t.after(() => delete globalThis.window);
  const empty = { highlights: {}, favorites: {}, notes: {}, scrollY: 0 };
  assert.deepEqual(getReadingRoomSnapshot(""), empty);
  assert.deepEqual(getReadingRoomSnapshot("missing"), empty);
  data.set("template-reading-room:a", JSON.stringify({ notes: { p1: "n" }, scrollY: "120" }));
  assert.deepEqual(getReadingRoomSnapshot("a"), { highlights: {}, favorites: {}, notes: { p1: "n" }, scrollY: 120 });
  data.set("template-reading-room:b", "{corrupt");
  assert.deepEqual(getReadingRoomSnapshot("b"), empty);
});

// Hooks shared by the article page and the studio.
// Extracted from App.jsx.
import { useEffect, useState } from "react";
import { normalizeBackgroundPreset } from "../lib/content";

export function useStudioBackgroundPreview(siteDraft, setPreviewBackground) {
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

export function useReadingProgress() {
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

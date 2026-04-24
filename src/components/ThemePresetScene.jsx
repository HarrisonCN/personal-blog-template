import { useEffect, useRef } from "react";
import { gsap } from "gsap";

function drawThemeCanvas(context, width, height, mode, time, pointer) {
  context.clearRect(0, 0, width, height);

  if (mode === "aurora") {
    context.fillStyle = document.documentElement.dataset.theme === "light" ? "#ffffff" : "#000000";
    context.fillRect(0, 0, width, height);
    return;
  }

  if (mode === "sunset") {
    const bg = context.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#f7f2ef");
    bg.addColorStop(1, "#efe9f8");
    context.fillStyle = bg;
    context.fillRect(0, 0, width, height);

    for (let i = 0; i < 5; i += 1) {
      const x = width * (0.18 + i * 0.18) + Math.sin(time * 0.4 + i) * 20 + pointer.x * 0.02;
      const y = height * (0.2 + (i % 2) * 0.2) + Math.cos(time * 0.45 + i) * 14 + pointer.y * 0.02;
      const r = 90 + i * 16;
      const glow = context.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, i % 2 === 0 ? "rgba(124, 165, 255, 0.22)" : "rgba(255, 177, 211, 0.2)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = glow;
      context.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return;
  }

  const bg = context.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#f2f7ff");
  bg.addColorStop(1, "#edf1f6");
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(81, 109, 152, 0.11)";
  context.lineWidth = 1;
  const step = Math.max(34, Math.floor(width / 32));
  for (let x = 0; x < width + step; x += step) {
    context.beginPath();
    context.moveTo(x + pointer.x * 0.015, 0);
    context.lineTo(x - pointer.x * 0.015, height);
    context.stroke();
  }
  for (let y = 0; y < height + step; y += step) {
    context.beginPath();
    context.moveTo(0, y + pointer.y * 0.012);
    context.lineTo(width, y - pointer.y * 0.012);
    context.stroke();
  }
}

function PayFlowSvg() {
  return (
    <svg className="theme-scene__svg theme-scene__svg--payflow" viewBox="0 0 1200 720" aria-hidden="true">
      <defs>
        <filter id="payflow-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="18" result="blur" />
          <feOffset dy="24" result="offset" />
          <feColorMatrix in="offset" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .18 0" />
          <feBlend in="SourceGraphic" />
        </filter>
      </defs>
      <g filter="url(#payflow-shadow)">
        <rect x="180" y="198" rx="34" ry="34" width="374" height="214" fill="#f7f4f5" />
        <rect x="198" y="214" rx="26" ry="26" width="92" height="188" fill="#1f2024" />
        <rect x="460" y="222" rx="14" ry="14" width="86" height="32" fill="#3f73ff" />
        <rect x="618" y="240" rx="30" ry="30" width="190" height="262" fill="#f7f4f5" />
        <rect x="878" y="168" rx="42" ry="42" width="132" height="312" fill="#1d1f24" />
        <rect x="894" y="188" rx="28" ry="28" width="100" height="272" fill="#f5f2f4" />
      </g>
    </svg>
  );
}

function WalletAirSvg() {
  return (
    <svg className="theme-scene__svg theme-scene__svg--wallet" viewBox="0 0 1200 720" aria-hidden="true">
      <circle cx="220" cy="180" r="88" fill="rgba(113,155,255,0.18)" />
      <circle cx="980" cy="140" r="72" fill="rgba(255,153,206,0.16)" />
      <rect x="206" y="232" rx="40" ry="40" width="320" height="220" fill="#ffffff" opacity="0.92" />
      <rect x="580" y="172" rx="48" ry="48" width="220" height="320" fill="#ffffff" opacity="0.88" />
      <rect x="850" y="250" rx="42" ry="42" width="156" height="220" fill="#f7f4ff" opacity="0.92" />
    </svg>
  );
}

function DataGridSvg() {
  return (
    <svg className="theme-scene__svg theme-scene__svg--datagrid" viewBox="0 0 1200 720" aria-hidden="true">
      <rect x="120" y="120" rx="26" ry="26" width="420" height="220" fill="rgba(255,255,255,0.88)" />
      <rect x="580" y="120" rx="26" ry="26" width="500" height="120" fill="rgba(255,255,255,0.84)" />
      <rect x="580" y="274" rx="26" ry="26" width="236" height="280" fill="rgba(255,255,255,0.88)" />
      <rect x="844" y="274" rx="26" ry="26" width="236" height="280" fill="rgba(255,255,255,0.88)" />
    </svg>
  );
}

export default function ThemePresetScene({ mode }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let frame = 0;

    const resize = () => {
      const width = root.clientWidth || window.innerWidth;
      const height = root.clientHeight || window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();

    const floats = root.querySelectorAll(".theme-scene__float");
    const slabs = root.querySelectorAll(".theme-scene__slab");
    const cards = root.querySelectorAll(".theme-scene__card");

    gsap.set(slabs, { transformPerspective: 1200 });
    gsap.to(floats, {
      y: (_, node) => Number(node.dataset.floatY || 18),
      x: (_, node) => Number(node.dataset.floatX || 0),
      duration: (_, node) => Number(node.dataset.duration || 3.6),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.18,
    });

    gsap.to(cards, {
      y: -8,
      duration: 2.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.14,
    });

    const moveSlabs = (x, y) => {
      slabs.forEach((node, index) => {
        gsap.to(node, {
          rotateX: y * (2.8 + index * 0.2),
          rotateY: -x * (4 + index * 0.3),
          x: x * (16 + index * 3),
          y: y * (12 + index * 2),
          duration: 0.5,
          ease: "power3.out",
          overwrite: true,
        });
      });
    };

    const handleMove = (event) => {
      const rect = root.getBoundingClientRect();
      target.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
      target.y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
      moveSlabs(target.x, target.y);
    };

    const handleLeave = () => {
      target.x = 0;
      target.y = 0;
      moveSlabs(0, 0);
    };

    root.addEventListener("pointermove", handleMove, { passive: true });
    root.addEventListener("pointerleave", handleLeave);
    window.addEventListener("resize", resize);

    const render = (timestamp) => {
      frame = window.requestAnimationFrame(render);
      pointer.x += (target.x * root.clientWidth * 0.18 - pointer.x) * 0.08;
      pointer.y += (target.y * root.clientHeight * 0.18 - pointer.y) * 0.08;
      drawThemeCanvas(context, root.clientWidth, root.clientHeight, mode, timestamp * 0.001, pointer);
    };

    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", handleMove);
      root.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("resize", resize);
      gsap.killTweensOf(floats);
      gsap.killTweensOf(cards);
      gsap.killTweensOf(slabs);
    };
  }, [mode]);

  return (
    <div className={`theme-scene theme-scene--${mode}`} ref={rootRef} aria-hidden="true">
      <canvas className="theme-scene__canvas" ref={canvasRef} />
      {mode === "aurora" ? <PayFlowSvg /> : null}
      {mode === "sunset" ? <WalletAirSvg /> : null}
      {mode === "ice" ? <DataGridSvg /> : null}
      <div className="theme-scene__slab theme-scene__slab--a theme-scene__float" data-float-y="18" data-duration="3.8" />
      <div className="theme-scene__slab theme-scene__slab--b theme-scene__float" data-float-y="14" data-float-x="10" data-duration="4.2" />
      <div className="theme-scene__slab theme-scene__slab--c theme-scene__float" data-float-y="22" data-float-x="-12" data-duration="4.8" />
      <div className="theme-scene__card theme-scene__card--a" />
      <div className="theme-scene__card theme-scene__card--b" />
    </div>
  );
}

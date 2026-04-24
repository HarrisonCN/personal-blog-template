import { useEffect, useRef } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createLattice(width, height) {
  const points = [];
  const cols = Math.max(12, Math.floor(width / 120));
  const rows = Math.max(8, Math.floor(height / 110));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      points.push({
        x: ((x + 0.5) / cols) * width,
        y: ((y + 0.5) / rows) * height,
        seed: Math.random() * Math.PI * 2,
      });
    }
  }
  return points;
}

function createShards(width, height) {
  return Array.from({ length: 18 }, (_, index) => ({
    x: ((index * 83) % width) + Math.random() * 80,
    y: ((index * 137) % height) + Math.random() * 60,
    size: 40 + (index % 5) * 18,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.006,
    driftX: (Math.random() - 0.5) * 0.6,
    driftY: (Math.random() - 0.5) * 0.6,
  }));
}

function createDust(count, width, height) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 1 + Math.random() * 2.4,
    speed: 0.2 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
  }));
}

function drawMagneticLattice(context, width, height, pointer, time, state) {
  context.fillStyle = "#09131d";
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, Math.min(width, height) * 0.32);
  glow.addColorStop(0, "rgba(143, 216, 255, 0.24)");
  glow.addColorStop(1, "rgba(143, 216, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  const warped = state.points.map((point, index) => {
    const wave = Math.sin(time * 0.9 + point.seed + index * 0.02) * 8;
    const dx = point.x - pointer.x;
    const dy = point.y - pointer.y;
    const dist = Math.hypot(dx, dy);
    const pull = clamp(1 - dist / 220, 0, 1);
    return {
      x: point.x + Math.cos(time * 0.4 + point.seed) * 6 - dx * pull * 0.18,
      y: point.y + Math.sin(time * 0.45 + point.seed) * 6 - dy * pull * 0.18 + wave * 0.08,
      glow: pull,
    };
  });

  context.strokeStyle = "rgba(120, 186, 255, 0.14)";
  context.lineWidth = 1;
  for (let i = 0; i < warped.length; i += 1) {
    for (let j = i + 1; j < warped.length; j += 1) {
      const dx = warped[i].x - warped[j].x;
      const dy = warped[i].y - warped[j].y;
      const dist = Math.hypot(dx, dy);
      if (dist < 130) {
        context.globalAlpha = 1 - dist / 130;
        context.beginPath();
        context.moveTo(warped[i].x, warped[i].y);
        context.lineTo(warped[j].x, warped[j].y);
        context.stroke();
      }
    }
  }
  context.globalAlpha = 1;

  warped.forEach((point) => {
    context.fillStyle = `rgba(232, 245, 255, ${0.3 + point.glow * 0.65})`;
    context.beginPath();
    context.arc(point.x, point.y, 1.6 + point.glow * 2.8, 0, Math.PI * 2);
    context.fill();
  });

  context.strokeStyle = "rgba(214, 237, 255, 0.22)";
  context.lineWidth = 1.25;
  context.beginPath();
  context.arc(pointer.x, pointer.y, 40 + Math.sin(time * 2.2) * 10, 0, Math.PI * 2);
  context.stroke();
}

function drawNeonFluid(context, width, height, pointer, time, state) {
  const isLight = document.documentElement.dataset.theme === "light";
  context.fillStyle = isLight ? "#ffffff" : "#000000";
  context.fillRect(0, 0, width, height);
  const glowStrength = isLight ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)";
  const rimStrength = isLight ? "rgba(255, 255, 255, 0.94)" : "rgba(255, 255, 255, 0.08)";
  const shadowStrength = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(0, 0, 0, 0.48)";

  const drawShadowPlate = (x, y, w, h, blur, alpha) => {
    context.save();
    context.filter = `blur(${blur}px)`;
    context.fillStyle = isLight ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.28})`;
    context.beginPath();
    context.roundRect(x, y, w, h, h / 2);
    context.fill();
    context.restore();
  };

  const drawChunk = (x, y, w, h, depth, radius, tint = 0) => {
    const face = isLight
      ? `rgba(${248 - tint}, ${248 - tint}, ${248 - tint}, 1)`
      : `rgba(${26 + tint}, ${26 + tint}, ${28 + tint}, 1)`;
    const top = isLight
      ? `rgba(${255 - tint}, ${255 - tint}, ${255 - tint}, 1)`
      : `rgba(${48 + tint}, ${48 + tint}, ${52 + tint}, 1)`;
    const side = isLight
      ? `rgba(${222 - tint}, ${222 - tint}, ${224 - tint}, 1)`
      : `rgba(${14 + tint}, ${14 + tint}, ${18 + tint}, 1)`;

    drawShadowPlate(x + depth * 0.6, y + h + depth * 0.35, w * 0.92, h * 0.18, 18, isLight ? 0.12 : 0.18);

    context.save();
    context.shadowBlur = 26;
    context.shadowColor = shadowStrength;
    context.shadowOffsetY = 22;

    context.beginPath();
    context.moveTo(x + depth, y + h);
    context.lineTo(x + depth, y + h + depth);
    context.lineTo(x + w + depth, y + h + depth);
    context.lineTo(x + w + depth, y + depth);
    context.lineTo(x + w, y);
    context.lineTo(x + w, y + h);
    context.closePath();
    context.fillStyle = side;
    context.fill();

    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + depth, y - depth);
    context.lineTo(x + w + depth, y - depth);
    context.lineTo(x + w, y);
    context.closePath();
    context.fillStyle = top;
    context.fill();

    context.beginPath();
    context.roundRect(x, y, w, h, radius);
    context.fillStyle = face;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = rimStrength;
    context.stroke();
    context.restore();
  };

  const driftX = (pointer.x - width / 2) * 0.018;
  const driftY = (pointer.y - height / 2) * 0.018;
  const baseY = height * 0.68;
  drawChunk(width * 0.16 + driftX * 1.8, baseY + driftY * 0.7, width * 0.18, height * 0.11, 26, 24, 0);
  drawChunk(width * 0.42 - driftX * 0.6, height * 0.26 + driftY * 0.6, width * 0.22, height * 0.15, 22, 28, 8);
  drawChunk(width * 0.68 + driftX * 1.2, height * 0.18 - driftY * 0.4, width * 0.12, height * 0.28, 20, 30, 18);
  drawChunk(width * 0.58 - driftX * 1.4, height * 0.56 + driftY * 0.3, width * 0.16, height * 0.09, 18, 22, 12);

  const softGlow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, Math.min(width, height) * 0.18);
  softGlow.addColorStop(0, glowStrength);
  softGlow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = softGlow;
  context.fillRect(0, 0, width, height);
}

function drawSolarDunes(context, width, height, pointer, time, state) {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#1d2841");
  sky.addColorStop(0.45, "#8d556a");
  sky.addColorStop(1, "#1a1625");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const sunX = width * 0.5 + (pointer.x - width / 2) * 0.12;
  const sunY = height * 0.24 + (pointer.y - height / 2) * 0.08;
  const sun = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.min(width, height) * 0.24);
  sun.addColorStop(0, "rgba(255, 242, 210, 0.92)");
  sun.addColorStop(0.22, "rgba(255, 188, 130, 0.64)");
  sun.addColorStop(1, "rgba(255, 188, 130, 0)");
  context.fillStyle = sun;
  context.fillRect(0, 0, width, height);

  const dunes = ["#5e3554", "#392845", "#261d34"];
  dunes.forEach((color, layer) => {
    const baseY = height * (0.62 + layer * 0.1);
    context.beginPath();
    context.moveTo(0, height);
    for (let x = 0; x <= width; x += 20) {
      const drag = clamp(1 - Math.abs(x - pointer.x) / 260, 0, 1);
      const y =
        baseY +
        Math.sin(x * 0.006 + time * (0.5 + layer * 0.12) + layer) * (28 + layer * 18) +
        Math.cos(x * 0.003 + time * 0.4 + layer) * 12 -
        drag * (pointer.y - height * 0.58) * (0.18 + layer * 0.05);
      context.lineTo(x, y);
    }
    context.lineTo(width, height);
    context.closePath();
    context.fillStyle = color;
    context.fill();
  });

  context.fillStyle = "rgba(255, 232, 208, 0.18)";
  for (let i = 0; i < state.dust.length; i += 1) {
    const dot = state.dust[i];
    const x = dot.x + Math.sin(time * dot.speed + dot.phase) * 30;
    const y = dot.y + Math.cos(time * dot.speed + dot.phase) * 12 - (pointer.y - height / 2) * 0.03;
    context.beginPath();
    context.arc(x, y, dot.size, 0, Math.PI * 2);
    context.fill();
  }

  const mirage = context.createLinearGradient(0, pointer.y - 90, 0, pointer.y + 90);
  mirage.addColorStop(0, "rgba(255,255,255,0)");
  mirage.addColorStop(0.5, "rgba(255,230,214,0.12)");
  mirage.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = mirage;
  context.fillRect(0, pointer.y - 110, width, 220);
}

function drawCrystalStorm(context, width, height, pointer, time, state) {
  const bg = context.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#081522");
  bg.addColorStop(1, "#0b1c2d");
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  const beam = context.createLinearGradient(pointer.x - 180, 0, pointer.x + 180, height);
  beam.addColorStop(0, "rgba(255,255,255,0)");
  beam.addColorStop(0.5, "rgba(198, 243, 255, 0.22)");
  beam.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = beam;
  context.fillRect(pointer.x - 220, 0, 440, height);

  state.shards.forEach((shard, index) => {
    const dx = shard.x - pointer.x;
    const dy = shard.y - pointer.y;
    const dist = Math.max(40, Math.hypot(dx, dy));
    const repel = clamp(1 - dist / 220, 0, 1);
    const x = shard.x + Math.cos(time * 0.7 + index) * shard.driftX * 40 + (dx / dist) * repel * 36;
    const y = shard.y + Math.sin(time * 0.8 + index) * shard.driftY * 40 + (dy / dist) * repel * 36;
    const rotation = shard.angle + time * shard.spin * 60;

    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.beginPath();
    context.moveTo(-shard.size * 0.22, -shard.size * 0.82);
    context.lineTo(shard.size * 0.76, -shard.size * 0.06);
    context.lineTo(shard.size * 0.18, shard.size * 0.84);
    context.lineTo(-shard.size * 0.74, shard.size * 0.14);
    context.closePath();
    context.fillStyle = `rgba(210, 244, 255, ${0.08 + repel * 0.16})`;
    context.strokeStyle = `rgba(232, 248, 255, ${0.14 + repel * 0.3})`;
    context.lineWidth = 1.1;
    context.fill();
    context.stroke();
    context.restore();
  });

  const flare = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 180);
  flare.addColorStop(0, "rgba(232,248,255,0.18)");
  flare.addColorStop(1, "rgba(232,248,255,0)");
  context.fillStyle = flare;
  context.fillRect(0, 0, width, height);
}

export default function InteractiveSceneBackground({ mode }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    let frame = 0;
    let width = 0;
    let height = 0;
    let state = {};
    const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    const target = { x: pointer.x, y: pointer.y };

    const hydrate = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      state = {
        points: createLattice(width, height),
        shards: createShards(width, height),
        dust: createDust(mode === "aurora" ? 24 : 18, width, height),
      };
    };

    const handleResize = () => {
      hydrate();
    };

    const handlePointerMove = (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
    };

    hydrate();
    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const render = (timestamp) => {
      frame = window.requestAnimationFrame(render);
      pointer.x += (target.x - pointer.x) * 0.12;
      pointer.y += (target.y - pointer.y) * 0.12;
      const time = timestamp * 0.001;

      if (mode === "aurora") {
        drawNeonFluid(context, width, height, pointer, time, state);
      } else if (mode === "sunset") {
        drawSolarDunes(context, width, height, pointer, time, state);
      } else if (mode === "ice") {
        drawCrystalStorm(context, width, height, pointer, time, state);
      } else {
        drawMagneticLattice(context, width, height, pointer, time, state);
      }
    };

    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [mode]);

  return <canvas className="site-background__scene-canvas" ref={canvasRef} aria-hidden="true" />;
}

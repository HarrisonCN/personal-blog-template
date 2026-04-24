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

  const points = state.points;
  const warped = points.map((point, index) => {
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
  const bg = context.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#050f18");
  bg.addColorStop(1, "#08131d");
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  const ribbons = [
    { color: "rgba(88, 255, 223, 0.24)", offset: -90, amp: 120, speed: 1.2 },
    { color: "rgba(75, 140, 255, 0.2)", offset: 0, amp: 145, speed: 0.95 },
    { color: "rgba(255, 124, 220, 0.16)", offset: 90, amp: 104, speed: 1.05 },
  ];

  ribbons.forEach((ribbon, index) => {
    context.beginPath();
    const baseY = height * 0.42 + ribbon.offset + (pointer.y - height / 2) * (0.12 + index * 0.02);
    for (let x = -60; x <= width + 60; x += 18) {
      const influence = clamp(1 - Math.abs(x - pointer.x) / 240, 0, 1);
      const y =
        baseY +
        Math.sin(x * 0.008 + time * ribbon.speed + index) * ribbon.amp +
        Math.cos(x * 0.004 + time * 0.7 + index) * 36 -
        influence * (pointer.y - height / 2) * 0.16;
      if (x === -60) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.lineTo(width + 60, height + 240);
    context.lineTo(-60, height + 240);
    context.closePath();
    context.fillStyle = ribbon.color;
    context.filter = "blur(26px)";
    context.fill();
    context.filter = "none";
  });

  state.dust.forEach((dot, index) => {
    const x = dot.x + Math.sin(time * dot.speed + dot.phase) * 24 + (pointer.x - width / 2) * 0.03;
    const y = dot.y + Math.cos(time * dot.speed * 1.1 + dot.phase) * 18 + (pointer.y - height / 2) * 0.02;
    context.fillStyle = index % 5 === 0 ? "rgba(255, 182, 229, 0.6)" : "rgba(220, 247, 255, 0.56)";
    context.beginPath();
    context.arc(x, y, dot.size, 0, Math.PI * 2);
    context.fill();
  });

  const halo = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 240);
  halo.addColorStop(0, "rgba(238, 249, 255, 0.18)");
  halo.addColorStop(0.4, "rgba(138, 255, 228, 0.12)");
  halo.addColorStop(1, "rgba(138, 255, 228, 0)");
  context.fillStyle = halo;
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

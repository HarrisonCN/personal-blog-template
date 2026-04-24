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
  const bg = context.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#f6f2f1");
  bg.addColorStop(0.5, "#eee8ea");
  bg.addColorStop(1, "#e7e1e5");
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  const beamA = context.createLinearGradient(0, 0, width, height);
  beamA.addColorStop(0, "rgba(151, 157, 255, 0)");
  beamA.addColorStop(0.45, "rgba(165, 162, 255, 0.28)");
  beamA.addColorStop(1, "rgba(151, 157, 255, 0)");
  context.save();
  context.translate(pointer.x * 0.05, pointer.y * 0.02);
  context.rotate(-0.14);
  context.fillStyle = beamA;
  context.fillRect(-180, height * 0.14, width + 360, 20);
  context.restore();

  const beamB = context.createLinearGradient(0, 0, width, 0);
  beamB.addColorStop(0, "rgba(255, 208, 146, 0)");
  beamB.addColorStop(0.5, "rgba(255, 214, 149, 0.26)");
  beamB.addColorStop(1, "rgba(255, 208, 146, 0)");
  context.save();
  context.translate(-pointer.x * 0.03, pointer.y * 0.03);
  context.rotate(0.46);
  context.fillStyle = beamB;
  context.fillRect(width * 0.18, -100, 20, height + 240);
  context.restore();

  const drawBlock = (x, y, w, h, depth, radius, face, side, top, edge, shadow) => {
    context.save();
    context.shadowBlur = shadow;
    context.shadowColor = "rgba(112, 100, 109, 0.16)";
    context.shadowOffsetY = 28;

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
    context.strokeStyle = edge;
    context.stroke();
    context.restore();
  };

  const drawSlot = (x, y, w, h, tone = "#d6d0d4") => {
    context.save();
    context.beginPath();
    context.roundRect(x, y, w, h, h / 2);
    context.fillStyle = tone;
    context.fill();
    context.beginPath();
    context.roundRect(x + 8, y + h * 0.36, Math.max(10, w - 16), Math.max(3, h * 0.24), h / 3);
    context.fillStyle = "rgba(255,255,255,0.8)";
    context.fill();
    context.restore();
  };

  const shiftX = (pointer.x - width / 2) * 0.05;
  const shiftY = (pointer.y - height / 2) * 0.04;

  const boardX = width * 0.15 + shiftX;
  const boardY = height * 0.22 + shiftY;
  const boardW = width * 0.37;
  const boardH = height * 0.34;

  drawBlock(boardX, boardY, boardW, boardH, 28, 30, "#f7f4f5", "#d5cfd4", "#ffffff", "rgba(255,255,255,0.96)", 48);
  drawBlock(boardX + 18, boardY + 14, boardW * 0.22, boardH * 0.9, 16, 22, "#2f3038", "#1f2025", "#595a63", "rgba(255,255,255,0.08)", 18);
  drawBlock(boardX + boardW * 0.72, boardY + 18, boardW * 0.2, 40, 10, 12, "#4075ff", "#315cd4", "#7699ff", "rgba(255,255,255,0.18)", 14);

  context.fillStyle = "rgba(255,255,255,0.95)";
  context.font = "12px sans-serif";
  context.fillText("Request payment", boardX + boardW * 0.755, boardY + 43);

  for (let tab = 0; tab < 4; tab += 1) {
    drawBlock(
      boardX + boardW * 0.29 + tab * (boardW * 0.095),
      boardY + 18,
      boardW * 0.075,
      16,
      4,
      8,
      "#f4f1f3",
      "#cbc7cb",
      "#ffffff",
      "rgba(255,255,255,0.84)",
      4
    );
  }

  for (let row = 0; row < 6; row += 1) {
    const y = boardY + 72 + row * 35;
    drawBlock(
      boardX + boardW * 0.28,
      y,
      boardW * 0.58,
      24,
      6,
      10,
      "#e7e2e6",
      "#cfcbcf",
      "#faf8f9",
      "rgba(255,255,255,0.8)",
      10
    );
    drawSlot(boardX + boardW * 0.31, y + 7, boardW * 0.1, 7);
    drawSlot(boardX + boardW * 0.45, y + 7, boardW * 0.08, 7);
    drawSlot(boardX + boardW * 0.58, y + 7, boardW * 0.12, 7);
  }

  for (let item = 0; item < 5; item += 1) {
    const y = boardY + 28 + item * 42;
    drawBlock(
      boardX + 24,
      y,
      boardW * 0.18,
      20,
      5,
      8,
      item === 0 ? "#f4cf2c" : "#f4f1f3",
      item === 0 ? "#cfab13" : "#d4cfd4",
      item === 0 ? "#ffe572" : "#ffffff",
      item === 0 ? "rgba(255,241,173,0.6)" : "rgba(255,255,255,0.84)",
      6
    );
    drawSlot(boardX + 38, y + 29, boardW * 0.11, 6, "rgba(255,255,255,0.82)");
  }

  const pedestalX = width * 0.16;
  const pedestalY = height * 0.72;
  drawBlock(
    pedestalX,
    pedestalY,
    width * 0.15,
    height * 0.08,
    24,
    24,
    "#4d4850",
    "#2d2a2f",
    "#7b767c",
    "rgba(255,255,255,0.16)",
    42
  );

  const payCardX = width * 0.47 - shiftX * 0.55;
  const payCardY = height * 0.29 - shiftY * 0.3;
  const payCardW = width * 0.16;
  const payCardH = height * 0.26;
  drawBlock(payCardX, payCardY, payCardW, payCardH, 18, 24, "#f7f4f5", "#d8d2d7", "#ffffff", "rgba(255,255,255,0.9)", 34);
  context.fillStyle = "#3e73ff";
  context.font = "bold 18px sans-serif";
  context.fillText("$135.95", payCardX + 32, payCardY + 42);
  drawSlot(payCardX + 30, payCardY + 58, payCardW * 0.58, 8);
  for (let i = 0; i < 3; i += 1) {
    drawBlock(
      payCardX + 24,
      payCardY + 70 + i * 38,
      payCardW * (i === 2 ? 0.7 : 0.62),
      22,
      6,
      10,
      i === 2 ? "#3f73ff" : "#d8d7dc",
      i === 2 ? "#2d56c8" : "#c2c1c7",
      i === 2 ? "#6d90ff" : "#f1eff2",
      "rgba(255,255,255,0.84)",
      10
    );
  }
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.fillText("Pay", payCardX + 60, payCardY + 147);
  drawSlot(payCardX + 36, payCardY + payCardH - 30, 26, 7, "#d8d4d7");
  drawSlot(payCardX + 72, payCardY + payCardH - 30, 26, 7, "#d8d4d7");
  drawSlot(payCardX + 108, payCardY + payCardH - 30, 26, 7, "#d8d4d7");

  const phoneX = width * 0.73 + shiftX * 0.45;
  const phoneY = height * 0.23 - shiftY * 0.4;
  const phoneW = width * 0.11;
  const phoneH = height * 0.38;
  drawBlock(phoneX, phoneY, phoneW, phoneH, 16, 30, "#2d2c33", "#1d1c22", "#5a5860", "rgba(255,255,255,0.16)", 32);
  drawBlock(phoneX + 14, phoneY + 20, phoneW * 0.79, phoneH * 0.9, 10, 20, "#ece7e8", "#d4d0d3", "#ffffff", "rgba(255,255,255,0.8)", 12);
  drawSlot(phoneX + 36, phoneY + 28, phoneW * 0.36, 8, "#d9d4d7");
  drawBlock(phoneX + 28, phoneY + 88, phoneW * 0.58, 52, 8, 14, "#3f73ff", "#305cd4", "#7094ff", "rgba(255,255,255,0.22)", 12);
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.font = "11px sans-serif";
  context.fillText("Pay by link", phoneX + 38, phoneY + 113);
  drawSlot(phoneX + 44, phoneY + phoneH - 42, phoneW * 0.42, 11, "#d8d3d6");

  state.dust.forEach((dot, index) => {
    const x = dot.x + Math.sin(time * dot.speed + dot.phase) * 14;
    const y = dot.y + Math.cos(time * dot.speed + dot.phase) * 10;
    context.fillStyle = index % 6 === 0 ? "rgba(255, 205, 133, 0.34)" : "rgba(132, 142, 255, 0.2)";
    context.beginPath();
    context.arc(x, y, dot.size, 0, Math.PI * 2);
    context.fill();
  });
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

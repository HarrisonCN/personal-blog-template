import { useEffect, useRef } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function drawBlueprint(context, width, height, pointer, time) {
  context.fillStyle = "#0b1420";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(180, 214, 255, 0.08)";
  context.lineWidth = 1;
  const step = 28;
  for (let x = 0; x <= width; x += step) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += step) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const nodes = 24;
  const cx = width * 0.5;
  const cy = height * 0.46;
  const radius = Math.min(width, height) * 0.26;
  context.strokeStyle = "rgba(120, 188, 255, 0.18)";
  context.lineWidth = 1.25;
  context.beginPath();
  for (let i = 0; i < nodes; i += 1) {
    const a = (i / nodes) * Math.PI * 2 + time * 0.04;
    const wobble = Math.sin(time * 0.9 + i) * 12;
    const x = cx + Math.cos(a) * (radius + wobble * 0.12);
    const y = cy + Math.sin(a) * (radius + wobble * 0.12);
    if (i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.closePath();
  context.stroke();

  const pulseX = pointer.x || cx;
  const pulseY = pointer.y || cy;
  const radial = context.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, Math.min(width, height) * 0.24);
  radial.addColorStop(0, "rgba(170, 225, 255, 0.22)");
  radial.addColorStop(1, "rgba(170, 225, 255, 0)");
  context.fillStyle = radial;
  context.fillRect(0, 0, width, height);

  for (let i = 0; i < nodes; i += 1) {
    const a = (i / nodes) * Math.PI * 2 + time * 0.04;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    const dist = Math.hypot(x - pulseX, y - pulseY);
    const glow = clamp(1 - dist / 220, 0, 1);
    context.fillStyle = glow > 0 ? `rgba(220,244,255,${0.5 + glow * 0.4})` : "rgba(210, 235, 255, 0.45)";
    context.beginPath();
    context.arc(x, y, 1.8 + glow * 2.2, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = "rgba(206, 234, 255, 0.14)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(pulseX, pulseY, 26 + Math.sin(time * 2.1) * 6, 0, Math.PI * 2);
  context.stroke();
}

function drawAurora(context, width, height, pointer, time) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#07131e");
  gradient.addColorStop(1, "#08141f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const ribbons = [
    { color: "rgba(116,255,222,0.18)", phase: 0, amp: 90, thickness: 190 },
    { color: "rgba(110,170,255,0.14)", phase: 1.2, amp: 110, thickness: 220 },
    { color: "rgba(255,146,219,0.12)", phase: 2.1, amp: 80, thickness: 180 },
  ];

  ribbons.forEach((ribbon, index) => {
    context.beginPath();
    const baseY = height * (0.24 + index * 0.16) + (pointer.y - height / 2) * 0.04;
    for (let x = -40; x <= width + 40; x += 16) {
      const y =
        baseY +
        Math.sin(x * 0.006 + time * 0.8 + ribbon.phase) * ribbon.amp +
        Math.cos(x * 0.003 + time * 0.55 + ribbon.phase) * 28;
      if (x === -40) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.lineTo(width + 40, height + ribbon.thickness);
    context.lineTo(-40, height + ribbon.thickness);
    context.closePath();
    const fill = context.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, ribbon.color);
    fill.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = fill;
    context.filter = "blur(20px)";
    context.fill();
    context.filter = "none";
  });

  for (let i = 0; i < 26; i += 1) {
    const x = (i / 25) * width + Math.sin(time * 0.6 + i) * 16;
    const y = height * 0.2 + Math.cos(time * 0.5 + i * 0.7) * 120 + (pointer.y - height / 2) * 0.03;
    context.fillStyle = `rgba(225, 247, 255, ${0.2 + ((i % 5) / 10)})`;
    context.beginPath();
    context.arc(x, y, 1.2 + (i % 3), 0, Math.PI * 2);
    context.fill();
  }
}

function drawSunset(context, width, height, pointer, time) {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#2a3148");
  sky.addColorStop(0.48, "#7e546b");
  sky.addColorStop(1, "#1a1725");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const sunX = width * 0.5 + (pointer.x - width / 2) * 0.06;
  const sunY = height * 0.22 + (pointer.y - height / 2) * 0.04;
  const sunGradient = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.min(width, height) * 0.22);
  sunGradient.addColorStop(0, "rgba(255,236,205,0.95)");
  sunGradient.addColorStop(0.28, "rgba(255,170,120,0.6)");
  sunGradient.addColorStop(1, "rgba(255,170,120,0)");
  context.fillStyle = sunGradient;
  context.fillRect(0, 0, width, height);

  const duneColors = ["#4d3551", "#34273f", "#261e34"];
  duneColors.forEach((color, layer) => {
    const baseY = height * (0.62 + layer * 0.1);
    const amplitude = 26 + layer * 16;
    const speed = 0.35 + layer * 0.1;
    context.beginPath();
    context.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const y =
        baseY +
        Math.sin(x * 0.006 + time * speed + layer) * amplitude +
        Math.cos(x * 0.003 + time * 0.4 + layer) * 10 +
        (pointer.x - width / 2) * (0.02 + layer * 0.01);
      context.lineTo(x, y);
    }
    context.lineTo(width, height);
    context.closePath();
    context.fillStyle = color;
    context.fill();
  });

  for (let i = 0; i < 18; i += 1) {
    const x = ((i * 71) % width) + Math.sin(time * 0.3 + i) * 40;
    const y = height * 0.4 + ((i * 53) % (height * 0.4));
    context.fillStyle = "rgba(255, 214, 188, 0.18)";
    context.beginPath();
    context.arc(x, y, 1 + (i % 2), 0, Math.PI * 2);
    context.fill();
  }
}

function drawIce(context, width, height, pointer, time) {
  const bg = context.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#081522");
  bg.addColorStop(1, "#0a1a2a");
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  const shards = 11;
  for (let i = 0; i < shards; i += 1) {
    const ox = ((i * 97) % width) + Math.sin(time * 0.3 + i) * 24 + (pointer.x - width / 2) * 0.03;
    const oy = ((i * 131) % height) + Math.cos(time * 0.27 + i) * 22 + (pointer.y - height / 2) * 0.02;
    const size = 54 + (i % 4) * 18;
    const rotation = time * 0.06 + i * 0.4;

    context.save();
    context.translate(ox, oy);
    context.rotate(rotation);
    context.beginPath();
    context.moveTo(-size * 0.28, -size * 0.72);
    context.lineTo(size * 0.7, -size * 0.1);
    context.lineTo(size * 0.22, size * 0.72);
    context.lineTo(-size * 0.65, size * 0.18);
    context.closePath();
    context.fillStyle = "rgba(198, 240, 255, 0.08)";
    context.strokeStyle = "rgba(228, 248, 255, 0.22)";
    context.lineWidth = 1;
    context.fill();
    context.stroke();
    context.restore();
  }

  const beam = context.createLinearGradient(pointer.x - 120, 0, pointer.x + 120, height);
  beam.addColorStop(0, "rgba(255,255,255,0)");
  beam.addColorStop(0.5, "rgba(214,246,255,0.18)");
  beam.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = beam;
  context.fillRect(pointer.x - 160, 0, 320, height);
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
    const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    const target = { x: pointer.x, y: pointer.y };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.height = height * Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    };

    const handlePointerMove = (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const render = (time) => {
      frame = window.requestAnimationFrame(render);
      pointer.x += (target.x - pointer.x) * 0.08;
      pointer.y += (target.y - pointer.y) * 0.08;
      const t = time * 0.001;

      if (mode === "aurora") {
        drawAurora(context, width, height, pointer, t);
      } else if (mode === "sunset") {
        drawSunset(context, width, height, pointer, t);
      } else if (mode === "ice") {
        drawIce(context, width, height, pointer, t);
      } else {
        drawBlueprint(context, width, height, pointer, t);
      }
    };

    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [mode]);

  return <canvas className="site-background__scene-canvas" ref={canvasRef} aria-hidden="true" />;
}

import { useEffect, useRef } from "react";

function drawThemeCanvas(context, width, height, time, pointer) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f7fbfb";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(19, 116, 126, 0.11)";
  context.lineWidth = 1;

  const step = Math.max(56, Math.floor(width / 20));
  const driftX = pointer.x * 0.012;
  const driftY = pointer.y * 0.012;

  for (let x = -step; x <= width + step; x += step) {
    const offset = Math.sin(time * 0.3 + x * 0.004) * 2.2;
    context.beginPath();
    context.moveTo(x + driftX + offset, 0);
    context.lineTo(x - driftX - offset, height);
    context.stroke();
  }

  for (let y = -step; y <= height + step; y += step) {
    const offset = Math.cos(time * 0.34 + y * 0.004) * 2.2;
    context.beginPath();
    context.moveTo(0, y + driftY + offset);
    context.lineTo(width, y - driftY - offset);
    context.stroke();
  }
}

export default function ThemePresetScene({ mode }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (mode !== "xflow") {
      return undefined;
    }

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

    const handleMove = (event) => {
      const rect = root.getBoundingClientRect();
      target.x = event.clientX - rect.left - rect.width / 2;
      target.y = event.clientY - rect.top - rect.height / 2;
    };

    const handleLeave = () => {
      target.x = 0;
      target.y = 0;
    };

    resize();
    root.addEventListener("pointermove", handleMove, { passive: true });
    root.addEventListener("pointerleave", handleLeave);
    window.addEventListener("resize", resize);

    const render = (timestamp) => {
      frame = window.requestAnimationFrame(render);
      pointer.x += (target.x - pointer.x) * 0.08;
      pointer.y += (target.y - pointer.y) * 0.08;
      drawThemeCanvas(context, root.clientWidth, root.clientHeight, timestamp * 0.001, pointer);
    };

    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", handleMove);
      root.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("resize", resize);
    };
  }, [mode]);

  return (
    <div className={`theme-scene theme-scene--${mode}`} ref={rootRef} aria-hidden="true">
      <canvas className="theme-scene__canvas" ref={canvasRef} />
    </div>
  );
}

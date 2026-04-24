import { useEffect, useRef } from "react";
import * as THREE from "three";

function createRoundedRectTexture(width, height, radius, fill, stroke, blur = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, width, height);
  if (blur) {
    context.shadowBlur = blur;
    context.shadowColor = stroke;
  }

  const drawRoundedRect = (x, y, w, h, r) => {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  };

  drawRoundedRect(6, 6, width - 12, height - 12, radius);
  context.fillStyle = fill;
  context.fill();

  context.lineWidth = 2;
  context.strokeStyle = stroke;
  context.stroke();

  return new THREE.CanvasTexture(canvas);
}

function createPointField(countX, countY, aspect) {
  const positions = [];
  const seeds = [];
  const colors = [];
  const worldWidth = 6 * aspect;
  const worldHeight = 6;

  for (let y = 0; y < countY; y += 1) {
    for (let x = 0; x < countX; x += 1) {
      const u = countX === 1 ? 0.5 : x / (countX - 1);
      const v = countY === 1 ? 0.5 : y / (countY - 1);
      const jitterX = (Math.random() - 0.5) * (worldWidth / countX) * 0.7;
      const jitterY = (Math.random() - 0.5) * (worldHeight / countY) * 0.7;
      positions.push((u - 0.5) * worldWidth + jitterX, (v - 0.5) * worldHeight + jitterY, 0);
      seeds.push(Math.random(), Math.random(), Math.random());

      const tone = Math.random();
      if (tone < 0.72) {
        colors.push(0.94, 0.95, 0.97);
      } else if (tone < 0.9) {
        colors.push(0.33, 0.59, 0.98);
      } else if (tone < 0.96) {
        colors.push(0.91, 0.42, 0.48);
      } else {
        colors.push(0.73, 0.84, 0.34);
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    seeds: new Float32Array(seeds),
    colors: new Float32Array(colors),
  };
}

export default function AntigravityBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    mount.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
    camera.position.z = 5;

    const pointer = new THREE.Vector2(0, 0);
    const pointerTarget = new THREE.Vector2(0, 0);
    const resolution = new THREE.Vector2(1, 1);
    let animationFrame = 0;

    const updateCamera = () => {
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;
      const aspect = width / Math.max(height, 1);
      const frustumHeight = 6;
      const frustumWidth = frustumHeight * aspect;

      camera.left = -frustumWidth / 2;
      camera.right = frustumWidth / 2;
      camera.top = frustumHeight / 2;
      camera.bottom = -frustumHeight / 2;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
      resolution.set(width, height);
    };

    updateCamera();

    const field = createPointField(58, 40, (mount.clientWidth || window.innerWidth) / Math.max(mount.clientHeight || window.innerHeight, 1));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(field.positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(field.seeds, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(field.colors, 3));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: pointer },
        uResolution: { value: resolution },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec2 uPointer;
        attribute vec3 aSeed;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          float driftX = sin(uTime * (0.18 + aSeed.x * 0.4) + aSeed.y * 6.2831) * 0.045;
          float driftY = cos(uTime * (0.2 + aSeed.y * 0.45) + aSeed.z * 6.2831) * 0.045;
          pos.x += driftX;
          pos.y += driftY;

          vec2 diff = pos.xy - uPointer;
          float distanceToPointer = length(diff);
          float influence = smoothstep(1.15, 0.0, distanceToPointer);
          if (distanceToPointer > 0.0001) {
            pos.xy += normalize(diff) * influence * (0.1 + aSeed.z * 0.06);
          }

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = (2.0 + aSeed.x * 2.8 + influence * 2.0) * min(uResolution.y / 900.0, 1.35);
          vColor = aColor;
          vAlpha = 0.32 + aSeed.y * 0.34 + influence * 0.22;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          float alpha = smoothstep(0.5, 0.0, dist);
          alpha *= smoothstep(0.18, 0.0, dist) * 0.8 + 0.2;
          gl_FragColor = vec4(vColor, alpha * vAlpha);
        }
      `,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const decorationGroup = new THREE.Group();
    const panelTexture = createRoundedRectTexture(420, 220, 56, "rgba(255,255,255,0.055)", "rgba(255,255,255,0.11)", 10);
    const squareTexture = createRoundedRectTexture(250, 250, 64, "rgba(255,255,255,0.055)", "rgba(255,255,255,0.11)", 12);
    const pillTexture = createRoundedRectTexture(320, 110, 54, "rgba(255,255,255,0.045)", "rgba(255,255,255,0.09)", 8);

    [
      { texture: panelTexture, position: [-1.85, 1.15, -0.4], scale: [1.55, 0.82, 1], drift: [0.14, 0.1], phase: 0.2 },
      { texture: squareTexture, position: [1.7, 0.62, -0.42], scale: [0.88, 0.88, 1], drift: [0.1, 0.08], phase: 1.6 },
      { texture: pillTexture, position: [-1.5, -1.52, -0.36], scale: [1.1, 0.38, 1], drift: [0.12, 0.07], phase: 2.2 },
      { texture: pillTexture, position: [1.95, 1.65, -0.38], scale: [0.72, 0.3, 1], drift: [0.08, 0.06], phase: 3.1 },
    ].forEach((item) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: item.texture,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.NormalBlending,
        }),
      );
      mesh.position.set(...item.position);
      mesh.scale.set(...item.scale);
      mesh.userData = item;
      decorationGroup.add(mesh);
    });

    scene.add(decorationGroup);

    const glowMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color("#6d86b8") },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv - 0.5;
          float alpha = smoothstep(0.5, 0.0, length(uv));
          gl_FragColor = vec4(uColor, alpha * 0.12);
        }
      `,
      blending: THREE.AdditiveBlending,
    });

    const glowA = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), glowMaterial.clone());
    glowA.position.set(-2.1, 1.35, -0.9);
    scene.add(glowA);

    const glowB = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), glowMaterial.clone());
    glowB.material.uniforms.uColor.value = new THREE.Color("#3479f9");
    glowB.position.set(2.1, -1.45, -0.9);
    scene.add(glowB);

    const clock = new THREE.Clock();

    const updatePointer = (clientX, clientY) => {
      const rect = mount.getBoundingClientRect();
      const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      const y = -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
      pointerTarget.set(
        THREE.MathUtils.clamp(x * (camera.right * 0.92), camera.left * 0.96, camera.right * 0.96),
        THREE.MathUtils.clamp(y * (camera.top * 0.92), camera.bottom * 0.96, camera.top * 0.96),
      );
    };

    const handlePointerMove = (event) => {
      updatePointer(event.clientX, event.clientY);
    };

    const handleResize = () => {
      updateCamera();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("resize", handleResize);

    const tick = () => {
      animationFrame = window.requestAnimationFrame(tick);
      const elapsed = clock.getElapsedTime();
      pointer.lerp(pointerTarget, 0.08);
      material.uniforms.uTime.value = elapsed;

      decorationGroup.children.forEach((mesh) => {
        const { position, drift, phase } = mesh.userData;
        mesh.position.x = position[0] + Math.sin(elapsed * 0.22 + phase) * drift[0] + pointer.x * 0.032;
        mesh.position.y = position[1] + Math.cos(elapsed * 0.2 + phase) * drift[1] + pointer.y * 0.028;
      });

      glowA.position.x = -2.1 + pointer.x * 0.06;
      glowA.position.y = 1.35 + pointer.y * 0.04;
      glowB.position.x = 2.1 + pointer.x * 0.05;
      glowB.position.y = -1.45 + pointer.y * 0.04;

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);

      geometry.dispose();
      material.dispose();
      panelTexture.dispose();
      squareTexture.dispose();
      pillTexture.dispose();
      glowA.geometry.dispose();
      glowA.material.dispose();
      glowB.geometry.dispose();
      glowB.material.dispose();
      decorationGroup.children.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      renderer.dispose();
    };
  }, []);

  return <div className="site-background__antigravity-canvas" ref={mountRef} />;
}

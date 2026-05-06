import { useEffect, useRef } from "react";
import * as THREE from "three";

const MODE_PALETTES = {
  none: {
    dark: ["#bde8ff", "#6ea8ff", "#ffffff"],
    light: ["#1c6d9c", "#4aa7ff", "#ffffff"],
  },
  image: {
    dark: ["#d8efff", "#8dbbff", "#ffffff"],
    light: ["#255b8a", "#69b8ff", "#ffffff"],
  },
  xflow: {
    dark: ["#54f0df", "#ffb36b", "#ffffff"],
    light: ["#19a99d", "#f08a36", "#ffffff"],
  },
};

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.36, "rgba(255,255,255,0.42)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function getPalette(mode) {
  const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  return MODE_PALETTES[mode]?.[theme] || MODE_PALETTES.none[theme];
}

function createParticleSeeds(count) {
  return Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 0.12 + Math.random() * 0.88,
    depth: Math.random(),
    phase: Math.random() * Math.PI * 2,
    speed: 0.32 + Math.random() * 0.9,
  }));
}

export default function AmbientThreeLayer({ mode = "none" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse), (max-width: 760px)").matches;

    if (!mount || reducedMotion || coarsePointer) {
      return undefined;
    }

    const palette = getPalette(mode);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -8, 8);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const pointer = new THREE.Vector2(0, 0);
    const pointerTarget = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();
    const particleCount = mode === "xflow" ? 260 : 230;
    const seeds = createParticleSeeds(particleCount);
    const basePositions = new Float32Array(particleCount * 3);
    const positions = new Float32Array(particleCount * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: palette[0],
      size: 0.022,
      transparent: true,
      opacity: mode === "xflow" ? 0.64 : 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    const ringGroup = new THREE.Group();
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: palette[1],
      transparent: true,
      opacity: 0.18,
      wireframe: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    [1.15, 1.72, 2.34, 3.05].forEach((radius, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.005, 6, 180), ringMaterial.clone());
      ring.rotation.x = Math.PI * (0.18 + index * 0.08);
      ring.rotation.y = Math.PI * (0.1 + index * 0.06);
      ring.rotation.z = index * 0.72;
      ring.userData = { speed: 0.06 + index * 0.018 };
      ringGroup.add(ring);
    });
    scene.add(ringGroup);

    const shardCount = 36;
    const shardGeometry = new THREE.IcosahedronGeometry(0.035, 0);
    const shardMaterial = new THREE.MeshBasicMaterial({
      color: palette[2],
      transparent: true,
      opacity: 0.3,
      wireframe: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shards = new THREE.InstancedMesh(shardGeometry, shardMaterial, shardCount);
    const shardSeeds = createParticleSeeds(shardCount);
    const dummy = new THREE.Object3D();
    scene.add(shards);

    const glowTexture = createGlowTexture();
    const glows = [0, 1, 2].map((index) => {
      const material = new THREE.SpriteMaterial({
        map: glowTexture,
        color: index === 1 ? palette[1] : palette[0],
        transparent: true,
        opacity: index === 2 ? 0.12 : 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(material);
      scene.add(sprite);
      return sprite;
    });

    const seedParticles = () => {
      const width = camera.right - camera.left;
      const height = camera.top - camera.bottom;
      seeds.forEach((seed, index) => {
        const orbit = seed.radius;
        const x = Math.cos(seed.angle) * width * 0.58 * orbit;
        const y = Math.sin(seed.angle * 1.22) * height * 0.56 * orbit;
        const i = index * 3;
        basePositions[i] = x;
        basePositions[i + 1] = y;
        basePositions[i + 2] = (seed.depth - 0.5) * 0.3;
        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = basePositions[i + 2];
      });
      geometry.attributes.position.needsUpdate = true;
    };

    const resize = () => {
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
      seedParticles();
    };

    const applyPalette = () => {
      const nextPalette = getPalette(mode);
      particleMaterial.color.set(nextPalette[0]);
      ringGroup.children.forEach((ring, index) => ring.material.color.set(nextPalette[index % 2 === 0 ? 1 : 0]));
      shardMaterial.color.set(nextPalette[2]);
      glows.forEach((glow, index) => glow.material.color.set(index === 1 ? nextPalette[1] : nextPalette[0]));
    };

    const handlePointerMove = (event) => {
      const rect = mount.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      const ny = -(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
      pointerTarget.set(nx * camera.right, ny * camera.top);
    };

    const handlePointerLeave = () => {
      pointerTarget.set(0, 0);
    };

    const themeObserver = new MutationObserver(applyPalette);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let animationFrame = 0;
    const render = () => {
      animationFrame = window.requestAnimationFrame(render);
      const elapsed = clock.getElapsedTime();
      pointer.lerp(pointerTarget, 0.075);

      seeds.forEach((seed, index) => {
        const i = index * 3;
        const baseX = basePositions[i];
        const baseY = basePositions[i + 1];
        const dx = baseX - pointer.x;
        const dy = baseY - pointer.y;
        const dist = Math.max(Math.hypot(dx, dy), 0.001);
        const influence = Math.max(0, 1 - dist / 2.4);
        const vortex = influence * Math.sin(elapsed * 1.6 + seed.phase) * 0.16;
        positions[i] = baseX + Math.sin(elapsed * seed.speed + seed.phase) * 0.04 + (dx / dist) * influence * 0.14 - (dy / dist) * vortex;
        positions[i + 1] = baseY + Math.cos(elapsed * seed.speed * 0.82 + seed.phase) * 0.04 + (dy / dist) * influence * 0.14 + (dx / dist) * vortex;
      });
      geometry.attributes.position.needsUpdate = true;

      ringGroup.position.x = pointer.x * 0.04;
      ringGroup.position.y = pointer.y * 0.04;
      ringGroup.rotation.x = Math.sin(elapsed * 0.16) * 0.08 + pointer.y * 0.012;
      ringGroup.rotation.y = Math.cos(elapsed * 0.14) * 0.08 + pointer.x * 0.012;
      ringGroup.children.forEach((ring) => {
        ring.rotation.z += ring.userData.speed * 0.012;
      });

      shardSeeds.forEach((seed, index) => {
        const orbit = seed.radius * 2.9;
        dummy.position.set(
          Math.cos(elapsed * seed.speed * 0.34 + seed.phase) * orbit + pointer.x * 0.06,
          Math.sin(elapsed * seed.speed * 0.28 + seed.phase) * orbit + pointer.y * 0.06,
          (seed.depth - 0.5) * 0.8,
        );
        dummy.rotation.set(elapsed * 0.18 + seed.phase, elapsed * 0.24 + seed.angle, seed.phase);
        dummy.scale.setScalar(0.65 + seed.depth * 1.2);
        dummy.updateMatrix();
        shards.setMatrixAt(index, dummy.matrix);
      });
      shards.instanceMatrix.needsUpdate = true;

      glows.forEach((glow, index) => {
        const drift = 1 + index * 0.7;
        glow.position.set(
          Math.sin(elapsed * 0.12 + index * 1.7) * drift + pointer.x * (0.04 + index * 0.015),
          Math.cos(elapsed * 0.1 + index * 1.3) * drift + pointer.y * (0.04 + index * 0.012),
          -0.9,
        );
        glow.scale.setScalar(1.4 + index * 0.8 + Math.sin(elapsed * 0.32 + index) * 0.12);
      });

      renderer.render(scene, camera);
    };

    resize();
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", resize);
    mount.addEventListener("pointerleave", handlePointerLeave);
    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", resize);
      mount.removeEventListener("pointerleave", handlePointerLeave);
      themeObserver.disconnect();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      particleMaterial.dispose();
      ringGroup.children.forEach((ring) => {
        ring.geometry.dispose();
        ring.material.dispose();
      });
      shardGeometry.dispose();
      shardMaterial.dispose();
      glowTexture.dispose();
      glows.forEach((glow) => glow.material.dispose());
      renderer.dispose();
    };
  }, [mode]);

  return <div className={`site-background__ambient-three site-background__ambient-three--${mode}`} ref={mountRef} aria-hidden="true" />;
}

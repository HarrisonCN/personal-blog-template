import { useEffect, useRef } from "react";
import * as THREE from "three";

function createRoundedRectTexture(width, height, radius, fill, stroke, blur = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, width, height);
  context.shadowBlur = blur;
  context.shadowColor = stroke;

  context.beginPath();
  context.moveTo(12 + radius, 12);
  context.arcTo(width - 12, 12, width - 12, height - 12, radius);
  context.arcTo(width - 12, height - 12, 12, height - 12, radius);
  context.arcTo(12, height - 12, 12, 12, radius);
  context.arcTo(12, 12, width - 12, 12, radius);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = stroke;
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
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
      const jitterX = (Math.random() - 0.5) * (worldWidth / countX) * 0.65;
      const jitterY = (Math.random() - 0.5) * (worldHeight / countY) * 0.65;

      positions.push((u - 0.5) * worldWidth + jitterX, (v - 0.5) * worldHeight + jitterY, 0);
      seeds.push(Math.random(), Math.random(), Math.random());

      const tone = Math.random();
      if (tone < 0.78) {
        colors.push(0.93, 0.95, 0.98);
      } else if (tone < 0.9) {
        colors.push(0.19, 0.54, 0.97);
      } else if (tone < 0.96) {
        colors.push(0.89, 0.34, 0.42);
      } else {
        colors.push(0.73, 0.86, 0.3);
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    seeds: new Float32Array(seeds),
    colors: new Float32Array(colors),
  };
}

function makeParticleMaterial(pointer, resolution, pixelRatio, config) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: pointer },
      uResolution: { value: resolution },
      uPulse: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uBaseScale: { value: config.baseScale },
      uAlphaBoost: { value: config.alphaBoost },
      uSoftness: { value: config.softness },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPulse;
      uniform float uBaseScale;
      uniform vec2 uPointer;
      uniform vec2 uResolution;
      attribute vec3 aSeed;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vDist;
      void main() {
        vec3 pos = position;
        float wobbleX = sin(uTime * (0.14 + aSeed.x * 0.55) + aSeed.y * 6.2831) * (0.03 + aSeed.z * 0.015);
        float wobbleY = cos(uTime * (0.18 + aSeed.y * 0.52) + aSeed.z * 6.2831) * (0.03 + aSeed.x * 0.015);
        pos.x += wobbleX;
        pos.y += wobbleY;

        vec2 delta = pos.xy - uPointer;
        float dist = length(delta);
        float push = smoothstep(1.08, 0.0, dist);
        float ring = exp(-pow((dist - (0.58 + uPulse * 0.2)) * 7.5, 2.0)) * (0.42 + uPulse * 0.58);
        if (dist > 0.0001) {
          pos.xy += normalize(delta) * (push * 0.1 + ring * 0.085);
        }

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (uBaseScale + aSeed.x * uBaseScale * 0.92 + push * 3.2 + ring * 3.8) * min(uResolution.y / 900.0, 1.5);
        vColor = mix(aColor, vec3(1.0), ring * 0.22 + push * 0.08);
        vAlpha = 0.16 + aSeed.y * 0.24 + push * 0.18 + ring * 0.28;
        vDist = dist;
      }
    `,
    fragmentShader: `
      uniform float uAlphaBoost;
      uniform float uSoftness;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vDist;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        float alpha = smoothstep(0.5, uSoftness, dist);
        float core = smoothstep(0.22, 0.0, dist);
        alpha = alpha * (0.58 + core * 0.42);
        gl_FragColor = vec4(vColor, alpha * vAlpha * uAlphaBoost);
      }
    `,
  });
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 30);
    camera.position.z = 10;

    const pointer = new THREE.Vector2(0, 0);
    const cursorPointer = new THREE.Vector2(0, 0);
    const pointerTarget = new THREE.Vector2(0, 0);
    const resolution = new THREE.Vector2(1, 1);
    const pixelRatio = new THREE.Vector2(renderer.getPixelRatio(), renderer.getPixelRatio());
    const clock = new THREE.Clock();
    let animationFrame = 0;
    let ringPlane;

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
      resolution.set(width, height);
      if (ringPlane) {
        ringPlane.scale.set(frustumWidth, frustumHeight, 1);
      }
    };

    resize();

    const aspect = (mount.clientWidth || window.innerWidth) / Math.max(mount.clientHeight || window.innerHeight, 1);
    const field = createPointField(72, 48, aspect);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(field.positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(field.seeds, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(field.colors, 3));

    const materialTight = makeParticleMaterial(pointer, resolution, pixelRatio, {
      baseScale: 1.8,
      alphaBoost: 1.0,
      softness: 0.03,
    });
    const materialSoft = makeParticleMaterial(pointer, resolution, pixelRatio, {
      baseScale: 3.6,
      alphaBoost: 0.34,
      softness: 0.12,
    });

    const pointsSoft = new THREE.Points(geometry, materialSoft);
    const pointsTight = new THREE.Points(geometry, materialTight);
    pointsSoft.position.z = -0.12;
    scene.add(pointsSoft);
    scene.add(pointsTight);

    ringPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uPointer: { value: cursorPointer },
          uPulse: { value: 0 },
        },
        vertexShader: `
          varying vec2 vWorld;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec2 uPointer;
          uniform float uPulse;
          varying vec2 vWorld;
          void main() {
            float dist = length(vWorld - uPointer);
            float ring = exp(-pow((dist - (0.34 + uPulse * 0.08)) * 14.0, 2.0)) * (0.035 + uPulse * 0.09);
            float core = smoothstep(0.2, 0.0, dist) * 0.02;
            vec3 color = mix(vec3(0.47, 0.62, 0.95), vec3(1.0), 0.34);
            gl_FragColor = vec4(color, ring + core);
          }
        `,
      }),
    );
    ringPlane.position.z = -0.25;
    ringPlane.scale.set(camera.right - camera.left, camera.top - camera.bottom, 1);
    scene.add(ringPlane);

    const decorationGroup = new THREE.Group();
    const panelTexture = createRoundedRectTexture(420, 220, 58, "rgba(255,255,255,0.055)", "rgba(255,255,255,0.1)", 10);
    const squareTexture = createRoundedRectTexture(280, 280, 70, "rgba(255,255,255,0.05)", "rgba(255,255,255,0.095)", 12);
    const pillTexture = createRoundedRectTexture(340, 112, 56, "rgba(255,255,255,0.045)", "rgba(255,255,255,0.085)", 8);

    [
      { texture: panelTexture, position: [-1.9, 1.2, -0.5], scale: [1.7, 0.9, 1], drift: [0.16, 0.1], phase: 0.3, opacity: 0.88 },
      { texture: squareTexture, position: [1.92, 0.7, -0.48], scale: [0.95, 0.95, 1], drift: [0.11, 0.09], phase: 1.6, opacity: 0.84 },
      { texture: pillTexture, position: [-1.55, -1.5, -0.42], scale: [1.2, 0.39, 1], drift: [0.12, 0.08], phase: 2.4, opacity: 0.76 },
      { texture: pillTexture, position: [2.15, 1.72, -0.46], scale: [0.74, 0.3, 1], drift: [0.08, 0.06], phase: 3.3, opacity: 0.74 },
      { texture: pillTexture, position: [0.4, -1.86, -0.38], scale: [0.82, 0.28, 1], drift: [0.06, 0.05], phase: 4.1, opacity: 0.6 },
      { texture: squareTexture, position: [-2.62, -0.2, -0.55], scale: [0.48, 0.48, 1], drift: [0.07, 0.08], phase: 5.2, opacity: 0.42 },
    ].forEach((item) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: item.texture,
          transparent: true,
          opacity: item.opacity,
          depthWrite: false,
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
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color("#6079ab") }, uAlpha: { value: 0.12 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uAlpha;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv - 0.5;
          float alpha = smoothstep(0.5, 0.0, length(uv)) * uAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });

    const glowA = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), glowMaterial.clone());
    glowA.position.set(-2.15, 1.32, -0.95);
    scene.add(glowA);

    const glowB = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), glowMaterial.clone());
    glowB.material.uniforms.uColor.value = new THREE.Color("#356ef3");
    glowB.material.uniforms.uAlpha.value = 0.1;
    glowB.position.set(2.18, -1.38, -0.95);
    scene.add(glowB);

    const updatePointer = (clientX, clientY) => {
      const rect = mount.getBoundingClientRect();
      const nx = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      const ny = -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
      pointerTarget.set(
        THREE.MathUtils.clamp(nx * (camera.right * 0.92), camera.left * 0.96, camera.right * 0.96),
        THREE.MathUtils.clamp(ny * (camera.top * 0.92), camera.bottom * 0.96, camera.top * 0.96),
      );
      cursorPointer.copy(pointerTarget);
    };

    const handlePointerMove = (event) => updatePointer(event.clientX, event.clientY);
    const handlePointerLeave = () => {
      pointerTarget.set(0, 0);
      cursorPointer.set(0, 0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("resize", resize);
    mount.addEventListener("pointerleave", handlePointerLeave);

    const tick = () => {
      animationFrame = window.requestAnimationFrame(tick);
      const elapsed = clock.getElapsedTime();
      const pulse = (Math.sin(elapsed * 1.2) + 1) * 0.5;

      pointer.lerp(pointerTarget, 0.09);
      materialTight.uniforms.uTime.value = elapsed;
      materialSoft.uniforms.uTime.value = elapsed;
      materialTight.uniforms.uPulse.value = pulse;
      materialSoft.uniforms.uPulse.value = pulse;
      ringPlane.material.uniforms.uPulse.value = pulse;

      decorationGroup.children.forEach((mesh) => {
        const { position, drift, phase } = mesh.userData;
        mesh.position.x = position[0] + Math.sin(elapsed * 0.18 + phase) * drift[0] + pointer.x * 0.03;
        mesh.position.y = position[1] + Math.cos(elapsed * 0.16 + phase) * drift[1] + pointer.y * 0.024;
        mesh.rotation.z = Math.sin(elapsed * 0.08 + phase) * 0.05;
      });

      glowA.position.x = -2.15 + pointer.x * 0.055;
      glowA.position.y = 1.32 + pointer.y * 0.04;
      glowB.position.x = 2.18 + pointer.x * 0.045;
      glowB.position.y = -1.38 + pointer.y * 0.03;

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", resize);
      mount.removeEventListener("pointerleave", handlePointerLeave);
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }

      geometry.dispose();
      materialTight.dispose();
      materialSoft.dispose();
      ringPlane.geometry.dispose();
      ringPlane.material.dispose();
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

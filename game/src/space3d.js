const THREE_URL = "https://unpkg.com/three@0.165.0/build/three.module.js";

export async function startSpace3dLayer(canvas, getState, options = {}) {
  try {
    const THREE = await import(THREE_URL);
    return createThreeLayer(THREE, canvas, getState, options);
  } catch {
    const fallback = createFallbackLayer(canvas, getState, options);
    fallback.start();
    return fallback;
  }
}

function numberOption(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function createProfile(options = {}) {
  const lowPower = !!options.lowPower;
  return {
    lowPower,
    maxDpr: numberOption(options.maxDpr, lowPower ? 0.8 : 1.2),
    fps: numberOption(options.fps, lowPower ? 24 : 30),
    idleFps: numberOption(options.idleFps, lowPower ? 6 : 10),
    starCount: numberOption(options.starCount, lowPower ? 280 : 640),
    rings: numberOption(options.rings, lowPower ? 8 : 12),
    ringSegments: numberOption(options.ringSegments, lowPower ? 32 : 56),
    asteroids: numberOption(options.asteroids, lowPower ? 10 : 22),
    fallbackStars: numberOption(options.fallbackStars, lowPower ? 64 : 120),
    fallbackRings: numberOption(options.fallbackRings, lowPower ? 8 : 14),
  };
}

function createThreeLayer(THREE, canvas, getState, options) {
  const profile = createProfile(options);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !profile.lowPower,
    alpha: false,
    powerPreference: "high-performance",
    stencil: false,
  });
  renderer.setClearColor(0x040716, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x09122c, 0.024);

  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 220);
  camera.position.set(0, 0.5, 9);

  const ambient = new THREE.AmbientLight(0x9cc9ff, 1.1);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(5, 8, 10);
  scene.add(ambient, key);

  const stars = createStars(THREE, profile.starCount);
  scene.add(stars);

  const tunnel = [];
  const ringGeometry = new THREE.TorusGeometry(6.2, 0.045, profile.lowPower ? 5 : 8, profile.ringSegments);
  const ringMaterials = [
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42 }),
    new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.34 }),
    new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.3 }),
  ];
  for (let i = 0; i < profile.rings; i++) {
    const ring = new THREE.Mesh(ringGeometry, ringMaterials[i % ringMaterials.length]);
    ring.position.z = -i * 8;
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    tunnel.push(ring);
  }

  const asteroids = [];
  const asteroidGeometry = new THREE.IcosahedronGeometry(0.55, 0);
  const asteroidMaterial = new THREE.MeshBasicMaterial({
    color: 0xbfd2ff,
    transparent: true,
    opacity: 0.74,
  });
  for (let i = 0; i < profile.asteroids; i++) {
    const rock = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    rock.position.set(
      ((i * 47) % 100) / 10 - 5,
      ((i * 29) % 64) / 10 - 3.2,
      -8 - i * 3.4,
    );
    rock.scale.setScalar(0.42 + (i % 5) * 0.16);
    rock.rotation.set(i * 0.7, i * 1.2, i * 0.31);
    scene.add(rock);
    asteroids.push(rock);
  }

  let frame = 0;
  let lastRenderAt = -Infinity;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(canvas.clientWidth || rect.width));
    const height = Math.max(1, Math.floor(canvas.clientHeight || rect.height));
    const dpr = Math.max(0.65, Math.min(profile.maxDpr, window.devicePixelRatio || 1));
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function render(now = performance.now()) {
    frame = requestAnimationFrame(render);
    const state = getState();
    const targetFps = state.running ? profile.fps : profile.idleFps;
    if (now - lastRenderAt < 1000 / targetFps) return;
    lastRenderAt = now;
    resize();
    const time = state.time || performance.now() / 1000;
    const thrust = state.running ? 1 : 0.36;
    const progressShift = (state.progress || 0) * 48;

    stars.rotation.z = Math.sin(time * 0.06) * 0.06;
    stars.position.z = (time * 4.6 * thrust + progressShift) % 16;

    tunnel.forEach((ring, index) => {
      const z = ((-index * 8 + time * 12 * thrust + progressShift) % 112) - 92;
      const scale = 1 + ((z + 92) / 112) * 0.28;
      ring.position.z = z;
      ring.rotation.z = time * (0.22 + index * 0.01) + index * 0.38;
      ring.scale.set(scale, scale, scale);
      ring.material.opacity = 0.18 + ((z + 92) / 112) * 0.34;
    });

    asteroids.forEach((rock, index) => {
      const z = ((-8 - index * 3.4 + time * 9.4 * thrust + progressShift) % 118) - 98;
      rock.position.z = z;
      rock.rotation.x += 0.004 + index * 0.0004;
      rock.rotation.y += 0.006 + index * 0.0003;
    });

    camera.position.x = Math.sin(time * 0.18) * 0.24;
    camera.position.y = 0.45 + Math.cos(time * 0.13) * 0.16;
    camera.rotation.z = Math.sin(time * 0.11) * 0.025;
    renderer.render(scene, camera);
  }

  render();
  return {
    stop() {
      cancelAnimationFrame(frame);
      renderer.dispose();
    },
  };
}

function createStars(THREE, count = 640) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [
    [0.56, 0.86, 1],
    [1, 0.82, 0.96],
    [1, 0.93, 0.52],
    [0.74, 0.64, 1],
  ];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 34;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 2] = -Math.random() * 120;
    const color = palette[i % palette.length];
    colors[i * 3] = color[0];
    colors[i * 3 + 1] = color[1];
    colors[i * 3 + 2] = color[2];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.055,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
}

function createFallbackLayer(canvas, getState, options = {}) {
  const profile = createProfile(options);
  const ctx = canvas.getContext("2d");
  let frame = 0;
  let lastRenderAt = -Infinity;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(0.65, Math.min(profile.maxDpr, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.floor(canvas.clientWidth || rect.width));
    const height = Math.max(1, Math.floor(canvas.clientHeight || rect.height));
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return { width, height };
  }

  function render(now = performance.now()) {
    frame = requestAnimationFrame(render);
    const state = getState();
    const targetFps = state.running ? profile.fps : profile.idleFps;
    if (now - lastRenderAt < 1000 / targetFps) return;
    lastRenderAt = now;
    const { width, height } = resize();
    const time = state.time || performance.now() / 1000;
    const progress = state.progress || 0;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#050716");
    gradient.addColorStop(0.55, "#0b1740");
    gradient.addColorStop(1, "#160a32");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    for (let i = 0; i < profile.fallbackRings; i++) {
      const t = ((i / profile.fallbackRings + time * 0.28 + progress) % 1);
      const scale = 0.08 + t * 1.18;
      ctx.globalAlpha = 0.12 + t * 0.38;
      ctx.strokeStyle = i % 3 === 0 ? "#38bdf8" : i % 3 === 1 ? "#f472b6" : "#fde047";
      ctx.lineWidth = Math.max(1, 5 - t * 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.34 * scale, height * 0.22 * scale, time * 0.05, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < profile.fallbackStars; i++) {
      const x = (i * 97 + time * 80) % (width + 160) - 80;
      const y = (i * 53 + Math.sin(i) * 80 + time * 18) % (height + 120) - 60;
      ctx.globalAlpha = 0.28 + (i % 5) * 0.08;
      ctx.fillStyle = i % 4 === 0 ? "#fef08a" : i % 4 === 1 ? "#7dd3fc" : i % 4 === 2 ? "#f9a8d4" : "#c4b5fd";
      ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 3));
    }
    ctx.globalAlpha = 1;
  }

  return {
    start: render,
    stop() {
      cancelAnimationFrame(frame);
    },
  };
}

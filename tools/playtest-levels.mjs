const { levels } = await import(`../game/src/levels.js?playtest=${Date.now()}`);

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));

const requestedLevels = String(args.levels || "1,2,3,4")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter(Number.isFinite);
const requestedVariants = String(args.variants || "perfect,early,late")
  .split(",")
  .map((value) => normalizeVariant(value.trim()))
  .filter(Boolean);
const maxSeconds = Number(args.maxSeconds || 180);
const dt = Number(args.dt || 0.02);

const MOUTH_CLOSE_SECONDS = 0.24;
const MOUTH_TOOTH_HIT_H = 6;
const HOLD_THRESHOLD_SECONDS = 0.1;
const HOLD_CAP_SECONDS = 0.32;

const results = [];
for (const number of requestedLevels) {
  for (const variant of requestedVariants) {
    const source = levels.find((item) => item.number === number);
    if (!source) {
      results.push({ level: number, variant, ok: false, reason: "missing-level" });
      continue;
    }
    results.push(runLevel(structuredClone(source), variant));
  }
}

const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
if (failed.length) process.exitCode = 1;

function runLevel(level, variant) {
  const finishPortal = level.portals.find((portal) => portal.type === "finish");
  const playableEndX = finishPortal?.x ?? level.world.width;
  const variantShiftSeconds = variant === "early" ? -0.08 : variant === "late" ? 0.08 : 0;
  const keys = { jump: false };
  const inputState = { pressStartedAt: null };
  const state = {
    time: 0,
    finished: false,
    lastDeath: "",
    lastDeathAt: null,
    currentSection: level.sections[0],
    portalTransition: null,
  };
  const player = {
    x: level.world.start.x,
    y: level.world.start.y,
    w: 34,
    h: 34,
    vx: level.world.start.mode === "plane" ? 390 : 340,
    vy: 0,
    mode: level.world.start.mode,
    gravity: level.world.start.gravity,
    onGround: false,
    angle: 0,
    yellowActive: false,
    deadTimer: 0,
    jumpLatch: false,
    portalCooldown: 0,
    orbCooldown: 0,
    springCooldown: 0,
    mini: false,
    portalScale: 1,
  };

  while (!state.finished && !state.lastDeath && state.time < maxSeconds) {
    update(dt);
  }

  return {
    level: level.number,
    id: level.id,
    variant,
    ok: state.finished && !state.lastDeath,
    finished: state.finished,
    progress: Math.round(levelProgress() * 1000) / 10,
    time: Math.round(state.time * 100) / 100,
    lastDeath: state.lastDeath,
    lastDeathAt: state.lastDeathAt,
    section: state.currentSection?.id,
    player: {
      x: Math.round(player.x),
      y: Math.round(player.y),
      vx: Math.round(player.vx),
      vy: Math.round(player.vy),
      mode: player.mode,
      gravity: player.gravity,
      onGround: player.onGround,
      mini: player.mini,
    },
  };

  function update(step) {
    applyTestRunInput();
    state.time += step;
    player.portalCooldown = Math.max(0, player.portalCooldown - step);
    player.orbCooldown = Math.max(0, player.orbCooldown - step);
    player.springCooldown = Math.max(0, player.springCooldown - step);
    state.currentSection = activeSection();

    if (state.portalTransition) {
      updatePortalTransition(step);
      state.currentSection = activeSection();
      return;
    }

    if (player.mode === "plane") updatePlane(step);
    else updateCube(step);
    updateCommonInteractions();
  }

  function targetSpeed() {
    const section = activeSection();
    const multiplier = level.speedMultiplier ?? 1;
    let speed = player.mini ? 426 : 384;
    if (section.id === "spikes" || section.id === "cube-return") speed = 404;
    if (section.id === "mini") speed = 438;
    if (section.id === "mix") speed = 424;
    for (const zone of level.speedZones) {
      if (rectsOverlap(playerRect(), zone)) speed = zone.speed;
    }
    return speed * multiplier;
  }

  function updateCube(step) {
    const old = { x: player.x, y: player.y };
    player.yellowActive = false;
    updateMiniMode();

    const holdPower = holdInputStrength();
    for (const zone of level.yellowZones) {
      if (!rectsOverlap(playerRect(), zone)) continue;
      if (holdPower > 0) {
        player.yellowActive = true;
        player.vx = Math.max(player.vx, zone.minSpeed);
        player.vy += (zone.targetY - player.y) * (15 + holdPower * 3) * step;
        player.vy *= 0.72 - holdPower * 0.06;
      } else if (player.x > zone.x + 70 && player.x < zone.x + zone.w - 30) {
        player.vy += 980 * step;
      }
    }

    const target = player.yellowActive ? 488 * (level.speedMultiplier ?? 1) : targetSpeed();
    player.vx += (target - player.vx) * Math.min(1, step * 7.2);
    const maxSpeed = player.yellowActive
      ? (level.maxYellowSpeed ?? 518)
      : (level.maxCubeSpeed ?? 486);
    player.vx = Math.max(290, Math.min(maxSpeed, player.vx));

    if (keys.jump && player.onGround && !player.jumpLatch) {
      const jumpPower = player.mini ? 555 : 625;
      player.vy = -player.gravity * jumpPower;
      player.onGround = false;
      player.jumpLatch = true;
    }
    if (!keys.jump) player.jumpLatch = false;

    player.vy += 1560 * player.gravity * step;
    player.vy = Math.max(-980, Math.min(980, player.vy));
    player.x += player.vx * step;
    player.y += player.vy * step;
    player.onGround = false;

    collidePlatforms(old);
  }

  function updatePlane(step) {
    const holdPower = keys.jump ? Math.max(0.42, holdInputStrength()) : 0;
    player.vx += (402 - player.vx) * Math.min(1, step * 7);
    player.vy += (holdPower > 0 ? -1420 * holdPower : 760) * step;
    player.vy *= 0.982;
    player.vy = Math.max(-470, Math.min(430, player.vy));
    player.x += player.vx * step;
    player.y += player.vy * step;

    for (const mouth of level.mouths) {
      if (!mouth.passed && player.x > mouth.x + 58) {
        mouth.passed = true;
        mouth.closeTimer = MOUTH_CLOSE_SECONDS;
      }
      if (mouth.passed) {
        mouth.closeTimer -= step;
        if (mouth.closeTimer <= 0 && !mouth.closed) mouth.closed = true;
      }
      const { top, bottom } = mouthHazardRects(mouth);
      if (rectsOverlap(playerHazardRect(), top) || rectsOverlap(playerHazardRect(), bottom)) kill("mouth");
    }
  }

  function collidePlatforms(old) {
    const solids = level.platforms.filter((p) => p.kind !== "ghost-pass" && p.kind !== "decor");
    const landingTolerance = player.gravity === 1 ? 54 : 62;
    for (const p of solids) {
      if (!overlapX(player, p)) continue;
      if (player.gravity === 1 && player.vy >= 0 && old.y + player.h <= p.y + landingTolerance && player.y + player.h >= p.y) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
      if (player.gravity === -1 && player.vy <= 0 && old.y >= p.y + p.h - landingTolerance && player.y <= p.y + p.h) {
        player.y = p.y + p.h;
        player.vy = 0;
        player.onGround = true;
      }
    }
  }

  function updateCommonInteractions() {
    const pr = playerRect();
    const dangerRect = playerHazardRect();
    for (const h of level.hazards) {
      if (rectsOverlap(dangerRect, spikeHitRect(h))) kill("spike");
    }
    for (const m of level.movers) {
      if (rectsOverlap(dangerRect, movingRect(m))) kill("spike");
    }
    for (const booster of level.boosters) {
      if (!rectsOverlap(pr, booster)) continue;
      if (booster.type === "blueBoost" && !booster.used) {
        player.vy = -player.gravity * booster.power;
        player.onGround = false;
        booster.used = true;
      }
      if (booster.type === "portalDown") enterPortal(booster);
    }
    for (const dots of level.downDots) {
      if (rectsOverlap(pr, dots) && !dots.used) {
        player.vy = Math.abs(dots.power) * player.gravity;
        dots.used = true;
      }
    }
    for (const trap of level.traps) {
      if (!trap.used && rectsOverlap(pr, trap)) {
        player.vx = 430;
        player.vy = 570 * player.gravity;
        trap.used = true;
      }
    }
    for (const spring of level.trampolines) {
      if (rectsOverlap(pr, spring) && player.springCooldown <= 0 && player.vy * player.gravity >= -40) {
        player.vx = spring.vx;
        player.vy = spring.vy;
        player.springCooldown = 0.4;
      }
    }
    for (const pad of level.autoPads) {
      if (rectsOverlap(pr, pad) && !pad.used) {
        pad.used = true;
        player.vx = Math.max(player.vx, pad.vx);
        player.vy = -player.gravity * pad.power;
        player.onGround = false;
      }
    }
    for (const orb of level.orbs) {
      if (circleRectOverlap(orb.x + orb.w / 2, orb.y + orb.h / 2, orb.w / 2 + 18, pr) && keys.jump && player.orbCooldown <= 0) {
        player.vy = -player.gravity * orb.power;
        player.orbCooldown = 0.22;
        player.onGround = false;
      }
    }
    for (const ring of level.gravityRings) {
      if (circleRectOverlap(ring.x + ring.w / 2, ring.y + ring.h / 2, ring.w / 2 + 18, pr) && player.portalCooldown <= 0) {
        player.gravity = ring.targetGravity;
        player.vy = ring.targetGravity === -1 ? -Math.abs(ring.impulse) : Math.abs(ring.impulse);
        player.portalCooldown = 0.5;
      }
    }
    for (const portal of level.portals) {
      if (rectsOverlap(pr, portal)) enterPortal(portal);
    }
    if (player.y > level.world.height + 140 || player.y < -260) kill("fall");
  }

  function updatePortalTransition(step) {
    const transition = state.portalTransition;
    transition.timer += step;
    player.deadTimer = 0;
    player.onGround = false;
    player.jumpLatch = true;
    player.vx = 0;
    player.vy = 0;

    if (transition.phase === "enter") {
      const t = easeInOutCubic(transition.timer / transition.enterDuration);
      const targetX = transition.center.x - player.w / 2;
      const targetY = transition.center.y - player.h / 2;
      player.x = lerp(transition.from.x, targetX, t);
      player.y = lerp(transition.from.y, targetY, t);
      player.portalScale = lerp(1, 0.28, t);

      if (transition.timer < transition.enterDuration) return;

      if (transition.type === "finish") {
        state.portalTransition = null;
        player.portalScale = 1;
        player.x = targetX;
        player.y = targetY;
        state.finished = true;
        return;
      }

      applyPortalTarget(transition);
      transition.phase = "exit";
      transition.timer = 0;
      transition.from = {
        x: player.x,
        y: player.y,
        angle: player.angle,
        vx: player.vx,
        vy: player.vy,
      };
      player.portalScale = 0.36;
      return;
    }

    const t = easeOutBack(transition.timer / transition.exitDuration);
    player.portalScale = lerp(0.36, 1, t);
    if (transition.timer >= transition.exitDuration) {
      player.portalScale = 1;
      player.jumpLatch = false;
      player.vx = transition.target?.vx ?? 300;
      player.vy = transition.target?.vy ?? 0;
      state.portalTransition = null;
    }
  }

  function applyPortalTarget(transition) {
    const target = transition.target;
    if (!target) return;
    setMini(false);
    player.mode = target.mode;
    player.gravity = target.gravity;
    player.x = target.x;
    player.y = target.y;
    player.vx = target.vx;
    player.vy = target.vy;
    player.onGround = false;
    player.jumpLatch = false;
    player.yellowActive = false;
  }

  function enterPortal(portal) {
    const type = portal.type || portal;
    if (state.portalTransition) return;
    if (type !== "finish" && player.portalCooldown > 0) return;
    const center = portalCenter(portal);
    state.portalTransition = {
      portal,
      type,
      phase: "enter",
      timer: 0,
      enterDuration: type === "finish" ? 0.24 : 0.18,
      exitDuration: type === "finish" ? 0 : 0.18,
      from: { x: player.x, y: player.y, angle: player.angle, vx: player.vx, vy: player.vy },
      center,
      target: portalTargetSnapshot(portal),
    };
    player.portalCooldown = 0.55;
    player.onGround = false;
    player.yellowActive = false;
    player.vx *= 0.35;
    player.vy *= 0.35;
  }

  function applyTestRunInput() {
    let jump = false;
    const x = player.x;
    const variantOffset = testVariantOffset();

    if (player.mode === "plane") {
      jump = player.y + player.h / 2 > planeTargetY(x);
    } else {
      const inShiftedAction = (action) =>
        x > action.x + variantOffset && x < action.x + action.w + variantOffset;
      const holdAction = level.testActions.some((action) => action.kind === "hold" && inShiftedAction(action));
      const jumpAction = level.testActions.some((action) => action.kind !== "hold" && inShiftedAction(action));
      jump = holdAction || (player.onGround && jumpAction);
      jump ||= seesFloorSpikeAhead();
      jump ||= seesMoverAhead();
      jump ||= level.yellowZones.some((zone) => x > zone.x + 10 && x < zone.x + zone.w - 95);
      jump ||= level.orbs.some((orb) => Math.abs((orb.x + orb.w / 2) - (player.x + player.w / 2)) < 42);
      jump ||= level.gravityRings.some((ring) => Math.abs((ring.x + ring.w / 2) - (player.x + player.w / 2)) < 42);
    }
    setKey(jump);
  }

  function setKey(value) {
    const next = !!value;
    if (next === keys.jump) return;
    keys.jump = next;
    inputState.pressStartedAt = next ? state.time : null;
  }

  function seesFloorSpikeAhead() {
    if (!player.onGround) return false;
    const front = player.x + player.w;
    const bottom = player.y + player.h;
    const defaultLookAhead = player.mini
      ? 156
      : state.currentSection?.id === "start"
        ? 105
        : state.currentSection?.id === "spikes"
          ? 122
          : state.currentSection?.id === "trap"
            ? 80
            : 160;
    const lookAhead = Math.max(36, (level.testLookAhead ?? defaultLookAhead) - testVariantOffset());
    return level.hazards.some((h) => {
      const ahead = h.x >= front - 8 && h.x <= front + lookAhead;
      if (!ahead) return false;
      if (player.gravity === 1) return h.dir === "up" && h.y >= bottom - 78 && h.y <= bottom + 18;
      return h.dir === "down" && h.y + h.h <= player.y + 86 && h.y + h.h >= player.y - 24;
    });
  }

  function seesMoverAhead() {
    if (!player.onGround) return false;
    const front = player.x + player.w;
    const lookAhead = Math.max(48, (level.testMoverLookAhead ?? 170) - testVariantOffset());
    return level.movers.some((m) => {
      const r = movingRect(m);
      const ahead = r.x >= front - 10 && r.x <= front + lookAhead;
      const sameLane = r.y + r.h >= player.y - 40 && r.y <= player.y + player.h + 120;
      return ahead && sameLane;
    });
  }

  function testVariantOffset() {
    if (!variantShiftSeconds) return 0;
    return Math.round((player.vx || targetSpeed()) * variantShiftSeconds);
  }

  function holdInputStrength() {
    if (!keys.jump) return 0;
    return 1;
  }

  function updateMiniMode() {
    setMini(level.miniZones.some((zone) => rectsOverlap(playerRect(), zone)));
  }

  function setMini(enabled) {
    const size = enabled ? 26 : 34;
    if (player.w === size) {
      player.mini = enabled;
      return;
    }
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    player.w = size;
    player.h = size;
    player.x = cx - size / 2;
    player.y = cy - size / 2;
    player.mini = enabled;
  }

  function spikeHitRect(h) {
    const fall = fallingSpikeProgress(h);
    if (h.falling && fall < (h.falling.activeAt ?? 0.3)) return { x: h.x, y: h.y, w: 0, h: 0 };
    const pop = spikePopProgress(h);
    if (h.popup && pop < 0.48) return { x: h.x, y: h.y, w: 0, h: 0 };
    const spikeRect = animatedSpikeRect(h);
    const insetX = Math.min(6, h.w * 0.08);
    const activeH = (h.h - Math.min(6, h.h * 0.18)) * (h.popup ? Math.max(0.28, pop) : 1);
    return {
      x: spikeRect.x + insetX,
      y: spikeRect.dir === "down" ? spikeRect.y : spikeRect.y + spikeRect.h - activeH,
      w: Math.max(4, h.w - insetX * 2),
      h: activeH,
    };
  }

  function spikePopProgress(h) {
    if (!h.popup) return 1;
    const triggerDistance = h.popup.triggerDistance ?? 280;
    const extendDistance = h.popup.extendDistance ?? 150;
    const leadX = h.x - triggerDistance;
    return clamp01((player.x + player.w - leadX) / extendDistance);
  }

  function fallingSpikeProgress(h) {
    if (!h.falling) return 1;
    const triggerDistance = h.falling.triggerDistance ?? 520;
    const armDistance = h.falling.armDistance ?? h.falling.extendDistance ?? 260;
    const leadX = h.x - triggerDistance;
    return clamp01((player.x + player.w - leadX) / armDistance);
  }

  function fallingSpikeDistance(h) {
    return h.falling?.fallDistance ?? Math.max(120, h.h * 4);
  }

  function animatedSpikeRect(h) {
    if (h.falling) {
      const fall = easeInOutCubic(fallingSpikeProgress(h));
      const shift = fallingSpikeDistance(h) * (1 - fall);
      return { ...h, y: h.dir === "down" ? h.y - shift : h.y + shift };
    }
    if (!h.popup) return h;
    const pop = spikePopProgress(h);
    const hiddenOffset = h.popup.hiddenOffset ?? h.h;
    const shift = hiddenOffset * (1 - pop);
    return { ...h, y: h.dir === "down" ? h.y - shift : h.y + shift };
  }

  function movingRect(m) {
    const offset = Math.sin(state.time * m.speed + m.phase) * m.amp;
    return {
      x: m.axis === "x" ? m.x + offset : m.x,
      y: m.axis === "y" ? m.y + offset : m.y,
      w: m.w,
      h: m.h,
      kind: m.kind,
    };
  }

  function mouthHazardRects(m) {
    const progress = m.closed ? 1 : !m.passed ? 0 : clamp01(1 - Math.max(0, m.closeTimer) / MOUTH_CLOSE_SECONDS);
    const maxClose = m.gapH / 2;
    const topBottom = m.gapY + maxClose * progress;
    const bottomTop = m.gapY + m.gapH - maxClose * progress;
    const top = { x: m.x, y: m.top, w: 74, h: Math.max(1, topBottom - m.top) };
    const bottom = { x: m.x, y: bottomTop, w: 74, h: Math.max(1, m.bottom - bottomTop) };
    return {
      top: { x: top.x, y: top.y, w: top.w, h: top.h + MOUTH_TOOTH_HIT_H },
      bottom: { x: bottom.x, y: bottom.y - MOUTH_TOOTH_HIT_H, w: bottom.w, h: bottom.h + MOUTH_TOOTH_HIT_H },
    };
  }

  function portalCenter(portal) {
    return { x: portal.x + portal.w / 2, y: portal.y + portal.h / 2 };
  }

  function portalTargetSnapshot(portal) {
    if (!portal.target) return null;
    return {
      x: portal.target.x,
      y: portal.target.y,
      mode: portal.target.mode,
      gravity: portal.target.gravity,
      vx: portal.target.mode === "plane" ? 318 : 300,
      vy: 0,
    };
  }

  function playerRect() {
    return { x: player.x, y: player.y, w: player.w, h: player.h };
  }

  function playerHazardRect() {
    return { x: player.x + 5, y: player.y + 5, w: player.w - 10, h: player.h - 10 };
  }

  function activeSection() {
    return level.sections.find((section) => player.x >= section.x && player.x < section.x + section.w) || level.sections.at(-1);
  }

  function levelProgress() {
    return Math.max(0, Math.min(1, (player.x + player.w) / playableEndX));
  }

  function kill(reason) {
    if (state.lastDeath || state.finished) return;
    state.lastDeath = reason;
    state.lastDeathAt = {
      x: Math.round(player.x),
      y: Math.round(player.y),
      section: state.currentSection?.id,
      progress: Math.round(levelProgress() * 1000) / 10,
    };
  }

  function planeTargetY(x) {
    if (level.number === 2) {
      if (x < scaleLevelX(5480)) return 990;
      if (x < scaleLevelX(5840)) return 1060;
      if (x < scaleLevelX(6160)) return 970;
      if (x < scaleLevelX(6500)) return 1085;
      return 1015;
    }
    if (level.number === 3) {
      if (x < scaleLevelX(5480)) return 1060;
      if (x < scaleLevelX(5840)) return 980;
      if (x < scaleLevelX(6160)) return 1105;
      if (x < scaleLevelX(6500)) return 995;
      return 1070;
    }
    if (x < scaleLevelX(5520)) return 1060;
    if (x < scaleLevelX(5900)) return 1050;
    if (x < scaleLevelX(6040)) return 1010;
    if (x < scaleLevelX(6500)) return 1120;
    return 1070;
  }

  function scaleLevelX(x) {
    return Math.round(x * level.scale);
  }
}

function normalizeVariant(value) {
  const normalized = String(value || "perfect").toLowerCase();
  if (normalized === "early" || normalized === "early-jump") return "early";
  if (normalized === "late" || normalized === "late-jump") return "late";
  return "perfect";
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function overlapX(a, b) {
  return a.x + a.w > b.x && a.x < b.x + b.w;
}

function circleRectOverlap(cx, cy, radius, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= radius * radius;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOutCubic(t) {
  const v = clamp01(t);
  return v < 0.5 ? 4 * v * v * v : 1 - ((-2 * v + 2) ** 3) / 2;
}

function easeOutBack(t) {
  const v = clamp01(t) - 1;
  return 1 + 2.2 * v * v * v + 1.2 * v * v;
}

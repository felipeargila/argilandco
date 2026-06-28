const intro = document.getElementById("intro");
const experience = document.getElementById("experience");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const compass = document.getElementById("compass");
const core = document.getElementById("core");
const status = document.getElementById("status");
const complete = document.getElementById("complete");

const state = {
  started: false,
  locked: false,
  dragging: false,
  raf: null,
  size: 0,
  radius: 0,
  coreRadius: 17,
  targetRadius: 18,
  x: 72,
  y: 72,
  vx: 0,
  vy: 0,
  gravityX: 0,
  gravityY: 0,
  lastTime: performance.now(),
};

const CONFIG = {
  sensorForce: 0.00135,
  desktopForce: 0.0011,
  friction: 0.988,
  bounce: 0.46,
  maxSpeed: 1.18,
  magnetDistance: 86,
  lockDistance: 14,
  magnetForce: 0.00095,
};

function measure() {
  const rect = compass.getBoundingClientRect();
  state.size = rect.width;
  state.radius = rect.width / 2 - state.coreRadius - 15;
}

function center() {
  return {
    x: state.size / 2,
    y: state.size / 2,
  };
}

function setCorePosition() {
  core.style.transform = `translate3d(${state.x - state.coreRadius}px, ${state.y - state.coreRadius}px, 0)`;
}

function resetExperience() {
  measure();
  const c = center();
  state.locked = false;
  state.x = c.x - state.size * 0.28;
  state.y = c.y - state.size * 0.22;
  state.vx = 0;
  state.vy = 0;
  state.gravityX = 0;
  state.gravityY = 0;
  compass.classList.remove("locked");
  complete.classList.add("hidden");
  status.textContent = "Incline o telefone até encontrar o centro.";
  setCorePosition();
}

async function requestMotionPermission() {
  const deviceOrientation = window.DeviceOrientationEvent;

  if (deviceOrientation && typeof deviceOrientation.requestPermission === "function") {
    const permission = await deviceOrientation.requestPermission();
    return permission === "granted";
  }

  return true;
}

async function start() {
  const granted = await requestMotionPermission();

  if (!granted) {
    status.textContent = "Permissão negada. No desktop, você ainda pode arrastar o núcleo.";
    return;
  }

  intro.classList.add("hidden");
  experience.classList.remove("hidden");
  state.started = true;

  requestAnimationFrame(() => {
    resetExperience();
    bindMotion();
    bindPointerFallback();
    animate(performance.now());
  });
}

function bindMotion() {
  window.addEventListener("deviceorientation", (event) => {
    if (!state.started || state.dragging || state.locked) return;

    const gamma = event.gamma || 0; // esquerda/direita
    const beta = event.beta || 0; // frente/trás

    state.gravityX = clamp(gamma, -35, 35) * CONFIG.sensorForce;
    state.gravityY = clamp(beta - 35, -35, 35) * CONFIG.sensorForce;
  }, true);
}

function bindPointerFallback() {
  let pointerId = null;

  core.addEventListener("pointerdown", (event) => {
    if (state.locked) return;
    state.dragging = true;
    pointerId = event.pointerId;
    core.setPointerCapture(pointerId);
    state.vx = 0;
    state.vy = 0;
  });

  core.addEventListener("pointermove", (event) => {
    if (!state.dragging || event.pointerId !== pointerId) return;
    const rect = compass.getBoundingClientRect();
    state.x = event.clientX - rect.left;
    state.y = event.clientY - rect.top;
    keepInsideCircle();
    setCorePosition();
    checkLock();
  });

  core.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pointerId) return;
    state.dragging = false;
    pointerId = null;
  });

  compass.addEventListener("pointermove", (event) => {
    if (state.started && !state.dragging && !state.locked && !hasTouch()) {
      const rect = compass.getBoundingClientRect();
      const c = center();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      state.gravityX = (mx - c.x) * CONFIG.desktopForce;
      state.gravityY = (my - c.y) * CONFIG.desktopForce;
    }
  });
}

function animate(now) {
  const dt = Math.min(now - state.lastTime, 32);
  state.lastTime = now;

  if (!state.dragging && !state.locked) {
    applyPhysics(dt);
    checkLock();
    setCorePosition();
  }

  state.raf = requestAnimationFrame(animate);
}

function applyPhysics(dt) {
  const c = center();
  const dx = c.x - state.x;
  const dy = c.y - state.y;
  const distance = Math.hypot(dx, dy);

  state.vx += state.gravityX * dt;
  state.vy += state.gravityY * dt;

  if (distance < CONFIG.magnetDistance) {
    state.vx += dx * CONFIG.magnetForce * dt;
    state.vy += dy * CONFIG.magnetForce * dt;
    status.textContent = "Quase. O centro começou a puxar.";
  } else {
    status.textContent = "Incline o telefone até encontrar o centro.";
  }

  state.vx *= CONFIG.friction;
  state.vy *= CONFIG.friction;

  state.vx = clamp(state.vx, -CONFIG.maxSpeed, CONFIG.maxSpeed);
  state.vy = clamp(state.vy, -CONFIG.maxSpeed, CONFIG.maxSpeed);

  state.x += state.vx * dt;
  state.y += state.vy * dt;

  keepInsideCircle();
}

function keepInsideCircle() {
  const c = center();
  const dx = state.x - c.x;
  const dy = state.y - c.y;
  const distance = Math.hypot(dx, dy);

  if (distance > state.radius) {
    const nx = dx / distance;
    const ny = dy / distance;

    state.x = c.x + nx * state.radius;
    state.y = c.y + ny * state.radius;

    const dot = state.vx * nx + state.vy * ny;
    state.vx -= (1 + CONFIG.bounce) * dot * nx;
    state.vy -= (1 + CONFIG.bounce) * dot * ny;
  }
}

function checkLock() {
  const c = center();
  const distance = Math.hypot(state.x - c.x, state.y - c.y);

  if (distance <= CONFIG.lockDistance) {
    lockCore();
  }
}

function lockCore() {
  if (state.locked) return;

  const c = center();
  state.locked = true;
  state.x = c.x;
  state.y = c.y;
  state.vx = 0;
  state.vy = 0;

  compass.classList.add("locked");
  status.textContent = "Encaixou.";
  complete.classList.remove("hidden");
  setCorePosition();

  if (navigator.vibrate) navigator.vibrate([50, 30, 90]);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hasTouch() {
  return navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
}

startButton.addEventListener("click", start);
resetButton.addEventListener("click", resetExperience);
window.addEventListener("resize", resetExperience);

const intro = document.getElementById("intro");
const experience = document.getElementById("experience");
const home = document.getElementById("home");
const startBtn = document.getElementById("startBtn");
const pieces = Array.from(document.querySelectorAll(".piece"));
const svg = document.getElementById("symbolSvg");
const targets = Array.from(document.querySelectorAll(".target"));
const mark = document.getElementById("mark");
const whiteCore = document.getElementById("whiteCore");
const whiteTransition = document.getElementById("whiteTransition");
const message = document.getElementById("message");
const instruction = document.getElementById("instruction");

const state = {
  ax: 0,
  ay: 0,
  dragging: null,
  completed: false,
  slots: [
    { cx: 300, cy: 300, label: "Estratégia", filled: false },
    { cx: 700, cy: 300, label: "Identidade", filled: false },
    { cx: 700, cy: 700, label: "Experiência", filled: false },
    { cx: 300, cy: 700, label: "Comunicação", filled: false }
  ],
  items: []
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function distance(a, b, c, d) {
  return Math.hypot(a - c, b - d);
}

function setScreen(screen) {
  intro.classList.remove("active");
  experience.classList.remove("active");
  home.classList.remove("active");
  screen.classList.add("active");
}

function svgPointToClient(cx, cy) {
  const pt = svg.createSVGPoint();
  pt.x = cx;
  pt.y = cy;
  const matrix = svg.getScreenCTM();
  const p = pt.matrixTransform(matrix);
  return { x: p.x, y: p.y };
}

function getPieceSize() {
  const rect = svg.getBoundingClientRect();
  return rect.width * 0.6; // 300 radius no SVG sobre 1000 viewBox = 60% do grid unit.
}

function applyPieceSize() {
  const size = getPieceSize();
  document.documentElement.style.setProperty("--piece-size", `${size}px`);
  return size;
}

function layoutPieces() {
  const size = applyPieceSize();
  const gap = Math.min(18, window.innerWidth * 0.035);
  const total = size * 4 + gap * 3;
  const startX = (window.innerWidth - total) / 2;
  const y = window.innerHeight - size - Math.max(96, window.innerHeight * 0.11);

  state.items = pieces.map((el, i) => {
    const x = startX + i * (size + gap);
    return {
      el,
      id: i,
      slot: null,
      locked: false,
      x,
      y,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      baseX: x,
      baseY: y
    };
  });

  state.items.forEach(renderItem);
}

function renderItem(item) {
  item.el.style.setProperty("--x", `${item.x}px`);
  item.el.style.setProperty("--y", `${item.y}px`);
}

async function requestMotionPermission() {
  try {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const result = await DeviceOrientationEvent.requestPermission();
      return result === "granted";
    }
  } catch (e) {
    return false;
  }
  return true;
}

function startMotion() {
  window.addEventListener("deviceorientation", (event) => {
    if (state.completed) return;

    const gamma = event.gamma || 0;
    const beta = event.beta || 0;

    state.ax = clamp(gamma / 45, -1, 1);
    state.ay = clamp(beta / 45, -1, 1);
  }, true);
}

function physicsTick() {
  if (!experience.classList.contains("active") || state.completed) {
    requestAnimationFrame(physicsTick);
    return;
  }

  const size = getPieceSize();
  const floorY = window.innerHeight - size - Math.max(96, window.innerHeight * 0.11);
  const minX = 22;
  const maxX = window.innerWidth - size - 22;
  const minY = window.innerHeight * 0.58;
  const maxY = window.innerHeight - size - Math.max(68, window.innerHeight * 0.08);

  state.items.forEach((item) => {
    if (item.locked || item === state.dragging) return;

    item.vx += state.ax * 0.085;
    item.vy += state.ay * 0.085;

    item.vx += (item.baseX - item.x) * 0.0025;
    item.vy += (floorY - item.y) * 0.0025;

    item.vx *= 0.93;
    item.vy *= 0.93;

    item.x += item.vx;
    item.y += item.vy;

    if (item.x < minX) { item.x = minX; item.vx *= -0.42; }
    if (item.x > maxX) { item.x = maxX; item.vx *= -0.42; }
    if (item.y < minY) { item.y = minY; item.vy *= -0.35; }
    if (item.y > maxY) { item.y = maxY; item.vy *= -0.35; }

    renderItem(item);
  });

  requestAnimationFrame(physicsTick);
}

function nearestOpenSlot(item) {
  const size = getPieceSize();
  const centerX = item.x + size / 2;
  const centerY = item.y + size / 2;
  let best = null;

  state.slots.forEach((slot, index) => {
    if (slot.filled) return;
    const p = svgPointToClient(slot.cx, slot.cy);
    const d = distance(centerX, centerY, p.x, p.y);
    if (!best || d < best.d) {
      best = { index, d, x: p.x, y: p.y };
    }
  });

  return best;
}

function lockItem(item, slotIndex) {
  const size = getPieceSize();
  const slot = state.slots[slotIndex];
  const p = svgPointToClient(slot.cx, slot.cy);

  item.locked = true;
  item.slot = slotIndex;
  item.x = p.x - size / 2;
  item.y = p.y - size / 2;
  item.vx = 0;
  item.vy = 0;

  slot.filled = true;

  item.el.classList.remove("dragging");
  item.el.classList.add("locked");
  renderItem(item);

  targets[slotIndex].classList.add("locked");

  if (navigator.vibrate) navigator.vibrate(45);

  checkCompletion();
}

function checkCompletion() {
  const done = state.slots.every(slot => slot.filled);
  if (!done) return;

  state.completed = true;
  document.body.classList.add("completed");

  setTimeout(() => {
    mark.classList.add("reveal");
    whiteCore.classList.add("active");
    if (navigator.vibrate) navigator.vibrate([50, 40, 70]);
  }, 220);

  setTimeout(() => {
    message.innerHTML = "Você já chegou até aqui.<br>Agora é hora de buscar novos horizontes.";
    message.classList.add("show");
  }, 950);

  setTimeout(() => {
    document.body.classList.add("zooming");
    whiteTransition.classList.add("go");
  }, 2300);

  setTimeout(() => {
    setScreen(home);
  }, 3450);
}

function bindDrag() {
  pieces.forEach((el, id) => {
    el.addEventListener("pointerdown", (event) => {
      const item = state.items[id];
      if (!item || item.locked || state.completed) return;

      el.setPointerCapture(event.pointerId);
      state.dragging = item;
      item.dragOffsetX = event.clientX - item.x;
      item.dragOffsetY = event.clientY - item.y;
      item.vx = 0;
      item.vy = 0;
      el.classList.add("dragging");
    });

    el.addEventListener("pointermove", (event) => {
      const item = state.items[id];
      if (state.dragging !== item || item.locked) return;

      item.x = event.clientX - item.dragOffsetX;
      item.y = event.clientY - item.dragOffsetY;

      const near = nearestOpenSlot(item);
      if (near && near.d < getPieceSize() * 0.55) {
        const targetX = near.x - getPieceSize() / 2;
        const targetY = near.y - getPieceSize() / 2;
        item.x += (targetX - item.x) * 0.16;
        item.y += (targetY - item.y) * 0.16;
      }

      renderItem(item);
    });

    el.addEventListener("pointerup", () => {
      const item = state.items[id];
      if (state.dragging !== item || item.locked) return;

      const near = nearestOpenSlot(item);
      el.classList.remove("dragging");
      state.dragging = null;

      if (near && near.d < getPieceSize() * 0.42) {
        lockItem(item, near.index);
      }
    });

    el.addEventListener("pointercancel", () => {
      const item = state.items[id];
      if (state.dragging === item) {
        el.classList.remove("dragging");
        state.dragging = null;
      }
    });
  });
}

startBtn.addEventListener("click", async () => {
  await requestMotionPermission();
  setScreen(experience);
  layoutPieces();
  startMotion();
});

window.addEventListener("resize", () => {
  if (!experience.classList.contains("active")) return;

  const oldLocked = state.items.filter(item => item.locked).map(item => item.id);
  layoutPieces();
  oldLocked.forEach(id => {
    const item = state.items[id];
    const slotIndex = state.slots.findIndex((slot, i) => slot.filled && !state.items.some(other => other !== item && other.slot === i));
    if (slotIndex >= 0) {
      const p = svgPointToClient(state.slots[slotIndex].cx, state.slots[slotIndex].cy);
      const size = getPieceSize();
      item.locked = true;
      item.slot = slotIndex;
      item.x = p.x - size / 2;
      item.y = p.y - size / 2;
      item.el.classList.add("locked");
      renderItem(item);
    }
  });
});

bindDrag();
requestAnimationFrame(physicsTick);

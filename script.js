
const intro = document.getElementById("intro");
const experience = document.getElementById("experience");
const home = document.getElementById("home");
const startBtn = document.getElementById("startBtn");
const svg = document.getElementById("symbolSvg");
const pieces = Array.from(document.querySelectorAll(".piece"));
const targetCircles = Array.from(document.querySelectorAll("#targetCircles circle"));
const finalMark = document.getElementById("finalMark");
const zoomCore = document.getElementById("zoomCore");
const whiteOut = document.getElementById("whiteOut");
const message = document.getElementById("message");

const GEOMETRY = {
  viewBox: 500,
  grid: 5,
  radius: 150,
  slots: [
    { cx: 150, cy: 150, label: "Estratégia" },
    { cx: 350, cy: 150, label: "Identidade" },
    { cx: 350, cy: 350, label: "Experiência" },
    { cx: 150, cy: 350, label: "Comunicação" }
  ]
};

const state = {
  ax: 0,
  ay: 0,
  dragging: null,
  completed: false,
  items: []
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function screenFromSvg(x, y) {
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const transformed = pt.matrixTransform(svg.getScreenCTM());
  return { x: transformed.x, y: transformed.y };
}

function setScreen(el) {
  intro.classList.remove("active");
  experience.classList.remove("active");
  home.classList.remove("active");
  el.classList.add("active");
}

function pieceSize() {
  const rect = svg.getBoundingClientRect();
  const size = rect.width * (GEOMETRY.radius * 2 / GEOMETRY.viewBox);
  document.documentElement.style.setProperty("--piece-size", size + "px");
  return size;
}

function positionPiecesAtBase() {
  const size = pieceSize();
  const gap = Math.max(10, Math.min(18, window.innerWidth * 0.032));
  const total = (size * 4) + (gap * 3);
  const start = (window.innerWidth - total) / 2;
  const baseY = window.innerHeight - size - Math.max(94, window.innerHeight * 0.12);

  state.items = pieces.map((el, index) => {
    const item = {
      id: index,
      el,
      x: start + index * (size + gap),
      y: baseY,
      baseX: start + index * (size + gap),
      baseY,
      vx: (Math.random() - .5) * .5,
      vy: (Math.random() - .5) * .5,
      locked: false,
      slot: null,
      filled: false
    };

    render(item);
    el.classList.remove("locked", "dragging");
    return item;
  });
}

function render(item) {
  item.el.style.setProperty("--x", item.x + "px");
  item.el.style.setProperty("--y", item.y + "px");
}

async function requestMotionPermission() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      await DeviceOrientationEvent.requestPermission();
    } catch (e) {}
  }
}

function startMotion() {
  window.addEventListener("deviceorientation", (e) => {
    if (state.completed) return;
    const gamma = e.gamma || 0;
    const beta = e.beta || 0;
    state.ax = clamp(gamma / 40, -1, 1);
    state.ay = clamp(beta / 40, -1, 1);
  }, true);
}

function physics() {
  if (experience.classList.contains("active") && !state.completed) {
    const size = pieceSize();
    const minX = 18;
    const maxX = window.innerWidth - size - 18;
    const minY = window.innerHeight * .56;
    const maxY = window.innerHeight - size - Math.max(64, window.innerHeight * .08);

    state.items.forEach((item) => {
      if (item.locked || item === state.dragging) return;

      item.vx += state.ax * 0.075;
      item.vy += state.ay * 0.075;

      item.vx += (item.baseX - item.x) * 0.002;
      item.vy += (item.baseY - item.y) * 0.002;

      item.vx *= 0.925;
      item.vy *= 0.925;

      item.x += item.vx;
      item.y += item.vy;

      if (item.x < minX) { item.x = minX; item.vx *= -0.45; }
      if (item.x > maxX) { item.x = maxX; item.vx *= -0.45; }
      if (item.y < minY) { item.y = minY; item.vy *= -0.45; }
      if (item.y > maxY) { item.y = maxY; item.vy *= -0.45; }

      render(item);
    });
  }

  requestAnimationFrame(physics);
}

function getOpenSlots() {
  return GEOMETRY.slots
    .map((slot, index) => ({ ...slot, index }))
    .filter((slot) => !state.items.some((item) => item.locked && item.slot === slot.index));
}

function nearestSlot(item) {
  const size = pieceSize();
  const cx = item.x + size / 2;
  const cy = item.y + size / 2;

  let best = null;
  getOpenSlots().forEach((slot) => {
    const point = screenFromSvg(slot.cx, slot.cy);
    const d = dist(cx, cy, point.x, point.y);

    if (!best || d < best.distance) {
      best = { ...slot, x: point.x, y: point.y, distance: d };
    }
  });

  return best;
}

function lockToSlot(item, slot) {
  const size = pieceSize();
  item.locked = true;
  item.slot = slot.index;
  item.x = slot.x - size / 2;
  item.y = slot.y - size / 2;
  item.vx = 0;
  item.vy = 0;

  item.el.classList.remove("dragging");
  item.el.classList.add("locked");
  targetCircles[slot.index].classList.add("locked");

  render(item);

  if (navigator.vibrate) navigator.vibrate(45);
  checkCompletion();
}

function checkCompletion() {
  if (!state.items.every((item) => item.locked)) return;

  state.completed = true;
  document.body.classList.add("completed");

  setTimeout(() => {
    finalMark.classList.add("revealed");
    zoomCore.classList.add("on");
    if (navigator.vibrate) navigator.vibrate([45, 40, 80]);
  }, 240);

  setTimeout(() => {
    message.innerHTML = "Você já chegou até aqui.<br>Agora é hora de buscar novos horizontes.";
    message.classList.add("show");
  }, 950);

  setTimeout(() => {
    document.body.classList.add("zooming");
    whiteOut.classList.add("go");
  }, 2450);

  setTimeout(() => {
    setScreen(home);
  }, 3550);
}

function bindDragging() {
  pieces.forEach((el, index) => {
    el.addEventListener("pointerdown", (event) => {
      const item = state.items[index];
      if (!item || item.locked || state.completed) return;

      state.dragging = item;
      item.offsetX = event.clientX - item.x;
      item.offsetY = event.clientY - item.y;
      item.vx = 0;
      item.vy = 0;

      el.classList.add("dragging");
      el.setPointerCapture(event.pointerId);
    });

    el.addEventListener("pointermove", (event) => {
      const item = state.items[index];
      if (state.dragging !== item || item.locked) return;

      item.x = event.clientX - item.offsetX;
      item.y = event.clientY - item.offsetY;

      const slot = nearestSlot(item);
      if (slot && slot.distance < pieceSize() * .72) {
        const size = pieceSize();
        const targetX = slot.x - size / 2;
        const targetY = slot.y - size / 2;
        item.x += (targetX - item.x) * .18;
        item.y += (targetY - item.y) * .18;
      }

      render(item);
    });

    function release() {
      const item = state.items[index];
      if (state.dragging !== item || item.locked) return;

      el.classList.remove("dragging");
      state.dragging = null;

      const slot = nearestSlot(item);
      if (slot && slot.distance < pieceSize() * .44) {
        lockToSlot(item, slot);
      }
    }

    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
  });
}

startBtn.addEventListener("click", async () => {
  await requestMotionPermission();
  setScreen(experience);
  positionPiecesAtBase();
  startMotion();
});

window.addEventListener("resize", () => {
  if (experience.classList.contains("active") && !state.completed) {
    positionPiecesAtBase();
  }
});

bindDragging();
requestAnimationFrame(physics);

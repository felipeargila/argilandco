const intro = document.getElementById("intro");
const experience = document.getElementById("experience");
const home = document.getElementById("home");
const startBtn = document.getElementById("startBtn");
const stage = document.getElementById("stage");
const symbolSvg = document.getElementById("symbolSvg");
const piecesSvg = document.getElementById("piecesSvg");
const targetCircles = Array.from(document.querySelectorAll(".target-circle"));
const slotLabels = Array.from(document.querySelectorAll("#slotLabels text"));
const finalMark = document.getElementById("finalMark");
const zoomCore = document.getElementById("zoomCore");
const message = document.getElementById("message");

const GEOMETRY = {
  viewBox: 500,
  radius: 150,
  slots: [
    { cx: 150, cy: 150, label: "ESTRATÉGIA" },
    { cx: 350, cy: 150, label: "IDENTIDADE" },
    { cx: 350, cy: 350, label: "EXPERIÊNCIA" },
    { cx: 150, cy: 350, label: "COMUNICAÇÃO" }
  ]
};

const state = {
  ax: 0,
  ay: 0,
  dragging: null,
  completed: false,
  startedMotion: false,
  items: []
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function setScreen(el) {
  intro.classList.remove("active");
  experience.classList.remove("active");
  home.classList.remove("active");
  el.classList.add("active");
}

function svgToScreen(x, y) {
  const pt = symbolSvg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  return pt.matrixTransform(symbolSvg.getScreenCTM());
}

function currentScale() {
  return symbolSvg.getBoundingClientRect().width / GEOMETRY.viewBox;
}

function currentRadius() {
  return GEOMETRY.radius * currentScale();
}

function setupPiecesSvg() {
  piecesSvg.setAttribute("width", window.innerWidth);
  piecesSvg.setAttribute("height", window.innerHeight);
  piecesSvg.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
}

function createPieces() {
  piecesSvg.innerHTML = "";
  const r = currentRadius();

  state.items = GEOMETRY.slots.map((slot, index) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    node.setAttribute("class", "piece-circle");
    node.setAttribute("r", r);
    node.setAttribute("data-piece", index);
    node.setAttribute("aria-label", slot.label);
    piecesSvg.appendChild(node);

    const item = {
      id: index,
      slot: null,
      label: slot.label,
      node,
      x: window.innerWidth / 2,
      y: -r - (index * r * 0.28),
      baseX: window.innerWidth * (0.22 + index * 0.185),
      baseY: window.innerHeight - r - Math.max(132, window.innerHeight * 0.16) + ((index % 2) ? 8 : -5),
      vx: 0,
      vy: 0,
      locked: false,
      dropping: true,
      dropDelay: index * 180
    };

    bindPiece(item);
    render(item);
    return item;
  });
}

function render(item) {
  item.node.setAttribute("cx", item.x);
  item.node.setAttribute("cy", item.y);
  item.node.setAttribute("r", currentRadius());
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
  if (state.startedMotion) return;
  state.startedMotion = true;

  window.addEventListener("deviceorientation", (e) => {
    if (state.completed) return;
    state.ax = clamp((e.gamma || 0) / 32, -1, 1);
    state.ay = clamp((e.beta || 0) / 32, -1, 1);
  }, true);
}

function nearestOpenSlot(item) {
  let best = null;
  const openSlots = GEOMETRY.slots
    .map((slot, index) => ({...slot, index}))
    .filter(slot => !state.items.some(item => item.locked && item.slot === slot.index));

  openSlots.forEach(slot => {
    const p = svgToScreen(slot.cx, slot.cy);
    const d = distance(item.x, item.y, p.x, p.y);
    if (!best || d < best.d) {
      best = { ...slot, x: p.x, y: p.y, d };
    }
  });

  return best;
}

function lockItem(item, slot) {
  item.locked = true;
  item.slot = slot.index;
  item.x = slot.x;
  item.y = slot.y;
  item.vx = 0;
  item.vy = 0;

  item.node.classList.remove("dragging");
  item.node.classList.add("locked");
  item.node.style.pointerEvents = "none";

  targetCircles[slot.index].classList.add("locked");
  slotLabels[slot.index].classList.add("show");

  render(item);

  if (navigator.vibrate) navigator.vibrate(45);
  checkComplete();
}

function checkComplete() {
  if (!state.items.every(item => item.locked)) return;

  state.completed = true;
  document.body.classList.add("completed");

  setTimeout(() => {
    finalMark.classList.add("revealed");
    zoomCore.classList.add("on");
    if (navigator.vibrate) navigator.vibrate([45, 40, 80]);
  }, 260);

  setTimeout(() => {
    document.body.classList.add("copy-phase");
    message.innerHTML=`<span class="message-title">Marcas criam realidades.<br>Eu crio marcas.</span>`;
    message.classList.add("show");
  }, 1150);

  // tempo de leitura antes da tela rolar sozinha para o menu
  setTimeout(() => {
    revealHome();
  }, 3800);
}

function revealHome() {
  document.body.classList.add("home-revealing");
  home.classList.add("active");

  setTimeout(() => {
    experience.classList.remove("active");
    document.body.classList.add("home-final");
  }, 1350);
}

function bindPiece(item) {
  item.node.addEventListener("pointerdown", (event) => {
    if (item.locked || state.completed) return;

    item.node.setPointerCapture(event.pointerId);
    state.dragging = item;
    item.dragOffsetX = event.clientX - item.x;
    item.dragOffsetY = event.clientY - item.y;
    item.vx = 0;
    item.vy = 0;
    item.dropping = false;
    item.node.classList.add("dragging");
  });

  item.node.addEventListener("pointermove", (event) => {
    if (state.dragging !== item || item.locked) return;

    item.x = event.clientX - item.dragOffsetX;
    item.y = event.clientY - item.dragOffsetY;

    const slot = nearestOpenSlot(item);
    const snapDistance = currentRadius() * 0.62;

    if (slot && slot.d < snapDistance) {
      item.x += (slot.x - item.x) * 0.20;
      item.y += (slot.y - item.y) * 0.20;
    }

    render(item);
  });

  const release = () => {
    if (state.dragging !== item || item.locked) return;

    state.dragging = null;
    item.node.classList.remove("dragging");

    const slot = nearestOpenSlot(item);
    if (slot && slot.d < currentRadius() * 0.42) {
      lockItem(item, slot);
    }
  };

  item.node.addEventListener("pointerup", release);
  item.node.addEventListener("pointercancel", release);
}

function animate(timestamp) {
  if (experience.classList.contains("active") && !state.completed) {
    const r = currentRadius();
    const minX = r + 12;
    const maxX = window.innerWidth - r - 12;
    const maxY = window.innerHeight - r - Math.max(124, window.innerHeight * 0.14);
    const minY = window.innerHeight * 0.52;

    state.items.forEach(item => {
      if (item.locked || state.dragging === item) return;

      if (item.dropDelay > 0) {
        item.dropDelay -= 16.7;
        render(item);
        return;
      }

      if (item.dropping) {
        item.vy += 1.10;
        item.y += item.vy;

        if (item.y >= item.baseY) {
          item.y = item.baseY;
          item.vy *= -0.42;

          if (Math.abs(item.vy) < 2.1) {
            item.vy = 0;
            item.dropping = false;
          }

          if (navigator.vibrate && Math.abs(item.vy) > 3) navigator.vibrate(18);
        }

        item.x += (item.baseX - item.x) * 0.09;
      } else {
        item.vx += state.ax * 0.18;
        item.vy += state.ay * 0.18;

        item.vx += (item.baseX - item.x) * 0.004;
        item.vy += (item.baseY - item.y) * 0.004;

        item.vx *= 0.91;
        item.vy *= 0.91;

        item.x += item.vx;
        item.y += item.vy;

        if (item.x < minX) { item.x = minX; item.vx *= -0.42; }
        if (item.x > maxX) { item.x = maxX; item.vx *= -0.42; }
        if (item.y < minY) { item.y = minY; item.vy *= -0.42; }
        if (item.y > maxY) { item.y = maxY; item.vy *= -0.42; }
      }

      render(item);
    });
  }

  requestAnimationFrame(animate);
}

startBtn.addEventListener("click", async () => {
  await requestMotionPermission();
  setScreen(experience);
  setupPiecesSvg();
  createPieces();
  startMotion();
});

window.addEventListener("resize", () => {
  if (!experience.classList.contains("active") || state.completed) return;
  setupPiecesSvg();
  createPieces();
});

requestAnimationFrame(animate);

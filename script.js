const intro = document.getElementById('intro');
const experience = document.getElementById('experience');
const website = document.getElementById('website');
const startButton = document.getElementById('startButton');
const permissionHint = document.getElementById('permissionHint');
const compass = document.getElementById('compass');
const stage = document.getElementById('stage');
const axis = document.getElementById('axis');
const instruction = document.getElementById('instruction');
const completionText = document.getElementById('completionText');
const whiteTransition = document.getElementById('whiteTransition');

const state = {
  running: false,
  locked: false,
  dragging: false,
  pointerId: null,
  size: 420,
  radius: 210,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  gx: 0,
  gy: 0.14,
  lastTime: performance.now(),
  desktopTiltX: 0,
  desktopTiltY: 0
};

function randomStart() {
  const angle = Math.random() * Math.PI * 2;
  const distance = state.radius * (0.34 + Math.random() * 0.20);
  state.x = Math.cos(angle) * distance;
  state.y = Math.sin(angle) * distance;
  state.vx = 0;
  state.vy = 0;
}

function updateMeasurements() {
  const rect = compass.getBoundingClientRect();
  state.size = rect.width;
  state.radius = rect.width / 2;
}

function render() {
  axis.style.transform = `translate(-50%, -50%) translate(${state.x}px, ${state.y}px)`;
}

function clampToCompass() {
  const bodyRadius = 18;
  const max = state.radius - bodyRadius - 10;
  const distance = Math.hypot(state.x, state.y);
  if (distance > max) {
    const nx = state.x / distance;
    const ny = state.y / distance;
    state.x = nx * max;
    state.y = ny * max;
    const normalVelocity = state.vx * nx + state.vy * ny;
    if (normalVelocity > 0) {
      state.vx -= (1.62 * normalVelocity) * nx;
      state.vy -= (1.62 * normalVelocity) * ny;
    }
    state.vx *= 0.72;
    state.vy *= 0.72;
  }
}

function physicsStep(dt) {
  if (state.dragging || state.locked) return;

  const distance = Math.hypot(state.x, state.y);
  const snapZone = Math.max(34, state.radius * 0.105);

  let ax = state.gx;
  let ay = state.gy;

  if (distance < snapZone) {
    const magnet = (1 - distance / snapZone) * 0.42;
    ax += -state.x * magnet * 0.035;
    ay += -state.y * magnet * 0.035;
  }

  state.vx += ax * dt;
  state.vy += ay * dt;

  const friction = Math.pow(0.986, dt);
  state.vx *= friction;
  state.vy *= friction;

  state.x += state.vx * dt;
  state.y += state.vy * dt;

  clampToCompass();

  if (distance < 13 && Math.hypot(state.vx, state.vy) < 0.78) {
    lockAxis();
  }
}

function loop(now) {
  const dt = Math.min(32, now - state.lastTime) / 16.67;
  state.lastTime = now;

  if (state.running) {
    if (!hasMotionInput() && !state.dragging && !state.locked) {
      state.gx = state.desktopTiltX;
      state.gy = state.desktopTiltY + 0.05;
    }
    physicsStep(dt);
    render();
  }

  requestAnimationFrame(loop);
}

let receivedMotion = false;
function hasMotionInput() { return receivedMotion; }

function handleOrientation(event) {
  if (state.locked) return;
  receivedMotion = true;
  const gamma = event.gamma || 0;
  const beta = event.beta || 0;
  state.gx = gamma * 0.020;
  state.gy = beta * 0.018;
}

function handleMotion(event) {
  if (state.locked) return;
  const acc = event.accelerationIncludingGravity;
  if (!acc) return;
  receivedMotion = true;
  state.gx = (acc.x || 0) * -0.030;
  state.gy = (acc.y || 0) * 0.030;
}

function startDesktopFallback() {
  window.addEventListener('mousemove', (event) => {
    if (receivedMotion || state.locked) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    state.desktopTiltX = ((event.clientX - cx) / cx) * 0.22;
    state.desktopTiltY = ((event.clientY - cy) / cy) * 0.22;
  });
}

async function requestSensorPermission() {
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const response = await DeviceMotionEvent.requestPermission();
      return response === 'granted';
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const response = await DeviceOrientationEvent.requestPermission();
      return response === 'granted';
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function startExperience() {
  startButton.disabled = true;
  permissionHint.textContent = '';

  const allowed = await requestSensorPermission();
  if (!allowed) {
    permissionHint.textContent = 'Permissão não liberada. No desktop, você pode arrastar o eixo com o mouse.';
  }

  intro.classList.remove('screen--active');
  experience.classList.add('screen--active');

  updateMeasurements();
  randomStart();
  render();

  state.running = true;
  state.lastTime = performance.now();

  window.addEventListener('deviceorientation', handleOrientation, true);
  window.addEventListener('devicemotion', handleMotion, true);
  startDesktopFallback();
}

function lockAxis() {
  if (state.locked) return;
  state.locked = true;
  state.x = 0;
  state.y = 0;
  state.vx = 0;
  state.vy = 0;
  render();
  axis.classList.add('is-locked');
  instruction.classList.add('is-hidden');

  if (navigator.vibrate) navigator.vibrate([70, 40, 120]);

  setTimeout(() => {
    completionText.classList.add('is-visible');
  }, 180);

  setTimeout(() => {
    stage.classList.add('is-zooming');
    whiteTransition.classList.add('is-active');
  }, 1450);

  setTimeout(() => {
    website.classList.add('is-visible');
    experience.classList.remove('screen--active');
  }, 2520);

  setTimeout(() => {
    whiteTransition.classList.add('is-fading');
  }, 2870);
}

function pointerPosition(event) {
  const rect = compass.getBoundingClientRect();
  return {
    x: event.clientX - rect.left - rect.width / 2,
    y: event.clientY - rect.top - rect.height / 2
  };
}

axis.addEventListener('pointerdown', (event) => {
  if (state.locked) return;
  state.dragging = true;
  state.pointerId = event.pointerId;
  axis.setPointerCapture(event.pointerId);
});

axis.addEventListener('pointermove', (event) => {
  if (!state.dragging || state.pointerId !== event.pointerId || state.locked) return;
  const pos = pointerPosition(event);
  state.x = pos.x;
  state.y = pos.y;
  state.vx = 0;
  state.vy = 0;
  clampToCompass();
  render();
  if (Math.hypot(state.x, state.y) < 14) lockAxis();
});

axis.addEventListener('pointerup', (event) => {
  if (state.pointerId === event.pointerId) {
    state.dragging = false;
    state.pointerId = null;
  }
});

axis.addEventListener('pointercancel', () => {
  state.dragging = false;
  state.pointerId = null;
});

window.addEventListener('resize', () => {
  updateMeasurements();
  clampToCompass();
  render();
});

startButton.addEventListener('click', startExperience);
requestAnimationFrame(loop);

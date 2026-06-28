const intro = document.getElementById('intro');
const experience = document.getElementById('experience');
const site = document.getElementById('site');
const startBtn = document.getElementById('startBtn');
const stage = document.getElementById('stage');
const gridWrap = document.getElementById('gridWrap');
const symbolFill = document.getElementById('symbolFill');
const centerLight = document.getElementById('centerLight');
const topMessage = document.getElementById('topMessage');
const hint = document.getElementById('hint');

const pieces = [...document.querySelectorAll('.piece')];
const slots = [...document.querySelectorAll('.slot')];

const state = {
  running:false,
  orientation:{x:0,y:0},
  pointer:null,
  complete:false,
  lastTime:performance.now(),
  bounds:null,
  gridRect:null,
};

const slotMap = {
  estrategia: '.slot-a',
  identidade: '.slot-b',
  experiencia: '.slot-c',
  comunicacao: '.slot-d'
};

const pieceState = new Map();

function initPieces(){
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const size = getPieceSize();
  const gap = Math.min(22, vw * 0.045);
  const total = pieces.length * size + (pieces.length - 1) * gap;
  const startX = (vw - total) / 2 + size/2;
  const y = vh * 0.78;
  pieces.forEach((piece, i)=>{
    const x = startX + i * (size + gap);
    const jitter = (i - 1.5) * 2;
    const data = {
      el: piece,
      key: piece.dataset.piece,
      x,
      y:y + Math.sin(i) * 8,
      vx:jitter,
      vy:0,
      locked:false,
      dragging:false,
      dragOffsetX:0,
      dragOffsetY:0,
    };
    pieceState.set(piece, data);
    renderPiece(data);
  });
}

function getPieceSize(){
  const v = getComputedStyle(document.documentElement).getPropertyValue('--piece-size').trim();
  return parseFloat(v) || 74;
}

function updateRects(){
  state.bounds = {w: window.innerWidth, h: window.innerHeight};
  state.gridRect = gridWrap.getBoundingClientRect();
}

async function requestMotion(){
  try{
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission();
      if(res !== 'granted') return false;
    }
    window.addEventListener('deviceorientation', onOrientation, true);
    return true;
  }catch(e){
    return true;
  }
}

function onOrientation(e){
  const gamma = clamp(e.gamma || 0, -30, 30);
  const beta = clamp((e.beta || 0) - 45, -35, 35);
  state.orientation.x = gamma / 30;
  state.orientation.y = beta / 35;
}

startBtn.addEventListener('click', async()=>{
  await requestMotion();
  intro.classList.remove('is-active');
  experience.classList.add('is-active');
  state.running = true;
  updateRects();
  initPieces();
  state.lastTime = performance.now();
  requestAnimationFrame(loop);
});

function loop(now){
  if(!state.running) return;
  const dt = Math.min(32, now - state.lastTime) / 16.666;
  state.lastTime = now;
  updatePhysics(dt);
  requestAnimationFrame(loop);
}

function updatePhysics(dt){
  const size = getPieceSize();
  const radius = size / 2;
  const floor = state.bounds.h - radius - 72;
  const left = radius + 10;
  const right = state.bounds.w - radius - 10;
  const top = radius + 20;
  const gravityX = state.orientation.x * 0.28;
  const gravityY = state.orientation.y * 0.22;

  pieceState.forEach(data=>{
    if(data.locked || data.dragging) return;

    data.vx += gravityX * dt;
    data.vy += gravityY * dt;

    data.vx *= 0.982;
    data.vy *= 0.982;

    data.x += data.vx * dt;
    data.y += data.vy * dt;

    if(data.x < left){ data.x = left; data.vx *= -0.45; }
    if(data.x > right){ data.x = right; data.vx *= -0.45; }
    if(data.y < top){ data.y = top; data.vy *= -0.45; }
    if(data.y > floor){ data.y = floor; data.vy *= -0.42; data.vx *= 0.96; }

    renderPiece(data);
  });

  solveCircleCollisions();
}

function solveCircleCollisions(){
  const arr = [...pieceState.values()].filter(d=>!d.locked && !d.dragging);
  const minDist = getPieceSize() + 4;
  for(let i=0;i<arr.length;i++){
    for(let j=i+1;j<arr.length;j++){
      const a = arr[i], b = arr[j];
      const dx = b.x-a.x, dy = b.y-a.y;
      const dist = Math.hypot(dx,dy) || 1;
      if(dist < minDist){
        const overlap = (minDist - dist) / 2;
        const nx = dx/dist, ny = dy/dist;
        a.x -= nx*overlap; a.y -= ny*overlap;
        b.x += nx*overlap; b.y += ny*overlap;
        const avx = a.vx, avy = a.vy;
        a.vx = b.vx * .62; a.vy = b.vy * .62;
        b.vx = avx * .62; b.vy = avy * .62;
        renderPiece(a); renderPiece(b);
      }
    }
  }
}

function renderPiece(data){
  data.el.style.transform = `translate3d(${data.x - getPieceSize()/2}px, ${data.y - getPieceSize()/2}px, 0)`;
}

pieces.forEach(piece=>{
  piece.addEventListener('pointerdown', (e)=> startDrag(e, piece));
});

function startDrag(e, piece){
  const data = pieceState.get(piece);
  if(!data || data.locked || state.complete) return;
  piece.setPointerCapture(e.pointerId);
  data.dragging = true;
  data.vx = 0; data.vy = 0;
  data.dragOffsetX = e.clientX - data.x;
  data.dragOffsetY = e.clientY - data.y;
  piece.classList.add('is-dragging');
  hint.classList.add('is-hidden');
}

window.addEventListener('pointermove', (e)=>{
  pieceState.forEach(data=>{
    if(!data.dragging) return;
    data.x = e.clientX - data.dragOffsetX;
    data.y = e.clientY - data.dragOffsetY;
    renderPiece(data);
  });
});

window.addEventListener('pointerup', (e)=>{
  pieceState.forEach(data=>{
    if(!data.dragging) return;
    data.dragging = false;
    data.el.classList.remove('is-dragging');
    trySnap(data);
  });
});

function trySnap(data){
  const slot = document.querySelector(slotMap[data.key]);
  const rect = slot.getBoundingClientRect();
  const target = {x:rect.left + rect.width/2, y:rect.top + rect.height/2};
  const dist = Math.hypot(data.x-target.x, data.y-target.y);
  const snapDistance = Math.max(62, getPieceSize() * 1.1);
  if(dist < snapDistance){
    data.locked = true;
    data.x = target.x;
    data.y = target.y;
    data.el.classList.add('is-locked');
    slot.classList.add('is-filled');
    animateSnap(data.el);
    renderPiece(data);
    vibrate(45);
    checkComplete();
  }else{
    data.vx = (Math.random()-.5) * 2;
    data.vy = 1.5;
  }
}

function animateSnap(el){
  el.animate([
    { transform: el.style.transform + ' scale(1.08)' },
    { transform: el.style.transform + ' scale(.96)' },
    { transform: el.style.transform + ' scale(1)' }
  ], {duration:260, easing:'cubic-bezier(.2,.9,.2,1)'});
}

function checkComplete(){
  const done = [...pieceState.values()].every(d=>d.locked);
  if(!done || state.complete) return;
  state.complete = true;
  setTimeout(completeExperience, 420);
}

function completeExperience(){
  vibrate([40,35,80]);
  symbolFill.classList.add('is-visible');
  centerLight.classList.add('is-on');
  topMessage.classList.add('is-visible');

  setTimeout(()=>{
    stage.style.transform = 'scale(4.6)';
    stage.style.opacity = '.98';
  }, 1200);

  setTimeout(()=>{
    const wipe = document.createElement('div');
    wipe.className = 'white-wipe';
    document.body.appendChild(wipe);
  }, 1650);

  setTimeout(()=>{
    site.classList.add('is-active');
  }, 2300);

  setTimeout(()=>{
    experience.classList.remove('is-active');
    const wipe = document.querySelector('.white-wipe');
    if(wipe) wipe.remove();
  }, 2900);
}

function vibrate(pattern){
  if('vibrate' in navigator) navigator.vibrate(pattern);
}

function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

window.addEventListener('resize', ()=>{
  updateRects();
  if(state.running && !state.complete){
    initPieces();
  }
});

// Desktop fallback: subtle artificial motion before any sensor data arrives.
setInterval(()=>{
  if(!state.running || state.complete) return;
  if(Math.abs(state.orientation.x) > .01 || Math.abs(state.orientation.y) > .01) return;
  const t = performance.now()/1000;
  state.orientation.x = Math.sin(t*.8)*.18;
  state.orientation.y = Math.cos(t*.7)*.10;
}, 120);

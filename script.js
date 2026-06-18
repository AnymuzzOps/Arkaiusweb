const stage = document.querySelector('#stage');
const root = document.documentElement;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

const scenePalette = {
  hero: { a: [41, 207, 255], b: [8, 123, 255] },
  services: { a: [31, 176, 232], b: [4, 54, 116] },
  automation: { a: [55, 222, 255], b: [7, 102, 184] },
  demo: { a: [41, 207, 255], b: [0, 82, 146] },
  cta: { a: [76, 188, 255], b: [18, 72, 164] },
};
let currentScene = 'hero';
function clonePalette(palette) {
  return { a: [...palette.a], b: [...palette.b] };
}
let currentPalette = clonePalette(scenePalette.hero);
let targetPalette = clonePalette(scenePalette.hero);
let bloomScale = 1;
let targetBloomScale = 1;
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

const loaderStatuses = [
  'AI Core Online',
  'Automation Engine Ready',
  'Bot Network Syncing',
  'Digital Workflow Loading',
  'Command Center Active',
];
const loaderStatus = document.querySelector('.loader__status');
if (loaderStatus && !prefersReducedMotion) {
  let loaderIndex = 0;
  const statusTimer = window.setInterval(() => {
    loaderIndex += 1;
    loaderStatus.textContent = loaderStatuses[loaderIndex % loaderStatuses.length];
    if (loaderIndex > 6) window.clearInterval(statusTimer);
  }, 360);
}

const reveals = document.querySelectorAll('.reveal, .flowline');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
reveals.forEach((element) => revealObserver.observe(element));

const sceneObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

  if (visible?.target?.dataset.scene && visible.target.dataset.scene !== currentScene) {
    currentScene = visible.target.dataset.scene;
    stage.dataset.scene = currentScene;
    targetPalette = clonePalette(scenePalette[currentScene] || scenePalette.hero);
  }
}, { threshold: [0.18, 0.34, 0.52, 0.7], rootMargin: '-12% 0px -22% 0px' });
document.querySelectorAll('.scene').forEach((section) => sceneObserver.observe(section));

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;

function updateMouse(event) {
  mouseX = event.clientX;
  mouseY = event.clientY;
  targetX = (event.clientX / window.innerWidth - 0.5) * 2;
  targetY = (event.clientY / window.innerHeight - 0.5) * 2;
  root.style.setProperty('--mouse-x', `${event.clientX}px`);
  root.style.setProperty('--mouse-y', `${event.clientY}px`);
}

if (!prefersReducedMotion) {
  window.addEventListener('pointermove', updateMouse, { passive: true });
  window.addEventListener('scroll', () => {
    const delta = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;
    scrollVelocity = Math.min(delta / 90, 1.6);
    targetBloomScale = Math.max(0.58, 1 - scrollVelocity * 0.22);
  }, { passive: true });
}

const depthElements = document.querySelectorAll('[data-depth]');
const tiltCards = document.querySelectorAll('.tilt-card');
const magneticElements = document.querySelectorAll('.magnetic');
const commandCard = document.querySelector('.command-card');
document.querySelectorAll('.signal').forEach((signal) => {
  signal.addEventListener('pointerenter', () => {
    commandCard?.classList.add('is-linked');
    playHoverSound();
  });
  signal.addEventListener('pointerleave', () => commandCard?.classList.remove('is-linked'));
});

function mixChannel(current, target, ease) {
  return current + (target - current) * ease;
}
function updateSceneColors() {
  const velocityEasePenalty = scrollVelocity > 0.55 ? 0.018 : 0.032;
  currentPalette.a = currentPalette.a.map((value, index) => mixChannel(value, targetPalette.a[index], velocityEasePenalty));
  currentPalette.b = currentPalette.b.map((value, index) => mixChannel(value, targetPalette.b[index], velocityEasePenalty));
  bloomScale += (targetBloomScale - bloomScale) * 0.08;
  targetBloomScale += (1 - targetBloomScale) * 0.018;
  scrollVelocity *= 0.9;

  stage.style.setProperty('--scene-a', currentPalette.a.map((value) => value.toFixed(1)).join(', '));
  stage.style.setProperty('--scene-b', currentPalette.b.map((value) => value.toFixed(1)).join(', '));
  stage.style.setProperty('--bloom-scale', bloomScale.toFixed(3));
}

function animateDepth() {
  currentX += (targetX - currentX) * 0.065;
  currentY += (targetY - currentY) * 0.065;
  root.style.setProperty('--mx', currentX.toFixed(4));
  root.style.setProperty('--my', currentY.toFixed(4));
  updateSceneColors();

  depthElements.forEach((element) => {
    const depth = Number(element.dataset.depth || 0.35);
    element.style.transform = `translate3d(${currentX * depth * 20}px, ${currentY * depth * 20}px, 0)`;
  });

  if (!isCoarsePointer) {
    tiltCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!inView) return;
      const localX = (mouseX - rect.left) / rect.width - 0.5;
      const localY = (mouseY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${localY * -3.8}deg) rotateY(${localX * 4.8}deg)`;
    });

    magneticElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const dx = mouseX - (rect.left + rect.width / 2);
      const dy = mouseY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      if (distance < 120) {
        element.style.transform = `translate3d(${dx * 0.12}px, ${dy * 0.12}px, 0)`;
      } else {
        element.style.transform = '';
      }
    });
  }

  requestAnimationFrame(animateDepth);
}
if (!prefersReducedMotion) animateDepth();

const canvas = document.querySelector('#stage-canvas');
const ctx = canvas?.getContext('2d');
let particles = [];
let canvasWidth = 0;
let canvasHeight = 0;
let canvasActive = !prefersReducedMotion;
let canvasFrameRunning = false;

function resizeCanvas() {
  if (!ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = Math.floor(canvasWidth * ratio);
  canvas.height = Math.floor(canvasHeight * ratio);
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const particleCount = window.innerWidth < 760 ? 30 : 68;
  particles = Array.from({ length: particleCount }, (_, index) => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    size: index % 5 === 0 ? 1.8 : 1.05,
    phase: Math.random() * Math.PI * 2,
  }));
}

function drawCanvas() {
  if (!ctx || !canvasActive) {
    canvasFrameRunning = false;
    return;
  }
  canvasFrameRunning = true;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  const colorA = currentPalette.a.map((value) => Math.round(value)).join(', ');
  ctx.fillStyle = `rgba(${colorA}, 0.48)`;
  ctx.strokeStyle = `rgba(${colorA}, 0.10)`;
  ctx.lineWidth = 1;

  particles.forEach((particle, index) => {
    const pullX = (mouseX - canvasWidth / 2) * 0.00003;
    const pullY = (mouseY - canvasHeight / 2) * 0.00003;
    particle.phase += 0.006;
    particle.x += particle.vx + pullX + Math.cos(particle.phase) * 0.03;
    particle.y += particle.vy + pullY + Math.sin(particle.phase) * 0.03;

    if (particle.x < -20) particle.x = canvasWidth + 20;
    if (particle.x > canvasWidth + 20) particle.x = -20;
    if (particle.y < -20) particle.y = canvasHeight + 20;
    if (particle.y > canvasHeight + 20) particle.y = -20;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();

    for (let j = index + 1; j < particles.length; j += 1) {
      const other = particles[j];
      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 108) {
        ctx.globalAlpha = (108 - distance) / 140;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  });

  requestAnimationFrame(drawCanvas);
}

if (ctx && !prefersReducedMotion) {
  resizeCanvas();
  drawCanvas();
  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('visibilitychange', () => {
    canvasActive = !document.hidden;
    if (canvasActive && !canvasFrameRunning) drawCanvas();
  });
}

let audioContext;
let humOscillator;
let humGain;
const soundToggle = document.querySelector('.sound-toggle');
let soundEnabled = localStorage.getItem('arkaiusSound') === 'on';

function ensureAudioContext() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return undefined;
    audioContext = new AudioCtor();
  }
  return audioContext;
}
function playTone({ frequency = 440, duration = 0.08, type = 'sine', gain = 0.018 } = {}) {
  if (!soundEnabled) return;
  const context = ensureAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  volume.gain.setValueAtTime(0, context.currentTime);
  volume.gain.linearRampToValueAtTime(gain, context.currentTime + 0.012);
  volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(volume).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}
function startHum() {
  if (!soundEnabled || humOscillator) return;
  const context = ensureAudioContext();
  if (!context) return;
  humOscillator = context.createOscillator();
  humGain = context.createGain();
  humOscillator.type = 'sine';
  humOscillator.frequency.value = 74;
  humGain.gain.value = 0.004;
  humOscillator.connect(humGain).connect(context.destination);
  humOscillator.start();
}
function stopHum() {
  if (!humOscillator) return;
  humOscillator.stop();
  humOscillator.disconnect();
  humOscillator = undefined;
  humGain = undefined;
}
function playBootSound() { playTone({ frequency: 520, duration: 0.16, type: 'triangle', gain: 0.014 }); }
function playHoverSound() { playTone({ frequency: 860, duration: 0.045, type: 'sine', gain: 0.009 }); }
function playClickSound() { playTone({ frequency: 340, duration: 0.07, type: 'triangle', gain: 0.014 }); }
// To replace generated WebAudio tones with real assets later, load files here and call them from
// playBootSound(), playHoverSound(), and playClickSound(). Keep audio opt-in only.

function syncSoundButton() {
  if (!soundToggle) return;
  soundToggle.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
}
syncSoundButton();
soundToggle?.addEventListener('click', async () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('arkaiusSound', soundEnabled ? 'on' : 'off');
  syncSoundButton();
  if (soundEnabled) {
    const context = ensureAudioContext();
    await context?.resume();
    startHum();
    playBootSound();
  } else {
    stopHum();
  }
});
document.querySelectorAll('a, button, .glass-card, .mini-card, .step').forEach((element) => {
  element.addEventListener('pointerenter', playHoverSound);
  element.addEventListener('click', playClickSound);
});

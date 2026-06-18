const stage = document.querySelector('#stage');
const root = document.documentElement;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  if (visible?.target?.dataset.scene) {
    stage.dataset.scene = visible.target.dataset.scene;
  }
}, { threshold: [0.24, 0.42, 0.62] });
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
}

const depthElements = document.querySelectorAll('[data-depth]');
const tiltCards = document.querySelectorAll('.tilt-card');
function animateDepth() {
  currentX += (targetX - currentX) * 0.07;
  currentY += (targetY - currentY) * 0.07;
  root.style.setProperty('--mx', currentX.toFixed(4));
  root.style.setProperty('--my', currentY.toFixed(4));

  depthElements.forEach((element) => {
    const depth = Number(element.dataset.depth || 0.35);
    element.style.transform = `translate3d(${currentX * depth * 18}px, ${currentY * depth * 18}px, 0)`;
  });

  tiltCards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const inView = rect.bottom > 0 && rect.top < window.innerHeight;
    if (!inView) return;
    const localX = (mouseX - rect.left) / rect.width - 0.5;
    const localY = (mouseY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(900px) rotateX(${localY * -3.5}deg) rotateY(${localX * 4.5}deg)`;
  });

  requestAnimationFrame(animateDepth);
}
if (!prefersReducedMotion) animateDepth();

const canvas = document.querySelector('#stage-canvas');
const ctx = canvas?.getContext('2d');
let particles = [];
let canvasWidth = 0;
let canvasHeight = 0;
let canvasActive = !prefersReducedMotion;

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
  const particleCount = window.innerWidth < 760 ? 34 : 72;
  particles = Array.from({ length: particleCount }, (_, index) => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (Math.random() - 0.5) * 0.22,
    size: index % 5 === 0 ? 1.8 : 1.1,
  }));
}

function drawCanvas() {
  if (!ctx || !canvasActive) return;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = 'rgba(82, 229, 255, 0.55)';
  ctx.strokeStyle = 'rgba(82, 229, 255, 0.12)';
  ctx.lineWidth = 1;

  particles.forEach((particle, index) => {
    const pullX = (mouseX - canvasWidth / 2) * 0.000035;
    const pullY = (mouseY - canvasHeight / 2) * 0.000035;
    particle.x += particle.vx + pullX;
    particle.y += particle.vy + pullY;

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
      if (distance < 112) {
        ctx.globalAlpha = (112 - distance) / 112;
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
    if (canvasActive) drawCanvas();
  });
}

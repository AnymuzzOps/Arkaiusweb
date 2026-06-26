const root = document.documentElement;
const body = document.body;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

const savedAppearance = localStorage.getItem('arkaiusApariencia');
const initialAppearance = savedAppearance || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro');
root.dataset.apariencia = initialAppearance;

const themeToggle = document.querySelector('.theme-toggle');
function syncThemeButton() {
  const isLight = root.dataset.apariencia === 'claro';
  if (!themeToggle) return;
  themeToggle.innerHTML = `<span aria-hidden="true">${isLight ? '☀' : '☾'}</span>`;
  themeToggle.setAttribute('aria-label', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  themeToggle.setAttribute('title', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
}
syncThemeButton();
themeToggle?.addEventListener('click', () => {
  const nextAppearance = root.dataset.apariencia === 'claro' ? 'oscuro' : 'claro';
  root.dataset.apariencia = nextAppearance;
  localStorage.setItem('arkaiusApariencia', nextAppearance);
  syncThemeButton();
});

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const siteHeader = document.querySelector('.site-header');
function setMenuState(isOpen) {
  nav?.classList.toggle('is-open', isOpen);
  body.classList.toggle('menu-open', isOpen);
  siteHeader?.classList.toggle('has-open-menu', isOpen);
  menuToggle?.classList.toggle('is-active', isOpen);
  menuToggle?.setAttribute('aria-expanded', String(isOpen));
  menuToggle?.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
}
function syncHeaderScroll() {
  siteHeader?.classList.toggle('is-scrolled', window.scrollY > 18);
}
menuToggle?.addEventListener('click', () => {
  setMenuState(!nav?.classList.contains('is-open'));
});
nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    setMenuState(false);
  });
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenuState(false);
});
window.addEventListener('scroll', syncHeaderScroll, { passive: true });
syncHeaderScroll();

const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
reveals.forEach((element) => revealObserver.observe(element));

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
const magneticElements = document.querySelectorAll('.magnetic');
function animateInterface() {
  currentX += (targetX - currentX) * 0.06;
  currentY += (targetY - currentY) * 0.06;
  root.style.setProperty('--mx', currentX.toFixed(4));
  root.style.setProperty('--my', currentY.toFixed(4));

  depthElements.forEach((element) => {
    const depth = Number(element.dataset.depth || 0.2);
    element.style.transform = `translate3d(${currentX * depth * 14}px, ${currentY * depth * 14}px, 0)`;
  });

  if (!isCoarsePointer) {
    tiltCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const localX = (mouseX - rect.left) / rect.width - 0.5;
      const localY = (mouseY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${localY * -2.2}deg) rotateY(${localX * 2.6}deg)`;
    });

    magneticElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const dx = mouseX - (rect.left + rect.width / 2);
      const dy = mouseY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      element.style.transform = distance < 110 ? `translate3d(${dx * 0.08}px, ${dy * 0.08}px, 0)` : '';
    });
  }

  requestAnimationFrame(animateInterface);
}
if (!prefersReducedMotion) animateInterface();

const canvas = document.querySelector('#stage-canvas');
const ctx = canvas?.getContext('2d');
let particles = [];
let canvasWidth = 0;
let canvasHeight = 0;
let canvasActive = !prefersReducedMotion;
let canvasFrameRunning = false;

function resizeCanvas() {
  if (!ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = Math.floor(canvasWidth * ratio);
  canvas.height = Math.floor(canvasHeight * ratio);
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const count = window.innerWidth < 760 ? 22 : 48;
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    vx: (Math.random() - 0.5) * 0.14,
    vy: (Math.random() - 0.5) * 0.14,
    size: Math.random() * 1.1 + 0.5,
  }));
}

function drawCanvas() {
  if (!ctx || !canvasActive) {
    canvasFrameRunning = false;
    return;
  }
  canvasFrameRunning = true;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  const darkMode = root.dataset.apariencia !== 'claro';
  ctx.fillStyle = darkMode ? 'rgba(109, 213, 250, 0.30)' : 'rgba(36, 118, 199, 0.26)';
  ctx.strokeStyle = darkMode ? 'rgba(109, 213, 250, 0.06)' : 'rgba(36, 118, 199, 0.07)';

  particles.forEach((particle, index) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    if (particle.x < -20) particle.x = canvasWidth + 20;
    if (particle.x > canvasWidth + 20) particle.x = -20;
    if (particle.y < -20) particle.y = canvasHeight + 20;
    if (particle.y > canvasHeight + 20) particle.y = -20;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();

    for (let j = index + 1; j < particles.length; j += 1) {
      const other = particles[j];
      const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
      if (distance < 130) {
        ctx.globalAlpha = (130 - distance) / 180;
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

const form = document.querySelector('#contact-form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const nombre = data.get('nombre');
  const correo = data.get('correo');
  const servicio = data.get('servicio');
  const mensaje = data.get('mensaje');
  // Reemplazar este número por el WhatsApp real de Arkaius Digital cuando esté disponible.
  const whatsappNumber = '56900000000';
  const text = `Hola Arkaius Digital, mi nombre es ${nombre}.\nCorreo: ${correo}\nServicio de interés: ${servicio}\nMensaje: ${mensaje}`;
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
});

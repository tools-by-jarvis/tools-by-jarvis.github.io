/**
 * global.js - Shared functionality across all pages
 * Starfield, loading, theme, check-in, nav, FAB
 */

(function() {
  'use strict';

  // ===== Loading Screen =====
  window.addEventListener('load', () => {
    const ls = document.querySelector('.loading-screen');
    if (ls) setTimeout(() => ls.classList.add('hidden'), 600);
  });

  // ===== Starfield Canvas =====
  function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, stars = [], nebulas = [];
    const STAR_COUNT = 200;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Create stars
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.0015 + 0.001
      });
    }

    // Create nebula blobs
    for (let i = 0; i < 3; i++) {
      nebulas.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 200 + 150,
        hue: [270, 200, 320][i],
        dx: (Math.random() - 0.5) * 0.15,
        dy: (Math.random() - 0.5) * 0.1
      });
    }

    let time = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      time += 0.01;

      // Draw nebulas
      nebulas.forEach(n => {
        n.x += n.dx; n.y += n.dy;
        if (n.x < -n.r) n.x = W + n.r;
        if (n.x > W + n.r) n.x = -n.r;
        if (n.y < -n.r) n.y = H + n.r;
        if (n.y > H + n.r) n.y = -n.r;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, `hsla(${n.hue}, 60%, 30%, 0.06)`);
        grad.addColorStop(0.5, `hsla(${n.hue}, 50%, 20%, 0.03)`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      // Draw stars
      stars.forEach(s => {
        s.twinkle += s.speed;
        const alpha = 0.3 + Math.sin(s.twinkle) * 0.35 + 0.35;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,240,${alpha})`;
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ===== Theme Toggle =====
  function initTheme() {
    const saved = localStorage.getItem('fortune-theme') || 'dark';
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');

    document.addEventListener('click', e => {
      if (e.target.closest('#theme-toggle')) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isLight) {
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('fortune-theme', 'dark');
        } else {
          document.documentElement.setAttribute('data-theme', 'light');
          localStorage.setItem('fortune-theme', 'light');
        }
        updateThemeIcon();
      }
    });
  }

  function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    btn.textContent = isLight ? '🌙' : '☀️';
  }

  // ===== Music Toggle (UI only) =====
  function initMusicToggle() {
    let playing = false;
    document.addEventListener('click', e => {
      if (e.target.closest('#music-toggle')) {
        playing = !playing;
        e.target.closest('#music-toggle').textContent = playing ? '🔊' : '🔇';
      }
    });
  }

  // ===== Mobile Nav Toggle =====
  function initNav() {
    document.addEventListener('click', e => {
      if (e.target.closest('.nav-toggle')) {
        const links = document.querySelector('.nav-links');
        if (links) links.classList.toggle('open');
      }
    });
  }

  // ===== Daily Check-in =====
  function initCheckin() {
    const banner = document.querySelector('.checkin-banner');
    if (!banner) return;
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('fortune-last-visit');
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let streak = parseInt(localStorage.getItem('fortune-streak') || '0');

    if (lastVisit === today) {
      // Already visited today
      if (streak > 1) {
        banner.innerHTML = `🌟 歡迎回來！這是你連續第 <strong>${streak}</strong> 天造訪`;
        banner.classList.add('show');
      }
    } else {
      if (lastVisit === yesterday) {
        streak++;
      } else {
        streak = 1;
      }
      localStorage.setItem('fortune-streak', streak);
      localStorage.setItem('fortune-last-visit', today);
      if (streak > 1) {
        banner.innerHTML = `🌟 歡迎回來！這是你連續第 <strong>${streak}</strong> 天造訪`;
        banner.classList.add('show');
      }
    }
  }

  // ===== Init All =====
  document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    initTheme();
    updateThemeIcon();
    initMusicToggle();
    initNav();
    initCheckin();
  });
})();

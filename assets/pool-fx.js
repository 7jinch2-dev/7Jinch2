/* ==========================================
   泳池参考 · 售货机的指针视差
   只做一件事：鼠标在售货机上移动时，整机做 1.5°~2.2° 的微俯仰，
   四颗玻璃球反向轻移一点（漂浮/倒影由 retro.css 里的 CSS 动画负责）。
   - 触屏、开了「减弱动态效果」直接跳过
   - 滚出视口就停，不占 rAF
   - 想关掉整层效果：删掉 index.html 里的这个 <script> 即可
   ========================================== */
(() => {
  const root = document.getElementById('vmRoot');
  if (!root) return;
  const vm = root.querySelector('.vm');
  if (!vm) return;

  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  if (reduced || !fine) return;

  const balls = [...root.querySelectorAll('.vm-ball')];
  let targetX = 0;
  let targetY = 0;
  let curX = 0;
  let curY = 0;
  let raf = 0;
  let visible = false;

  function write() {
    vm.style.setProperty('--vm-ry', (curX * 2.2).toFixed(3));
    vm.style.setProperty('--vm-rx', (-curY * 1.6).toFixed(3));
    balls.forEach((ball, i) => {
      const k = 0.55 + i * 0.09;
      ball.style.setProperty('--bx', (curX * 8 * k).toFixed(1) + 'px');
      ball.style.setProperty('--by', (curY * 5 * k).toFixed(1) + 'px');
    });
  }

  function frame() {
    raf = 0;
    curX += (targetX - curX) * 0.12;
    curY += (targetY - curY) * 0.12;
    write();
    if (visible && (Math.abs(targetX - curX) > 0.002 || Math.abs(targetY - curY) > 0.002)) {
      raf = requestAnimationFrame(frame);
    }
  }

  function start() {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  function onMove(e) {
    const r = vm.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    targetX = Math.max(-1, Math.min(1, nx));
    targetY = Math.max(-1, Math.min(1, ny));
    start();
  }

  function onLeave() {
    targetX = 0;
    targetY = 0;
    start();
  }

  root.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('pointerleave', onLeave);
  root.addEventListener('pointercancel', onLeave);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }, { rootMargin: '120px' }).observe(root);
  } else {
    visible = true;
  }
})();

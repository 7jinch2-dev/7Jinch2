/* ==========================================
   工牌挂件 —— 挂在右上角，用 Verlet 绳物理甩动、翻转
   绳子是一串质点，每帧先积分再迭代约束；工牌跟随末端质点的
   位置，方向对齐绳子切线，所以滑动页面时会自然地甩和翻。
   替换点：外形在 retro.css 搜「工牌挂件」；参数在下面 TAG_CFG
   ========================================== */

const TAG_CFG = {
  nodes: 6,          // 绳子分几段（越多越柔、也能拉更长）
  gravity: 1500,     // 重力（px/s²）
  damping: 0.992,    // 速度阻尼。要比「摆几下就停」松一些，
                     // 否则甩出去立刻撞上约束停住，看着像撞墙而不是回弹
  iterations: 8,     // 约束迭代次数，越多越不容易被拉长
  scrollForce: 0.22, // 滚动时对挂点施加的水平冲量
  maxScrollVel: 52,  // 滚动速度钳制，避免暴力甩飞
  tiltScale: 0.55,   // 绳倾角转成工牌倾斜的比例
  dragDamp: 0.30,    // 拖拽跟手的阻尼（越小越黏手）
  throwScale: 1.15,  // 松手时初速度的放大倍数
  stretch: 0.52      // 绳容量上限 = 静止长度 × (1 + stretch)，即最多能拉长 52%
};

const TagPhysics = (() => {
  const host = document.getElementById('tagHost');
  if (!host) return;

  /* ---------- 结构：固定铆钉 + 宽扁挂绳 + 金属扣 + 卡面 ----------
     参考嘉想工作证那种「皮质挂绳 + 金属方扣 + 竖向卡面」的版式，
     配色换成站点的黑 + 粉。 */
  host.innerHTML = `
    <!-- 顶部固定点：铆钉，绳从这里长出来（原来绳子顶端是悬空的，
         离导航栏还有 32px，看着像飘在空中） -->
    <span class="tag-anchor"><i class="tag-anchor__rivet"></i></span>

    <!-- 挂绳：宽扁带，高度和转角由 JS 每帧写 -->
    <div class="tag-cord" id="tagCord"><i class="tag-cord__seam"></i></div>

    <!-- 卡面 -->
    <div class="tag-card">
      <span class="tag-card__clip"></span>
      <div class="tag-card__face">
        <span class="tag-card__ring" aria-hidden="true"></span>

        <div class="tag-card__head">
          <span class="tag-card__logo">晨</span>
          <span class="tag-card__brand">陈芷曦设计工作室<em>ZHI XI DESIGN</em></span>
        </div>

        <div class="tag-card__mid">
          <span class="tag-card__photo"><img src="images/avatar.jpg" alt="" draggable="false"></span>
          <span class="tag-card__who">
            <b class="tag-card__name">陈芷曦</b>
            <i class="tag-card__en">Zhixi Chen</i>
          </span>
        </div>

        <div class="tag-card__dept">
          <span class="tag-card__dept-big">设计部</span>
          <span class="tag-card__dept-sub">UI 设计师</span>
        </div>

        <div class="tag-card__foot">
          <span class="tag-card__stars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="tag-card__no">NO.072</span>
        </div>
      </div>
    </div>
  `;

  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* 挂点：页面右上角，紧贴导航栏下沿 */
  const anchor = { x: 0, y: 0 };
  const nodes = [];
  let segLen = 26;      // 静止时每段长度
  let stretch = 0;      // 当前拉伸量（0~TAG_CFG.stretch），拖拽时为正值
  let raf = 0, last = 0, scrollVel = 0, lastY = 0;
  let swayTarget = 0, sway = 0;

  /* 当前实际每段长度：绳子会随拉伸变长，松手后再收回 */
  function curSeg() { return segLen * (1 + stretch); }

  function metrics() {
    /* 挂点要贴着导航栏下沿 —— host 的 top 在 CSS 里也是同一个值，
       两边对不上绳子就会出现一段悬空。 */
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--r-nav-h')) || 62;
    /* 绳段长度按视口高度算。
       不能拿 host.getBoundingClientRect().height —— 卡片是 absolute，
       host 的高度是 0，算出来永远落到下限，绳子只有几十 px 长。 */
    segLen = Math.max(16, Math.min(28, window.innerHeight * 0.024));
    const hostW = host.getBoundingClientRect().width || 112;
    anchor.x = Math.round(window.innerWidth - hostW / 2 - 18);
    anchor.y = Math.round(navH + 3);
  }

  function build() {
    nodes.length = 0;
    for (let i = 0; i < TAG_CFG.nodes; i++) {
      nodes.push({
        x: anchor.x, y: anchor.y + segLen * (i + 1),
        px: anchor.x, py: anchor.y + segLen * (i + 1)
      });
    }
  }

  function integrate(dt) {
    const g = TAG_CFG.gravity * dt * dt;
    for (const n of nodes) {
      const vx = (n.x - n.px) * TAG_CFG.damping;
      const vy = (n.y - n.py) * TAG_CFG.damping;
      n.px = n.x; n.py = n.y;
      n.x += vx;
      n.y += vy + g;
    }
  }

  function constrain() {
    /* 首端钉在挂点上 */
    const sl = curSeg();
    nodes[0].x = anchor.x;
    nodes[0].y = anchor.y;
    for (let k = 0; k < TAG_CFG.iterations; k++) {
      nodes[0].x = anchor.x;
      nodes[0].y = anchor.y;
      for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1], b = nodes[i];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - sl) / d * 0.5;
        dx *= diff; dy *= diff;
        if (i > 1) { a.x += dx; a.y += dy; }
        b.x -= dx; b.y -= dy;
      }
    }
  }

  /* 拉伸量：拖拽时按「绳末端离挂点多远」拉长，松手后收回。
     回弹就靠这个收缩驱动 —— 绳长变短，约束会把末端拽回来，
     比另外加一个冲量干净（加冲量会让绳长降不下来，改过一版就是这毛病）。 */
  function updateStretch(dragging) {
    const rest = segLen * (nodes.length - 1);
    if (rest <= 1) return;
    let target;
    if (dragging) {
      const tip = nodes[nodes.length - 1];
      const d = Math.hypot(tip.x - anchor.x, tip.y - anchor.y);
      target = Math.max(0, Math.min(TAG_CFG.stretch, d / rest - 1));
    } else {
      target = 0;                                   // 松手：绳长收回静止长度
    }
    const k = dragging ? 0.28 : 0.20;
    stretch += (target - stretch) * k;
    if (stretch < 0.0015) stretch = 0;
  }

  function render() {
    const tip = nodes[nodes.length - 1];
    const prev = nodes[nodes.length - 2] || nodes[0];
    const angle = Math.atan2(tip.x - prev.x, tip.y - prev.y);   // 绳的切线
    const deg = angle * 180 / Math.PI * TAG_CFG.tiltScale + sway;
    host.style.setProperty('--tag-rot', deg.toFixed(2) + 'deg');

    /* 绳末端相对挂点的偏移与长度。卡片要以「绳头」为基准挂上去：
       只写垂直偏移的话，拉斜时绳子长度 > 垂直分量，绳和卡片会脱开。 */
    const rx = tip.x - anchor.x, ry = tip.y - anchor.y;
    const ropeLen = Math.max(8, Math.hypot(rx, ry));
    host.style.setProperty('--tag-x', rx.toFixed(2) + 'px');
    host.style.setProperty('--tag-cord', ry.toFixed(1) + 'px');
    host.style.setProperty('--tag-tip-x', rx.toFixed(2) + 'px');
    host.style.setProperty('--tag-tip-y', ry.toFixed(2) + 'px');
    host.style.setProperty('--tag-rope-len', ropeLen.toFixed(1) + 'px');

    const cordEl = host.querySelector('.tag-cord');
    if (cordEl) {
      /* 绳是竖直画的一条宽扁带，用「长度 + 转角」把它摆到末端位置。
         ⚠️ 角度必须写 atan2(-rx, ry)，不能是 atan2(rx, ry)：
         CSS 的 rotate(θ) 把带子底端 (0, L) 变换到 (-L·sinθ, L·cosθ)
         （y 轴向下）。要让它正好落在末端的 (rx, ry) 上，
         需要 -L·sinθ = rx，即 θ = atan2(-rx, ry)。
         写成 atan2(rx, ry) 的话，绳子会朝卡片的反方向甩出去 ——
         工牌和绳子「脱离」就是这么来的。 */
      const deg2 = -Math.atan2(rx, ry) * 180 / Math.PI;
      cordEl.style.height = ropeLen.toFixed(1) + 'px';
      cordEl.style.transform = 'rotate(' + deg2.toFixed(2) + 'deg)';
      cordEl.style.transformOrigin = '50% 0';
    }
  }

  /* ---------- 鼠标拖拽：抓住工牌甩 ---------- */
  const drag = { on: false, pid: null, x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0, t: 0 };

  /* 拖拽能拉到的最大距离：静止绳长 × (1 + stretch) 再留一点余量。
     用静止绳长算，不能拿 curSeg()——那会随绳长变化，形成反馈循环 */
  function ropeMax() { return segLen * (nodes.length - 1) * (1 + TAG_CFG.stretch); }

  function onDown(e) {
    /* 判定「点中工牌」必须用卡片自身的矩形。
       不能用 .tag-host 的：卡片是 absolute，撑不开父元素，
       host 的高度是 0（top 与 bottom 相等），拿它做范围判定永远命中不了。
       也不能用绳末端质点：卡片挂在末端下方，中心还要低 60~80px。 */
    const card = host.querySelector('.tag-card');
    const cr = card ? card.getBoundingClientRect() : null;
    if (!cr || !cr.width) return;
    const pad = 12;
    if (e.clientX < cr.left - pad || e.clientX > cr.right + pad ||
        e.clientY < cr.top - pad || e.clientY > cr.bottom + pad) return;

    /* 绳子末端吸附到卡片顶部中心，这样一抓就顺 */
    const tip = nodes[nodes.length - 1];
    if (tip) { tip.x = cr.left + cr.width / 2; tip.y = cr.top + 6; }

    drag.on = true;
    drag.pid = e.pointerId;
    drag.x = drag.px = e.clientX;
    drag.y = drag.py = e.clientY;
    drag.vx = drag.vy = 0;
    drag.t = performance.now();
    host.classList.add('is-dragging');
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  }

  function onMove(e) {
    if (!drag.on || e.pointerId !== drag.pid) return;
    const now = performance.now();
    const dt = Math.max(8, now - drag.t);
    /* 记录指针速度，松手时按这个甩出去 */
    drag.vx = (e.clientX - drag.px) / dt * 1000;
    drag.vy = (e.clientY - drag.py) / dt * 1000;
    drag.px = e.clientX; drag.py = e.clientY; drag.t = now;
    drag.x = e.clientX; drag.y = e.clientY;
  }

  function onUp(e) {
    if (!drag.on || (e && e.pointerId !== undefined && e.pointerId !== drag.pid)) return;
    drag.on = false;
    host.classList.remove('is-dragging');
    try { host.releasePointerCapture(drag.pid); } catch (err) {}
    drag.pid = null;

    const tip = nodes[nodes.length - 1];
    const dt = 1 / 60;

    /* ① 跟手速度：松手就顺着力道甩出去 */
    tip.px = tip.x - drag.vx * TAG_CFG.throwScale * dt;
    tip.py = tip.y - drag.vy * TAG_CFG.throwScale * dt;
    for (let i = 1; i < nodes.length - 1; i++) {
      const k = 1 - i / nodes.length;
      nodes[i].px -= drag.vx * k * 0.35 * dt;
      nodes[i].py -= drag.vy * k * 0.35 * dt;
    }

    /* 回弹不在这里加冲量 —— 交给 updateStretch() 把绳长收回，
       约束自然会把末端拽回来。加冲量会让绳长降不下去。 */
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
    last = now;

    /* 滚动速度 → 对首端施加水平外力。
       注意不能去改 nodes[0].px：constrain() 每帧都把首端钉在挂点上，
       连 px 一起重置，垂直方向看不出问题，水平冲量却会被整个吃掉
       （第一版就是这么写的，挂件死活不甩）。 */
    const y = window.scrollY || 0;
    scrollVel += (y - lastY);
    lastY = y;
    scrollVel *= 0.86;
    const sv = Math.max(-TAG_CFG.maxScrollVel, Math.min(TAG_CFG.maxScrollVel, scrollVel));
    const push = sv * TAG_CFG.scrollForce;

    swayTarget = Math.max(-18, Math.min(18, sv * 0.55));
    sway += (swayTarget - sway) * 0.12;

    integrate(dt);

    if (drag.on) {
      /* 拖拽中：让卡片中心跟住指针。
         卡片挂在绳末端下方，所以要按「指针 − 卡片悬挂偏移」反推末端目标，
         否则松手位置和指针会差一个卡片高度。 */
      const tip = nodes[nodes.length - 1];
      const card = host.querySelector('.tag-card');
      const cr = card ? card.getBoundingClientRect() : null;
      const offX = cr ? (cr.left + cr.width / 2) - tip.x : 0;
      const offY = cr ? (cr.top + 6) - tip.y : 0;

      const max = ropeMax();
      let dx = (drag.x - offX) - anchor.x;
      let dy = (drag.y - offY) - anchor.y;
      const d = Math.hypot(dx, dy);
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      const tx = anchor.x + dx, ty = anchor.y + dy;
      tip.x += (tx - tip.x) * TAG_CFG.dragDamp;
      tip.y += (ty - tip.y) * TAG_CFG.dragDamp;
      /* 中间几节顺势跟过来，整条绳才不会拧成一团 */
      for (let i = 1; i < nodes.length - 1; i++) {
        const k = i / (nodes.length - 1);
        nodes[i].x += (anchor.x + dx * k - nodes[i].x) * TAG_CFG.dragDamp * 0.6;
        nodes[i].y += (anchor.y + dy * k - nodes[i].y) * TAG_CFG.dragDamp * 0.6;
      }
    } else if (push) {
      nodes[1].x += push;        // 推第一节，让它带动整条绳
    }

    /* 绳长跟着拉伸量走：拖长时变长、松手后收回（回弹的动力来源） */
    updateStretch(drag.on);

    constrain();
    render();

    raf = requestAnimationFrame(frame);
  }

  function start() {
    metrics();
    build();
    lastY = window.scrollY || 0;
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* 「减弱动态效果」不能拿来提前 return —— 那会把拖拽交互一起砍掉，
     而且这个判定在脚本加载那一刻未必准（headless 早期会报 reduce）。
     正确做法：物理照常跑，只把动画性行为减弱。 */
  let reducedNow = reduced;
  if (window.matchMedia) {
    try { reducedNow = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  }
  if (reducedNow) {
    TAG_CFG.scrollForce = 0;      // 不随滚动甩
    TAG_CFG.damping = 0.72;       // 摆两下就停
    TAG_CFG.throwScale = 0.25;    // 松手也不乱飞
  }

  start();
  window.addEventListener('resize', () => { metrics(); build(); });

  /* 售货机是整版宽的海报，工牌 fixed 在右上角会压住它的版权块，
     所以售货机进入视口时把工牌收起来，滚开再放回来。

     注意时序：本文件在 index.html 里排在 vending.js 之前，
     脚本执行到这里时 #vm 还没被创建，直接查会拿到 null。
     所以等 DOMContentLoaded 之后再挂观察器。 */
  function setupAvoidVending() {
    const vm = document.getElementById('vm');
    if (!vm || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([entry]) => {
      host.classList.toggle('is-tucked', entry.isIntersecting);
    }, { threshold: 0.12 }).observe(vm);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAvoidVending, { once: true });
  } else {
    setupAvoidVending();
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { last = performance.now(); if (!raf) raf = requestAnimationFrame(frame); }
  });

  /* 拖拽交互：
     监听挂在 document 上、用坐标判定是否点中工牌 —— 比挂在工牌元素上稳，
     不受 pointer-events / 3D 变换 / 捕获重定向的影响。 */
  document.addEventListener('pointerdown', onDown, true);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return { start };
})();

/* ==========================================
   作品展示柜 —— 站点开屏（复古仪器 · 3D 实体）
   结构、打字与拖拽逻辑都在这里；配色与通用组件在 retro.css
   替换点：文案在 CABINET_TEXT；分类在 CATEGORIES；手感在 CAB_CFG
   ========================================== */

/* 替换点：屏幕上的字 —— 逐字打出 */
const CABINET_TEXT = {
  eyebrow: '欢迎观看我的',
  title:   '作品展示柜',
  meta:    'UI设计师',
  date:    '2026.10',
  hint:    '按住拖动 · 转个角度    |    按 START 打印作品目录'
};

/* 替换点：三个拨杆的分类（严格按设计图，不要多加） */
const CATEGORIES = ['视觉创意', 'UI设计', '电商设计'];

/* 替换点：START 打印出来的目录（对着静态作品集那份目录） */
const PRINT_ITEMS = [
  '咔么租赁 APP 改版项目',
  '俄罗斯短剧 APP 落地页展示',
  '惠商官网设计',
  '兔展智能 AI CARD 项目',
  '鲨鱼幻想 · 舟舟 IP 展示',
  '安踏电商详情设计展示',
  '2D 拼图游戏《应星记》展示'
];

const PRINT_CFG = {
  leadIn: 420,     // 按下 START 到开始吐纸的延迟
  perItem: 320,    // 每行之间的间隔（毫秒）
  dotsPerItem: 3   // 每行响几声「哒」
};

const CAB_CFG = {
  typeSpeed:  58,     // 每个字的间隔（毫秒）
  typeHold:   240,    // 一行打完后停一下
  startDelay: 400,    // 进页面后多久开始打字

  /* —— 手感：与档案袋那套一致 —— */
  yaw:      -13,      // 初始水平转角
  pitch:      9,      // 初始俯仰角
  gainYaw:    0.30,   // 横向每像素转多少度
  gainPitch:  0.26,   // 纵向每像素转多少度
  friction:   0.93,   // 松手后惯性衰减
  minSpin:    0.02,
  /* 允许转到的范围：留出边界，转到侧面时机器不至于整个跑出视口 */
  yawRange:   38,
  pitchMin:  -26,
  pitchMax:   34,
  hoverGain:  2.6,
  hoverEase:  0.09,
  backStiff:  0.055   // 松手后往初始角度回一点，别一直歪着
};

const Cabinet = (() => {
  const root = document.getElementById('paperScreen');
  if (!root) return { play() {} };

  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- 骨架：6 面立体盒 ---------- */
  root.insertAdjacentHTML('afterbegin', `
    <div class="cab">
      <div class="cab__stage" id="cabStage" role="button" tabindex="0"
           aria-label="作品展示柜：按住可拖动转动视角">
        <div class="cab__pack" id="cabPack">
          <div class="cab__slab cab__slab--front">
            <!-- 屏幕 -->
            <div class="cab__bezel">
              <div class="cab__screen r-screen" id="cabScreen">
                <div class="cab__screen-inner">
                  <div class="cab__row cab__row--top">
                    <p class="cab__led cab__led--eyebrow"><span data-type="eyebrow"></span><i class="r-caret"></i></p>
                    <p class="cab__led cab__led--title"><span data-type="title"></span><i class="r-caret"></i></p>
                  </div>
                  <p class="cab__led cab__led--meta">
                    <span class="cab__led-warm" data-type="meta"></span>
                    <span class="cab__led-date" data-type="date"></span>
                    <span class="cab__led-lights" aria-hidden="true"></span>
                  </p>
                </div>
              </div>
            </div>

            <!-- 控制台 -->
            <div class="cab__deck">
              <div class="cab__deck-left">
                <span class="cab__gear" data-gear="a" aria-hidden="true"></span>
                <button type="button" class="cab__start" id="cabStart">
                  <i class="cab__start-bar" aria-hidden="true"></i>
                  <span>START</span>
                  <i class="cab__start-bar" aria-hidden="true"></i>
                </button>
                <span class="cab__gear" data-gear="b" aria-hidden="true"></span>
              </div>

              <div class="cab__deck-right">
                <div class="cab__toggles">
                  ${CATEGORIES.map(c => `
                    <button type="button" class="r-toggle" data-cat="${c}" aria-pressed="false">
                      <span class="r-toggle__label">${c}</span>
                      <span class="r-toggle__track" data-state="OFF"></span>
                    </button>`).join('')}
                </div>
                <!-- 滑块两端有 PS / AI（在设计图里它们位于滑轨下方两侧） -->
                <div class="cab__slider">
                  <span class="cab__slider-rail" aria-hidden="true"><i class="cab__slider-knob"></i></span>
                  <span class="cab__slider-cap cab__slider-cap--l" aria-hidden="true">PS</span>
                  <span class="cab__slider-cap cab__slider-cap--r" aria-hidden="true">AI</span>
                </div>
              </div>
            </div>

            <!-- 出纸口 -->
            <div class="cab__slot" aria-hidden="true"></div>
          </div>
          <div class="cab__slab cab__slab--back">
            <span class="cab__back-mark" aria-hidden="true">Zhixi · Portfolio</span>
            <span class="cab__back-no" aria-hidden="true">NO. 072</span>
          </div>
          <span class="cab__slab cab__slab--edge cab__slab--r" aria-hidden="true"></span>
          <span class="cab__slab cab__slab--edge cab__slab--l" aria-hidden="true"></span>
          <span class="cab__slab cab__slab--edge cab__slab--t" aria-hidden="true"></span>
          <span class="cab__slab cab__slab--edge cab__slab--b" aria-hidden="true"></span>
        </div>
      </div>

      <!-- 纸带：按 START 后从出纸口吐出来（内容在 PRINT_ITEMS） -->
      <div class="cab__tape-out" id="cabTape" aria-live="polite"></div>

      <p class="cab__hint" id="cabHint"></p>
    </div>
  `);

  const stage = document.getElementById('cabStage');
  const pack  = document.getElementById('cabPack');
  const screen = document.getElementById('cabScreen');
  const hintEl = document.getElementById('cabHint');

  /* ---------- 舞台尺寸：尽量铺满，同时保证转动时不越界 ---------- */
  let stageSize = { w: 0, h: 0 };

  function fitStage() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--r-nav-h')) || 62;
    const availH = vh - navH - 84;            // 留给导航与提示
    /* 宽高比随屏幕自适应：宽屏用参考图的横版比例，
       窄屏（手机）转成竖向 —— 否则横版比例会被高度约束压成一条扁片 */
    const narrow = vw < 760;
    const ratio = narrow ? 1.12 : 1.62;
    let w = Math.min(vw * (narrow ? 0.94 : 0.86), 1440);
    let h = w / ratio;
    if (h > availH) { h = availH; w = h * ratio; }
    stageSize = { w: Math.round(w), h: Math.round(h) };
    stage.style.width  = stageSize.w + 'px';
    stage.style.height = stageSize.h + 'px';
    /* 厚度跟着尺寸走：小屏薄一点，大屏厚一点 */
    root.style.setProperty('--cab-t', Math.round(clamp(w * 0.052, 26, 72)) + 'px');
    applyFit();
  }

  /* 转动时按投影比例微缩：转了 yaw 之后面板的投影宽度是 W·cos(yaw)，
     所以缩放要乘 cos(yaw) 才压得回视口内（乘 1/cos 反而会放大，写反过一次）。
     pitch 方向余量本来够，但俯仰会让面板投影变高，也给一点克制系数。 */
  function applyFit() {
    if (!stageSize.w) return;
    const y = Math.abs(cur.yaw) * Math.PI / 180;
    const p = Math.abs(cur.pitch) * Math.PI / 180;
    let fit = Math.cos(y) * Math.cos(p * 0.5);
    fit = Math.max(fit, 0.6);
    stage.style.setProperty('--cab-fit', fit.toFixed(4));
  }

  /* ---------- 拖拽转视角（与档案袋同一套手感） ---------- */
  const cur = { yaw: CAB_CFG.yaw, pitch: CAB_CFG.pitch };
  let vel = { yaw: 0, pitch: 0 };
  let hover = { x: 0, y: 0 }, hoverAim = { x: 0, y: 0 };
  let dragging = false, pid = null, lastX = 0, lastY = 0, lastT = 0, travel = 0;
  let raf = 0, reach = 0, reachAim = 0;

  function write() {
    stage.style.setProperty('--yaw',   cur.yaw.toFixed(2) + 'deg');
    stage.style.setProperty('--pitch', cur.pitch.toFixed(2) + 'deg');
    stage.style.setProperty('--reach', reach.toFixed(3));
    applyFit();          // 拖拽时实时微缩，保证不顶出视口
  }

  function tick() {
    raf = 0;
    if (dragging) { write(); return; }

    cur.yaw   += vel.yaw;
    cur.pitch += vel.pitch;
    vel.yaw   *= CAB_CFG.friction;
    vel.pitch *= CAB_CFG.friction;
    if (Math.abs(vel.yaw)   < CAB_CFG.minSpin) vel.yaw = 0;
    if (Math.abs(vel.pitch) < CAB_CFG.minSpin) vel.pitch = 0;

    /* 松手后缓慢回到初始角度，避免长时间歪着 */
    cur.yaw   += (CAB_CFG.yaw   + hover.x - cur.yaw)   * CAB_CFG.backStiff;
    cur.pitch += (CAB_CFG.pitch + hover.y - cur.pitch) * CAB_CFG.backStiff;

    hover.x += (hoverAim.x - hover.x) * CAB_CFG.hoverEase;
    hover.y += (hoverAim.y - hover.y) * CAB_CFG.hoverEase;
    reach   += (reachAim - reach) * 0.12;

    write();

    const busy =
      Math.abs(vel.yaw) > CAB_CFG.minSpin || Math.abs(vel.pitch) > CAB_CFG.minSpin ||
      Math.abs(cur.yaw - CAB_CFG.yaw) > 0.03 || Math.abs(cur.pitch - CAB_CFG.pitch) > 0.03 ||
      Math.abs(hover.x - hoverAim.x) > 0.02 || Math.abs(hover.y - hoverAim.y) > 0.02 ||
      Math.abs(reachAim - reach) > 0.004;

    if (busy) raf = requestAnimationFrame(tick);
    else stage.classList.remove('is-releasing');
  }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }

  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; pid = e.pointerId;
    travel = 0;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    vel.yaw = 0; vel.pitch = 0;
    stage.classList.add('is-dragging');
    stage.classList.remove('is-releasing');
    wake();
  });

  window.addEventListener('pointermove', e => {
    if (!dragging) {
      if (e.pointerType === 'mouse') {
        const r = stage.getBoundingClientRect();
        if (r.width && r.height) {
          const nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
          const ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
          hoverAim.x = nx * -CAB_CFG.hoverGain;
          hoverAim.y = ny * -CAB_CFG.hoverGain * 0.6;
          stage.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
          stage.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
          reachAim = 1;
          wake();
        }
      }
      return;
    }
    if (e.pointerId !== pid) return;

    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    travel += Math.hypot(dx, dy);

    cur.yaw   = clamp(cur.yaw   - dx * CAB_CFG.gainYaw,   -CAB_CFG.yawRange, CAB_CFG.yawRange);
    cur.pitch = clamp(cur.pitch + dy * CAB_CFG.gainPitch, CAB_CFG.pitchMin,  CAB_CFG.pitchMax);

    const now = performance.now();
    const dt = Math.max(8, now - lastT);
    vel.yaw   = -(dx * CAB_CFG.gainYaw)   * (16 / dt) * 0.75;
    vel.pitch =  (dy * CAB_CFG.gainPitch) * (16 / dt) * 0.75;

    lastX = e.clientX; lastY = e.clientY; lastT = now;
    wake();
  }, { passive: true });

  function endDrag(e) {
    if (!dragging) return;
    if (e && e.pointerId !== undefined && e.pointerId !== pid) return;
    dragging = false; pid = null;
    stage.classList.remove('is-dragging');
    stage.classList.add('is-releasing');
    /* 回正的过程中让缩放平滑回到 1（拖动时是实时的，不能带过渡，否则会跟不上） */
    stage.style.transition = '--cab-fit 0.5s ease-out';
    setTimeout(() => { stage.style.transition = ''; }, 620);
    wake();
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', () => {
    if (dragging) return;
    hoverAim.x = 0; hoverAim.y = 0; reachAim = 0; wake();
  });
  stage.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const first = root.querySelector('.r-toggle');
      if (first) first.click();
    }
  });
  window.addEventListener('resize', () => { fitStage(); wake(); });

  /* ---------- 打字机 ---------- */
  function typeInto(el, text, speed) {
    return new Promise(resolve => {
      if (!el) return resolve();
      el.textContent = '';
      if (reduced) { el.textContent = text; return resolve(); }
      let i = 0;
      const step = () => {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, speed);
        else resolve();
      };
      setTimeout(step, speed);
    });
  }

  function setActive(field) {
    root.querySelectorAll('[data-type]').forEach(s => {
      s.closest('.cab__led')?.classList.toggle('is-typing', s.dataset.type === field);
    });
  }

  async function play() {
    await new Promise(r => setTimeout(r, CAB_CFG.startDelay));
    for (const field of ['eyebrow', 'title', 'meta', 'date']) {
      setActive(field);
      await typeInto(root.querySelector(`[data-type="${field}"]`), CABINET_TEXT[field], CAB_CFG.typeSpeed);
      await new Promise(r => setTimeout(r, CAB_CFG.typeHold));
    }
    setActive(null);
    screen.classList.add('is-lit');
    root.querySelectorAll('.r-caret').forEach(c => c.style.display = 'none');
    hintEl.textContent = CABINET_TEXT.hint;
    hintEl.classList.add('is-on');
    window.dispatchEvent(new Event('cabinet:typed'));
  }

  /* ---------- 拨杆：按钮上显示 ON / OFF ---------- */
  root.querySelectorAll('.r-toggle').forEach(btn => {
    const track = btn.querySelector('.r-toggle__track');
    if (track) track.dataset.state = 'OFF';
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      if (track) track.dataset.state = on ? 'ON' : 'OFF';
    });
  });

  /* ---------- 齿轮联动：两轮反向、按齿数比定转速 ---------- */
  (() => {
    const gears = root.querySelectorAll('.cab__gear');
    if (gears.length < 2) return;
    const BASE = 11;          // 大轮一圈的秒数
    const RATIO = 0.7;        // 小轮齿数比（转得更快）
    gears[0].style.animationDuration = BASE + 's';
    gears[1].style.animationDuration = (BASE * RATIO).toFixed(2) + 's';
    gears[1].style.animationDirection = 'reverse';
  })();

  /* ---------- START：纸带逐条吐出来，每条配「哒哒」声 ---------- */
  const tapeEl = document.getElementById('cabTape');
  const startBtn = document.getElementById('cabStart');
  let printing = false;

  /* 纸带是 fixed 浮层，位置要对齐出纸口（窗口变化、滚动都要跟上） */
  function placeTape() {
    if (!tapeEl) return;
    const slot = root.querySelector('.cab__slot');
    if (!slot) return;
    const r = slot.getBoundingClientRect();
    tapeEl.style.left = Math.round(r.left) + 'px';
    tapeEl.style.top = Math.round(r.bottom - 8) + 'px';
    tapeEl.style.width = Math.round(r.width) + 'px';
  }
  window.addEventListener('resize', placeTape);
  window.addEventListener('scroll', placeTape, { passive: true });

  /* 纸带显示期间持续跟随出纸口：整机上移是个 0.85s 的过渡动画，
     一次性算位置必然对不上（之前就是这么错的，纸带落在视口外）。 */
  let followRaf = 0;
  function followTape() {
    followRaf = 0;
    if (!tapeEl || !tapeEl.classList.contains('is-out')) return;
    placeTape();
    followRaf = requestAnimationFrame(followTape);
  }
  function startFollow() { if (!followRaf) followRaf = requestAnimationFrame(followTape); }
  function stopFollow() {
    if (followRaf) { cancelAnimationFrame(followRaf); followRaf = 0; }
    root.classList.remove('is-printing');
  }

  function printTape() {
    if (printing || !tapeEl) return;
    printing = true;
    startBtn && startBtn.classList.add('is-running');
    if (window.Sfx) { Sfx.unlock(); Sfx.start(); Sfx.gearOn(); }

    root.classList.add('is-printing');   // 整机上移，给出纸口腾地方
    tapeEl.classList.add('is-out');
    startFollow();
    setTimeout(followTape, 0);

    tapeEl.innerHTML =
      '<p class="cab__tape-line cab__tape-line--head">ARCHIVE 072 · 作品目录 · ' + CABINET_TEXT.date + '</p>';
    const items = reduced ? PRINT_ITEMS.slice(0, 0) : PRINT_ITEMS;   // 尊重减弱动态：不打逐条动画

    let i = 0;
    const step = () => {
      if (i >= items.length) {
        tapeEl.insertAdjacentHTML('beforeend',
          '<p class="cab__tape-line cab__tape-line--foot">共 ' + PRINT_ITEMS.length + ' 项 · 详情见作品区</p>');
        printing = false;
        startBtn && startBtn.classList.remove('is-running');
        if (window.Sfx) Sfx.gearOff();
        if (followRaf) { cancelAnimationFrame(followRaf); followRaf = 0; }
        window.dispatchEvent(new Event('cabinet:printed'));
        return;
      }
      const line = document.createElement('p');
      line.className = 'cab__tape-line';
      line.textContent = items[i];
      tapeEl.appendChild(line);
      tapeEl.scrollTop = tapeEl.scrollHeight;
      /* 每行响几声「哒」，和吐纸同步 */
      if (window.Sfx) {
        for (let k = 0; k < PRINT_CFG.dotsPerItem; k++) {
          setTimeout(() => window.Sfx && Sfx.tick(1 - k * 0.22), k * 26);
        }
      }
      i++;
      setTimeout(step, PRINT_CFG.perItem);
    };

    if (reduced) {
      /* 不做逐条动画：一次列完 */
      items.forEach(t => {
        const line = document.createElement('p');
        line.className = 'cab__tape-line';
        line.textContent = t;
        tapeEl.appendChild(line);
      });
      printing = false;
      if (window.Sfx) Sfx.gearOff();
      window.dispatchEvent(new Event('cabinet:printed'));
      return;
    }
    setTimeout(step, PRINT_CFG.leadIn);
  }

  if (startBtn) startBtn.addEventListener('click', printTape);

  if (reduced) {
    root.querySelectorAll('[data-type]').forEach(s => {
      s.textContent = CABINET_TEXT[s.dataset.type] || '';
    });
    root.querySelectorAll('.r-caret').forEach(c => c.style.display = 'none');
    screen.classList.add('is-lit');
    hintEl.textContent = CABINET_TEXT.hint;
    hintEl.classList.add('is-on');
  } else {
    play();
  }

  fitStage();
  write();
  return { play, fitStage, CATEGORIES, CABINET_TEXT };
})();

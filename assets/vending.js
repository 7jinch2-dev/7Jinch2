/* ==========================================
   灵感售货机 —— 按设计图复刻
   结构：标题区 / 深色玻璃窗（上半玻璃球 + 下半 3D 食物货架）/ 标签 / 贴纸
   交互：点球 → 下方轮播切换到该类别作品
   替换点：VM_CATS / VM_TINTS / VM_ITEMS / VM_SNACKS
   ========================================== */

/* 四个类别 —— 严格按设计图（设计图里就是 4 颗球），顺序即从左到右。
   球体直接用素材图（自带玻璃质感、颗粒、液面和中间的类别文字），
   不要用 CSS 画：素材那种磨砂通透感 CSS 做不出来。 */
const VM_CATS = ['UI设计', '详情设计', 'IP设计', '游戏设计'];

/* 每颗球对应的素材图 */
const VM_BALL_IMG = {
  'UI设计':  'images/vm/ball-ui.png',
  '详情设计': 'images/vm/ball-detail.png',
  'IP设计':  'images/vm/ball-ip.png',
  '游戏设计': 'images/vm/ball-game.png'
};

/* 项目（id 对应 projects/<id>.html） */
const VM_ITEMS = [
  { id: 'nativelike',    title: 'NativeLike 游戏化英语学习', cat: 'UI设计' },
  { id: 'kame-app',      title: '咔么租赁 APP 改版',        cat: 'UI设计' },
  { id: 'huishang',      title: '惠商开放平台官网',          cat: 'UI设计' },
  { id: 'anta-618',      title: '安踏电商 618 大促视觉',     cat: '详情设计' },
  { id: 'kook-ip',       title: 'KOOK「小酷」IP 设计',       cat: 'IP设计' },
  { id: 'zhouzhou-ip',   title: '集美学村 IP「舟舟」',       cat: 'IP设计' },
  { id: 'yingxingji',    title: '应星记 · 拼图游戏',         cat: '游戏设计' },
  { id: 'russian-drama', title: '俄罗斯短剧 APP 落地页',     cat: 'UI设计' },
  { id: 'tuzhan-ai',     title: '兔展智能 AI CARD',         cat: 'UI设计' }
];

/* 货架上的 3D 食物：7 个，宽度按各自比例（切图时的原始宽） */
const VM_SNACKS = [
  { src: 'images/vm/snack-1.png', w: 458 },
  { src: 'images/vm/snack-2.png', w: 456 },
  { src: 'images/vm/snack-3.png', w: 425 },
  { src: 'images/vm/snack-4.png', w: 472 },
  { src: 'images/vm/snack-5.png', w: 332 },
  { src: 'images/vm/snack-6.png', w: 575 },
  { src: 'images/vm/snack-7.png', w: 503 }
];

const VendingMachine = (() => {
  const root = document.getElementById('vmRoot');
  if (!root) return;

  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  root.insertAdjacentHTML('beforeend', `
    <div class="vm" id="vm">

      <!-- 标题区 -->
      <header class="vm__head">
        <h2 class="vm__title">灵感<span class="vm__no">の</span>售货机</h2>
        <p class="vm__sub">WELCOME TO MY INSPIRATION<br>VENDING MACHINE</p>
        <div class="vm__legal" aria-hidden="true">
          <p class="vm__legal-top">SEASON № XXII &nbsp; DS-SN-08</p>
          <p class="vm__legal-brand">№</p>
          <p class="vm__legal-body">© COPYRIGHT. ALL RIGHTS RESERVED<br>
            ALL ITEMS AND PRICES ARE SUBJECT TO<br>
            CHANGE WITHOUT NOTICE. NOT LIABLE FOR<br>
            ANY LOSS OR DAMAGE RESULTING FROM<br>
            THE USE OF THE CONTENTS.</p>
          <div class="vm__barcode" aria-hidden="true"></div>
          <p class="vm__legal-foot">23-56 RUE DE PARIS · 75008 PARIS, FR<br>
            OFC TOWER · 267 DES VOEUX ROAD<br>
            <b>R034-BXP</b> · UNITED KINGDOM</p>
        </div>
      </header>

      <!-- 机器主体：只画外框和玻璃窗背景 -->
      <div class="vm__machine">
        <div class="vm__glass" id="vmGlass"></div>
      </div>

      <!-- 内容层：直接挂在 .vm 上，百分比才等于设计图上的百分比 -->
      <div class="vm__balls">
        ${VM_CATS.map((c, i) => `
          <button type="button" class="vm-ball" data-cat="${c}" data-i="${i}"
                  aria-label="查看「${c}」类别">
            <span class="vm-ball__glass">
              <img src="${VM_BALL_IMG[c]}" alt="" draggable="false">
            </span>
          </button>`).join('')}
      </div>

      <!-- 货架分隔线 -->
      <span class="vm__divider" aria-hidden="true"></span>

      <!-- 下半：3D 食物 -->
      <div class="vm__shelf">
        ${VM_SNACKS.map((s, i) => {
          const mid = (VM_SNACKS.length - 1) / 2;
          const ry = ((i - mid) / mid) * 9;
          return `<span class="snack" style="--snack-w:${s.w}; --snack-ry:${ry.toFixed(2)}deg; --snack-i:${i}">
                    <img src="${s.src}" alt="" draggable="false">
                  </span>`;
        }).join('')}
      </div>

      <!-- 左下黄色标签 / 右下绿色贴纸 -->
      <img class="vm__sign" src="images/vm/sign.png" alt="" draggable="false" aria-hidden="true">
      <img class="vm__sticker" src="images/vm/sticker.png" alt="" draggable="false" aria-hidden="true">

      <!-- 当前类别提示 -->
      <p class="vm__status" id="vmReadout">投一颗球 · 看看这个类别里有什么</p>
    </div>
  `);

  const glass = document.getElementById('vmGlass');
  const readout = document.getElementById('vmReadout');
  const balls = [...root.querySelectorAll('.vm-ball')];

  /* ---------- 点球：球下沉 → 轮播切到该类别 ---------- */
  let picking = false;

  function pick(ball) {
    const cat = ball.dataset.cat;
    if (picking) return;
    picking = true;

    balls.forEach(b => b.classList.remove('is-picked'));
    ball.classList.add('is-picked');
    if (readout) {
      readout.textContent = '已取出：' + cat + ' · ' + VM_ITEMS.filter(i => i.cat === cat).length + ' 个项目';
    }

    if (window.Sfx) { Sfx.unlock(); Sfx.click(240); setTimeout(() => Sfx.click(170), 110); }
    glass.classList.add('is-active');
    setTimeout(() => glass.classList.remove('is-active'), 640);

    /* 驱动下方轮播 */
    let tries = 0;
    (function apply() {
      if (window.FlexCarousel && window.FlexCarousel.filter) {
        window.FlexCarousel.filter(cat);
        const wrap = document.getElementById('worksCarousel');
        if (wrap) {
          wrap.classList.remove('is-swapping');
          void wrap.offsetWidth;
          wrap.classList.add('is-swapping');
          const r = wrap.getBoundingClientRect();
          if (r.top > window.innerHeight * 0.72 || r.bottom < 90) {
            wrap.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
          }
        }
        setTimeout(() => { ball.classList.remove('is-picked'); picking = false; }, 520);
        return;
      }
      if (tries++ < 40) setTimeout(apply, 100);
      else { ball.classList.remove('is-picked'); picking = false; }
    })();
  }

  balls.forEach(b => b.addEventListener('click', () => pick(b)));

  /* 复位 */
  if (readout) {
    readout.addEventListener('click', () => {
      balls.forEach(b => b.classList.remove('is-picked'));
      readout.textContent = '投一颗球 · 看看这个类别里有什么';
      if (window.FlexCarousel && window.FlexCarousel.filter) window.FlexCarousel.filter(null);
    });
    readout.style.cursor = 'pointer';
    readout.title = '点一下复位';
  }
})();

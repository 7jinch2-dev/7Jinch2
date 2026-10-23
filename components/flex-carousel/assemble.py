"""把 FlexCarousel 组件装配成站内可用的零构建版本。
constants / shaders / engine 三段是从组件源码机械提取的（见提取脚本），
这里只补上配置、作品数据、DOM 与状态更新的接口。
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PARTS = os.path.join(ROOT, "work", "fc")
OUT = os.path.join(ROOT, "outputs", "assets")

constants = open(os.path.join(PARTS, "parts_constants.js"), encoding="utf-8").read()
shaders = open(os.path.join(PARTS, "parts_shaders.js"), encoding="utf-8").read()
engine = open(os.path.join(PARTS, "parts_engine.js"), encoding="utf-8").read()

CSS = open(os.path.join(PARTS, "FlexCarousel.css"), encoding="utf-8").read()

CSS += """
/* ==========================================
   站内适配（组件原文之外的部分）
   替换点：轮播高度改这里
   ========================================== */
.sec-works .flex-carousel {
  height: min(560px, 72vh);
  margin-top: 30px;
}

.flex-carousel__title {
  color: var(--text-primary);
}

.flex-carousel__subtitle {
  color: var(--text-tertiary);
}
"""

HEAD = """/* ==========================================
   作品轮播 FlexCarousel
   React Bits「FlexCarousel」的移植版：着色器与引擎逻辑逐字保留，
   只把 React 外壳换成了普通函数与 DOM 操作。

   依赖：内置的 ogl（assets/ogl-src/），不依赖任何 CDN。
   替换点：CONFIG 改参数（对应组件 props），ITEMS 改作品。
   ========================================== */
import { Renderer } from './ogl-src/src/core/Renderer.js';
import { Program } from './ogl-src/src/core/Program.js';
import { Mesh } from './ogl-src/src/core/Mesh.js';
import { Texture } from './ogl-src/src/core/Texture.js';
import { RenderTarget } from './ogl-src/src/core/RenderTarget.js';
import { Plane } from './ogl-src/src/extras/Plane.js';
import { Triangle } from './ogl-src/src/extras/Triangle.js';

/* ---------- 常量（组件原文） ---------- */
"""

CONFIG_JS = """
/* ---------- 配置：与组件 props 一一对应 ---------- */
const CONFIG = {
  preset: 'liquid',
  intro: 'rise',
  cardHeight: 0.5,
  gap: 12,
  radius: 0,
  fit: 'natural',
  squeeze: 0.2,
  focusOnClick: true,
  captions: true,
  autoplay: false,
  interval: 4,
  // true = 鼠标停在轮播上时滚轮改为翻卡片（页面不滚动）；false = 正常滚动页面
  captureWheel: true,
  // 下面这些留空就用 preset 里的默认值
  lensWidth: null,
  lensHeight: null,
  tilt: null,
  roundness: null,
  bend: null,
  reach: null,
  curl: null,
  dispersion: null,
  liquid: null,
  followCursor: null
};

/* ---------- 作品数据 ---------- */
const ITEMS = [
  { src: 'images/works/nativelike.jpg', title: 'NativeLike', subtitle: '儿童英语学习 App', alt: 'NativeLike 儿童英语学习 App' },
  { src: 'images/works/kame-app.jpg', title: '咔么租赁 APP 改版', subtitle: 'APP 改版', alt: '咔么租赁 APP 改版' },
  { src: 'images/works/russian-drama.jpg', title: '俄罗斯短剧 APP 落地页', subtitle: '落地页设计', alt: '俄罗斯短剧 APP 落地页' },
  { src: 'images/works/huishang.jpg', title: '惠商开放平台官网', subtitle: '官网设计', alt: '惠商开放平台官网' },
  { src: 'images/works/tuzhan-ai.jpg', title: '兔展智能 AI CARD', subtitle: 'AIGC 设计', alt: '兔展智能 AI CARD' },
  { src: 'images/works/kook-ip.jpg', title: 'KOOK「小酷」IP 设计', subtitle: 'IP 设计', alt: 'KOOK 小酷 IP 设计' },
  { src: 'images/works/zhouzhou-ip.jpg', title: '集美学村 IP「舟舟」', subtitle: 'IP 设计', alt: '集美学村 IP 舟舟' },
  { src: 'images/works/anta-618.jpg', title: '安踏电商 618 大促视觉', subtitle: '电商视觉', alt: '安踏电商 618 大促视觉' },
  { src: 'images/works/yingxingji.jpg', title: '应星记 · 拼图游戏', subtitle: '游戏 UI', alt: '应星记 拼图游戏' }
];

/* ---------- 启动 ---------- */
const root = document.getElementById('flexCarousel');

if (root) {
  const base = BEND_PRESETS[CONFIG.preset] || BEND_PRESETS.liquid;
  const pick = (value, key) => (value === undefined || value === null ? base[key] : value);

  const settings = {
    intro: CONFIG.intro,
    cardHeight: CONFIG.cardHeight,
    gap: CONFIG.gap,
    radius: CONFIG.radius,
    fit: CONFIG.fit,
    lensWidth: pick(CONFIG.lensWidth, 'lensWidth'),
    lensHeight: pick(CONFIG.lensHeight, 'lensHeight'),
    tilt: pick(CONFIG.tilt, 'tilt'),
    roundness: pick(CONFIG.roundness, 'roundness'),
    bend: pick(CONFIG.bend, 'bend'),
    reach: pick(CONFIG.reach, 'reach'),
    curl: pick(CONFIG.curl, 'curl'),
    dispersion: pick(CONFIG.dispersion, 'dispersion'),
    liquid: pick(CONFIG.liquid, 'liquid'),
    followCursor: pick(CONFIG.followCursor, 'followCursor'),
    squeeze: CONFIG.squeeze,
    focusOnClick: CONFIG.focusOnClick,
    autoplay: CONFIG.autoplay,
    interval: CONFIG.interval,
    captureWheel: CONFIG.captureWheel
  };

  let items = ITEMS;
  const callbacks = { onChange: null, onSelect: null };
  let engine = null;

  /* ---------- 字幕：对应组件里的 active / revealed / focusOpen 三个状态 ---------- */
  const captionEl = root.querySelector('.flex-carousel__caption');
  const titleEl = root.querySelector('.flex-carousel__title');
  const digitsEl = root.querySelector('.flex-carousel__digits');
  const totalEl = root.querySelector('.flex-carousel__count-total');
  const countEl = root.querySelector('.flex-carousel__count');
  const liveEl = root.querySelector('.flex-carousel__live');

  const makeDigits = value => {
    const frag = document.createDocumentFragment();
    String(value).padStart(2, '0').split('').forEach(digit => {
      const col = document.createElement('span');
      col.className = 'flex-carousel__digit';
      const reel = document.createElement('span');
      reel.className = 'flex-carousel__reel';
      reel.style.transform = `translateY(${-Number(digit) * 10}%)`;
      for (const n of '0123456789') {
        const cell = document.createElement('span');
        cell.textContent = n;
        reel.appendChild(cell);
      }
      col.appendChild(reel);
      frag.appendChild(col);
    });
    return frag;
  };

  let captionActive = -1;
  let captionRevealed = false;
  let captionFocus = false;

  const renderCaption = () => {
    const item = items[captionActive] || items[0];
    if (!item) return;
    if (!CONFIG.captions || !captionRevealed) {
      captionEl.hidden = true;
      liveEl.textContent = '';
      return;
    }
    captionEl.hidden = false;
    if (titleEl.dataset.index !== String(captionActive)) {
      titleEl.dataset.index = String(captionActive);
      titleEl.textContent = '';
      const name = document.createElement('span');
      name.textContent = item.title || item.alt || '';
      titleEl.appendChild(name);
      if (item.subtitle) {
        const sub = document.createElement('span');
        sub.className = 'flex-carousel__subtitle';
        sub.textContent = item.subtitle;
        titleEl.appendChild(sub);
      }
    }
    digitsEl.textContent = '';
    digitsEl.appendChild(makeDigits(captionActive + 1));
    totalEl.textContent = String(items.length).padStart(2, '0');
    countEl.toggleAttribute('data-hidden', captionFocus);
    liveEl.textContent = `${item.title || item.alt}, ${captionActive + 1} of ${items.length}`;
  };

  const setActive = index => {
    captionActive = index;
    renderCaption();
  };
  const setRevealed = () => {
    captionRevealed = true;
    captionActive = captionActive < 0 ? 0 : captionActive;
    renderCaption();
  };
  const setFocus = open => {
    captionFocus = open;
    renderCaption();
  };

  /* ---------- 引擎（组件原文，仅替换了 React 相关的调用） ---------- */
  (() => {
"""

TAIL = """
  })();
}
"""

js = HEAD + constants + "\n\n/* ---------- 着色器（组件原文，逐字保留） ---------- */\n" + shaders + "\n" + CONFIG_JS + engine + "\n    };\n" + TAIL

os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, "carousel.js"), "w", encoding="utf-8").write(js)
open(os.path.join(OUT, "carousel.css"), "w", encoding="utf-8").write(CSS)

print("carousel.js 行数:", js.count("\n") + 1)
print("carousel.css 行数:", CSS.count("\n") + 1)

/* ==========================================
   音效 —— 全部用 Web Audio 合成，零素材文件
   点阵打印机的「哒」是噪声脉冲 + 快速衰减包络，
   齿轮是低频摩擦，拨杆/投币是金属撞击。
   替换点：音量与音色在下面 SFX_CFG
   注意：浏览器要求首次用户交互后才能出声，
        所以 AudioContext 在第一次按键时才 resume。
   ========================================== */

const SFX_CFG = {
  master: 0.5,       // 总音量
  printGain: 0.32,   // 打印声
  gearGain: 0.07,    // 齿轮底噪
  clickGain: 0.3,    // 拨杆
  startGain: 0.4     // START 按下
};

const Sfx = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  let gearSrc = null, gearGain = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : SFX_CFG.master;
    master.connect(ctx.destination);
    return ctx;
  }

  /* 首次交互时解锁音频 */
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  /* 噪声脉冲：打印头的「哒」 */
  function dot(when, gain, tone) {
    const c = ensure();
    if (!c || muted) return;
    const dur = 0.03;
    const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = tone || 1700;
    bp.Q.value = 1.1;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
    src.connect(bp).connect(g).connect(master);
    src.start(when);
    src.stop(when + dur + 0.01);
  }

  /* 一声「哒」 */
  function tick(strength) {
    const c = ensure();
    if (!c || muted) return;
    dot(c.currentTime, SFX_CFG.printGain * (strength || 1), 1500 + Math.random() * 700);
  }

  /* 机械「咔哒」：短促方波 */
  function click(pitch) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(pitch || 320, t);
    o.frequency.exponentialRampToValueAtTime((pitch || 320) * 0.55, t + 0.045);
    const g = c.createGain();
    g.gain.setValueAtTime(SFX_CFG.clickGain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.06);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.07);
  }

  /* START：低沉的启动音 */
  function start() {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(210, t + 0.16);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0008, t);
    g.gain.exponentialRampToValueAtTime(SFX_CFG.startGain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    o.connect(lp).connect(g).connect(master);
    o.start(t); o.stop(t + 0.24);
  }

  /* 齿轮底噪：循环的低频噪声，开机时轻轻起 */
  function gearOn() {
    const c = ensure();
    if (!c || muted || gearSrc) return;
    const dur = 1.2;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.06) * 0.94;   // 棕噪声
      d[i] = last;
    }
    gearSrc = c.createBufferSource();
    gearSrc.buffer = buf;
    gearSrc.loop = true;
    gearGain = c.createGain();
    gearGain.gain.value = 0;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    gearSrc.connect(lp).connect(gearGain).connect(master);
    gearSrc.start();
    gearGain.gain.linearRampToValueAtTime(SFX_CFG.gearGain, c.currentTime + 1.2);
  }

  function gearOff() {
    const c = ensure();
    if (!c || !gearSrc) return;
    try { gearGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.3); } catch (e) {}
    const s = gearSrc;
    setTimeout(() => { try { s.stop(); } catch (e) {} }, 400);
    gearSrc = null; gearGain = null;
  }

  function setMuted(v) {
    muted = !!v;
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : SFX_CFG.master, ctx.currentTime, 0.02);
  }

  function isMuted() { return muted; }

  /* 首次任意交互都可用来解锁 */
  ['pointerdown', 'keydown'].forEach(t =>
    window.addEventListener(t, unlock, { once: true, passive: true }));

  return { tick, click, start, gearOn, gearOff, setMuted, isMuted, unlock };
})();

/* ==========================================
   声音开关：接 Sfx，状态存在 localStorage（刷新后记住）
   ========================================== */
(() => {
  const btn = document.getElementById('navMute');
  if (!btn || !window.Sfx) return;
  let muted = false;
  try { muted = localStorage.getItem('czx-muted') === '1'; } catch (e) {}
  Sfx.setMuted(muted);
  btn.setAttribute('aria-pressed', String(muted));

  btn.addEventListener('click', () => {
    muted = !muted;
    Sfx.unlock();
    Sfx.setMuted(muted);
    btn.setAttribute('aria-pressed', String(muted));
    try { localStorage.setItem('czx-muted', muted ? '1' : '0'); } catch (e) {}
    if (!muted) Sfx.click(320);
  });
})();

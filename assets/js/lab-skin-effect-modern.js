/* Современная модель скин-эффекта. Физика та же, что в апплете 2001 года,
   но открыта частота, зашитая там на 1 кГц, и добавлена анимация фазы.
   Цвета берутся из CSS-переменных сайта, поэтому график перекрашивается
   вместе с контрастными схемами ГОСТ. */
"use strict";

const MU0 = 4 * Math.PI * 1e-7;   // магнитная постоянная, Гн/м
const E0  = 100;                  // амплитуда поля на поверхности, мВ/м

const MATERIALS = {
  copper: { name: "Медь",   sigma: 5.6e7,  color: "#b87333" },
  brass:  { name: "Латунь", sigma: 1.45e7, color: "#c9a227" },
  tin:    { name: "Олово",  sigma: 8.6e6,  color: "#9aa5ad" },
  steel:  { name: "Сталь",  sigma: 8.0e6,  color: "#78838f" },
};

/** Глубина проникновения, мм. */
function skinDepth(sigma, freq) {
  const omega = 2 * Math.PI * freq;
  return Math.sqrt(2 / (omega * MU0 * sigma)) * 1000;
}

/** Положение ползунка 0..100 → частота 10 Гц .. 10 МГц (логарифмическая шкала). */
function sliderToFreq(pos) {
  return Math.pow(10, 1 + (pos / 100) * 5);
}

function formatFreq(f) {
  if (f >= 1e6) return (f / 1e6).toLocaleString("ru", { maximumSignificantDigits: 3 }) + " МГц";
  if (f >= 1e3) return (f / 1e3).toLocaleString("ru", { maximumSignificantDigits: 3 }) + " кГц";
  return f.toLocaleString("ru", { maximumSignificantDigits: 3 }) + " Гц";
}

const num = (v, d = 2) => v.toLocaleString("ru", { minimumFractionDigits: d, maximumFractionDigits: d });

// --- состояние -------------------------------------------------------------

const state = {
  material: "copper",
  thickness: 5,     // мм
  freq: 1000,       // Гц
  probe: 0,         // мм
  running: true,
  phase: 0,
};

const el = {
  canvas:    document.getElementById("plot"),
  material:  document.getElementById("material"),
  thickness: document.getElementById("thickness"),
  freq:      document.getElementById("freq"),
  probe:     document.getElementById("probe"),
  pause:     document.getElementById("pause"),
  thicknessVal: document.getElementById("thicknessVal"),
  freqVal:      document.getElementById("freqVal"),
  probeVal:     document.getElementById("probeVal"),
  rDelta: document.getElementById("rDelta"),
  rProbe: document.getElementById("rProbe"),
  rRatio: document.getElementById("rRatio"),
  rAtten: document.getElementById("rAtten"),
};

const ctx = el.canvas.getContext("2d");
const PAD = { l: 62, r: 20, t: 20, b: 44 };

function resize() {
  const cssW = el.canvas.parentElement.clientWidth - 24;
  const cssH = Math.max(300, Math.min(430, cssW * 0.46));
  const dpr = window.devicePixelRatio || 1;
  el.canvas.width  = Math.round(cssW * dpr);
  el.canvas.height = Math.round(cssH * dpr);
  el.canvas.style.height = cssH + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  el.canvas._w = cssW;
  el.canvas._h = cssH;
}

// --- отрисовка -------------------------------------------------------------

function draw() {
  const w = el.canvas._w, h = el.canvas._h;
  const mat = MATERIALS[state.material];
  const delta = skinDepth(mat.sigma, state.freq);
  const d = state.thickness;

  const x0 = PAD.l, x1 = w - PAD.r;
  const y0 = PAD.t, y1 = h - PAD.b;
  const yMid = (y0 + y1) / 2;
  const yScale = (y1 - y0) / 2 / (E0 * 1.12);

  const css = getComputedStyle(document.documentElement);
  const c = (n) => css.getPropertyValue(n).trim();

  const zToX = (z) => x0 + (z / d) * (x1 - x0);
  const eToY = (e) => yMid - e * yScale;

  ctx.clearRect(0, 0, w, h);

  // тело пластины
  ctx.fillStyle = mat.color;
  ctx.globalAlpha = 0.10;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.globalAlpha = 1;

  // сетка по глубине — узлы кратные Δ
  ctx.strokeStyle = c("--grid");
  ctx.lineWidth = 1;
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (let k = 1; k * delta < d; k++) {
    const x = zToX(k * delta);
    ctx.beginPath();
    ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    ctx.fillStyle = c("--muted");
    ctx.fillText(k + "Δ", x, y1 + 30);
  }

  // оси
  ctx.strokeStyle = c("--axis");
  ctx.beginPath();
  ctx.moveTo(x0, yMid); ctx.lineTo(x1, yMid);
  ctx.moveTo(x0, y0);   ctx.lineTo(x0, y1);
  ctx.stroke();

  // подписи оси E
  ctx.fillStyle = c("--muted");
  ctx.textAlign = "right";
  for (const e of [-100, -50, 0, 50, 100]) {
    ctx.fillText(String(e), x0 - 8, eToY(e) + 4);
  }
  ctx.save();
  ctx.translate(16, yMid);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillStyle = c("--ink");
  ctx.fillText("E, мВ/м", 0, 0);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = c("--ink");
  ctx.fillText("Координата зонда z, мм", (x0 + x1) / 2, y1 + 38);

  ctx.fillStyle = c("--muted");
  ctx.textAlign = "left";
  ctx.fillText("0 — поверхность", x0 + 4, y1 + 14);
  ctx.textAlign = "right";
  ctx.fillText(num(d, 1) + " мм", x1 - 2, y1 + 14);

  // огибающая ±E₀·exp(−z/Δ)
  ctx.strokeStyle = c("--envelope");
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.5;
  for (const sign of [1, -1]) {
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const z = (i / 400) * d;
      const y = eToY(sign * E0 * Math.exp(-z / delta));
      i ? ctx.lineTo(zToX(z), y) : ctx.moveTo(zToX(z), y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // мгновенное распределение поля
  ctx.strokeStyle = c("--wave");
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 600; i++) {
    const z = (i / 600) * d;
    const e = E0 * Math.exp(-z / delta) * Math.cos(state.phase - z / delta);
    const y = eToY(e);
    i ? ctx.lineTo(zToX(z), y) : ctx.moveTo(zToX(z), y);
  }
  ctx.stroke();

  // зонд
  const zp = Math.min(state.probe, d);
  const ep = E0 * Math.exp(-zp / delta) * Math.cos(state.phase - zp / delta);
  const xp = zToX(zp);
  ctx.strokeStyle = c("--probe");
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(xp, y0); ctx.lineTo(xp, y1); ctx.stroke();
  ctx.fillStyle = c("--probe");
  ctx.beginPath();
  ctx.arc(xp, eToY(ep), 5, 0, 2 * Math.PI);
  ctx.fill();

  return { delta, ep, zp };
}

// --- цикл и синхронизация --------------------------------------------------

let last = performance.now();

/** Одна перерисовка с обновлением числовых показаний. */
function render() {
  const { delta, ep } = draw();
  el.rDelta.textContent = num(delta, 3);
  el.rProbe.textContent = num(ep, 2);
  el.rRatio.textContent = num(state.thickness / delta, 2);
  el.rAtten.textContent = num(20 * Math.log10(Math.exp(-state.thickness / delta)), 1);
}

function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (state.running) state.phase += 2 * Math.PI * 1.0 * dt;   // ~1 период в секунду
  render();
  requestAnimationFrame(frame);
}

function syncLabels() {
  el.thicknessVal.textContent = num(state.thickness, 1);
  el.freqVal.textContent = formatFreq(state.freq);
  el.probeVal.textContent = num(state.probe, 2);
  el.probe.max = state.thickness;
}

el.material.addEventListener("change", (e) => { state.material = e.target.value; });
el.thickness.addEventListener("input", (e) => {
  state.thickness = +e.target.value;
  state.probe = Math.min(state.probe, state.thickness);
  el.probe.value = state.probe;
  syncLabels();
});
el.freq.addEventListener("input", (e) => { state.freq = sliderToFreq(+e.target.value); syncLabels(); });
el.probe.addEventListener("input", (e) => { state.probe = +e.target.value; syncLabels(); });
el.pause.addEventListener("click", () => {
  state.running = !state.running;
  el.pause.textContent = state.running ? "Пауза" : "Продолжить";
});

// перетаскивание зонда мышью и пальцем
function probeFromPointer(ev) {
  const r = el.canvas.getBoundingClientRect();
  const x = ev.clientX - r.left;
  const frac = (x - PAD.l) / (el.canvas._w - PAD.l - PAD.r);
  state.probe = Math.max(0, Math.min(1, frac)) * state.thickness;
  el.probe.value = state.probe;
  syncLabels();
}
el.canvas.addEventListener("pointerdown", (ev) => {
  el.canvas.setPointerCapture(ev.pointerId);
  probeFromPointer(ev);
});
el.canvas.addEventListener("pointermove", (ev) => {
  if (ev.pressure > 0 || ev.buttons) probeFromPointer(ev);
});

window.addEventListener("resize", () => { resize(); render(); });
resize();
syncLabels();
render();
requestAnimationFrame(frame);

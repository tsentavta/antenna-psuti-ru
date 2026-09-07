/* Классическая модель работы «Исследование поля прямоугольного волновода».
   Перенесена без изменений из автономной страницы. */
"use strict";

// --- константы, восстановленные из GraphWG ---------------------------------
const C_MM_GHZ = 299.792458;          // скорость света, мм·ГГц
const A_WG = 23;                       // широкая стенка, мм
const KAP2 = Math.pow(Math.PI / A_WG, 2);
const MU = 1.2566370614359172;         // магнитная постоянная в единицах оригинала
const TWO_B_OVER_A = 0.8695652173913043;  // 2b/a при b = 10 мм
const X_REF = 600;                     // опорная плоскость нагрузки, десятые доли мм
const GRAPH_W = 400, GRAPH_H = 100;

// геометрия стенда (снята из вызовов reshape в LabWrk34.init)
const HEAD_W = 84, HEAD_TOP = 136, HEAD_AXIS = 44;   // ось зонда внутри картинки головки
const GRAPH_X = 86;
const CABLE_Y = 159;                                  // высота стержня головки
const JACK_X = 600, JACK_Y = 119;                     // разъём «Вход» микроамперметра

const RANGES = [
  { label: " 10 мА",   iMax: 9990,   iMin: 10,     nMult: 1,      nDiv: 100, fmt: 2 },
  { label: "1000 мкА", iMax: 999,    iMin: 1,      nMult: 10,     nDiv: 1,   fmt: 0 },
  { label: "100 мкА",  iMax: 99.9,   iMin: 0.1,    nMult: 100,    nDiv: 10,  fmt: 1 },
  { label: " 10 мкА",  iMax: 9.99,   iMin: 0.01,   nMult: 1000,   nDiv: 100, fmt: 2 },
  { label: "1000 нА",  iMax: 0.999,  iMin: 0.001,  nMult: 10000,  nDiv: 1,   fmt: 0 },
  { label: " 100 нА",  iMax: 0.0999, iMin: 0.0001, nMult: 100000, nDiv: 10,  fmt: 1 },
];

const state = {
  freq: 5.00, power: 40.0, xProbe: 0,
  genOn: false, microOn: false,
  range: 0, load: 0,
  sigma: 0, dTract: 0,
  beta: 0, alpha: 0, modRefl: 1, phaseRefl: Math.PI, travel: false,
};

const $ = (id) => document.getElementById(id);
const el = {
  stand: $("stand"), lbFreq: $("lbFreq"), lbPower: $("lbPower"), lbCurrent: $("lbCurrent"),
  lbCoord: $("lbCoord"), lbSection: $("lbSection"), slFreq: $("slFreq"), slPower: $("slPower"),
  btGen: $("btGenPower"), btMicro: $("btMicroPower"), btLeft: $("btLeft"), btRight: $("btRight"),
  chRange: $("choiceRange"), chLoad: $("choiceLoad"),
  head: $("head"), graph: $("graph"), cable: $("cablePath"),
};
const ctx = el.graph.getContext("2d");

// --- физика (воспроизводит GraphWG.Beta / Alpha / Refl / Press / Amplitude) --

function omega() { return 2 * Math.PI * state.freq; }

function updateBeta() {
  const k = omega() / C_MM_GHZ;
  const k2 = k * k;
  if (k2 > KAP2) { state.travel = true;  state.beta = Math.sqrt(k2 - KAP2); }
  else           { state.travel = false; state.beta = Math.sqrt(KAP2 - k2); }
}

function alphaOf(sigma) {
  const w = omega();
  let t = (w * w) / KAP2 / C_MM_GHZ / C_MM_GHZ;   // (f/f_кр)²
  t = KAP2 * (t + TWO_B_OVER_A);
  return t / Math.sqrt(2 * w * MU * sigma) / state.beta / 10;
}

function reflOf(sigma) {
  const wm = omega() * MU;
  const Zw = wm / state.beta;                      // Z_в, действительное
  const Rs = 0.70710678 * Math.sqrt(wm / sigma);   // R_s
  const nr = Rs - Zw, ni = Rs;                     // Z_s − Z_в
  const dr = Rs + Zw, di = Rs;                     // Z_s + Z_в
  const den = dr * dr + di * di;
  const gr = (nr * dr + ni * di) / den;
  const gi = (ni * dr - nr * di) / den;
  state.modRefl = Math.hypot(gr, gi) / Math.exp(2 * state.alpha * state.dTract);
  state.phaseRefl = Math.atan2(gi, gr) - 2 * state.beta * state.dTract;
}

function press() { return 1 / Math.pow(10, state.power / 20); }

/** Амплитуда в точке x (десятые доли мм от начала линии). */
function amplitude(x) {
  if (state.travel) {
    const t = 2 * state.modRefl *
      Math.cos(2 * state.beta * (x - X_REF) / 10 + state.phaseRefl);
    return press() * Math.sqrt(1 + state.modRefl * state.modRefl + t);
  }
  return press() / Math.exp(state.beta * x);
}

// --- нагрузка --------------------------------------------------------------

function applyLoad() {
  if (state.load === 0) {                 // КЗ — идеальное отражение
    state.modRefl = 1;
    state.phaseRefl = Math.PI;
    el.lbSection.textContent = "";
    el.lbSection.classList.add("off");
  } else {                                // Тракт — случайные параметры
    state.sigma = 10000 * (1 + 6 * Math.random());
    state.alpha = alphaOf(state.sigma);
    state.dTract = Math.floor(100 + 400 * Math.random());
    el.lbSection.textContent = String(state.dTract);
    el.lbSection.classList.remove("off");
    state.dTract *= 10;                   // см → мм
    reflOf(state.sigma);
  }
}

// --- показания -------------------------------------------------------------

const fmt = (v, dec) => v.toFixed(dec);

/** Ток детектора в единицах выбранного предела; null — вне шкалы. */
function meterValue() {
  if (!state.genOn || !state.microOn) return 0;
  const r = RANGES[state.range];
  let cur = 1000 * amplitude(state.xProbe);
  cur = cur * cur;                                   // квадратичный детектор
  if (cur > r.iMax) return null;                     // зашкал
  if (cur < r.iMin) return 0;
  let n = Math.trunc(cur * r.nMult);
  const d = n % 10;
  n = Math.trunc(n / 10);
  if (d >= 5) n++;
  return n / r.nDiv;
}

function currentText() {
  const v = meterValue();
  return v === null ? "####" : fmt(v, RANGES[state.range].fmt);
}

// --- график ----------------------------------------------------------------

function drawGraph() {
  ctx.fillStyle = state.genOn ? "#04231f" : "#101816";
  ctx.fillRect(0, 0, GRAPH_W, GRAPH_H);
  if (!state.genOn) return;

  const scale = state.travel ? GRAPH_H / 2 / press() : GRAPH_H / press();

  ctx.strokeStyle = "#3ce08a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 200; i++) {
    const x = i * 2;
    const y = GRAPH_H - scale * amplitude(x);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = "#f0c419";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(state.xProbe, 0);
  ctx.lineTo(state.xProbe, GRAPH_H);
  ctx.stroke();
}

// --- кабель ----------------------------------------------------------------

function headLeft() { return GRAPH_X + state.xProbe - HEAD_AXIS; }

function drawCable() {
  const ax = headLeft() + HEAD_W;           // правый край головки — стержень
  const dx = JACK_X - ax;
  const sag = Math.min(30, Math.max(4, dx * 0.11));
  el.cable.setAttribute("d",
    "M " + JACK_X + " " + JACK_Y +
    " L " + JACK_X + " " + (CABLE_Y - 8) +
    " C " + JACK_X + " " + (CABLE_Y + sag) +
    " "   + (ax + dx * 0.35) + " " + (CABLE_Y + sag) +
    " "   + ax + " " + CABLE_Y);
}

// --- сборка кадра ----------------------------------------------------------

function render() {
  updateBeta();
  if (state.load === 1) { state.alpha = alphaOf(state.sigma); reflOf(state.sigma); }

  setField(el.lbFreq, fmt(state.freq, 2));
  setField(el.lbPower, "-" + fmt(state.power, 1));
  setField(el.lbCoord, fmt(state.xProbe / 10, 1));
  el.lbCurrent.textContent = currentText();

  el.lbFreq.classList.toggle("off", !state.genOn);
  el.lbPower.classList.toggle("off", !state.genOn);
  el.lbCurrent.classList.toggle("off", !state.microOn);
  el.btGen.setAttribute("aria-pressed", String(state.genOn));
  el.btMicro.setAttribute("aria-pressed", String(state.microOn));

  el.stand.classList.toggle("cutoff", !state.travel);
  el.head.style.left = headLeft() + "px";

  drawCable();
  drawGraph();
}

/** Не перетирает поле, пока пользователь его редактирует. */
function setField(node, text) {
  if (document.activeElement === node) return;
  node.value = text;
  node.classList.remove("bad");
}

// --- редактируемые поля ----------------------------------------------------

function bindField(node, parse, apply) {
  const commit = () => {
    const v = parse(node.value.replace(",", "."));
    if (v === null) { node.classList.add("bad"); return; }
    node.classList.remove("bad");
    apply(v);
    node.blur();
    render();
  };
  node.addEventListener("change", commit);
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { node.blur(); render(); }
  });
  node.addEventListener("blur", () => { node.classList.remove("bad"); render(); });
}

const parseRange = (lo, hi) => (s) => {
  const v = parseFloat(s);
  return Number.isFinite(v) && v >= lo && v <= hi ? v : null;
};

bindField(el.lbFreq, parseRange(5, 40), (v) => {
  state.freq = v; el.slFreq.value = Math.round(v * 100);
});
bindField(el.lbPower, (s) => {
  const v = parseFloat(s);
  if (!Number.isFinite(v)) return null;
  const a = Math.abs(v);                 // принимаем и «-12.5», и «12.5»
  return a >= 0 && a <= 40 ? a : null;
}, (v) => { state.power = v; el.slPower.value = Math.round(v * 10); });
bindField(el.lbCoord, parseRange(0, 39.8), (v) => { state.xProbe = Math.round(v * 10); });

// --- органы управления -----------------------------------------------------

RANGES.forEach((r, i) => el.chRange.add(new Option(r.label, String(i))));
[" КЗ", "Тракт"].forEach((s, i) => el.chLoad.add(new Option(s, String(i))));

el.slFreq.addEventListener("input", (e) => { state.freq = +e.target.value / 100; render(); });
el.slPower.addEventListener("input", (e) => { state.power = +e.target.value / 10; render(); });
el.chRange.addEventListener("change", (e) => { state.range = +e.target.value; render(); });
el.chLoad.addEventListener("change", (e) => { state.load = +e.target.value; applyLoad(); render(); });
el.btGen.addEventListener("click", () => { state.genOn = !state.genOn; render(); });
el.btMicro.addEventListener("click", () => { state.microOn = !state.microOn; render(); });

function moveProbe(delta) {
  state.xProbe = Math.max(0, Math.min(398, state.xProbe + delta));
  render();
}
el.btLeft.addEventListener("click", () => moveProbe(-1));
el.btRight.addEventListener("click", () => moveProbe(1));

function probeFromEvent(ev) {
  const r = el.stand.getBoundingClientRect();
  const scale = r.width / 682;
  const x = (ev.clientX - r.left) / scale - GRAPH_X;
  state.xProbe = Math.max(0, Math.min(398, Math.round(x)));
  render();
}
for (const node of [el.head, el.graph]) {
  node.addEventListener("pointerdown", (ev) => {
    node.setPointerCapture(ev.pointerId);
    probeFromEvent(ev);
    ev.preventDefault();
  });
  node.addEventListener("pointermove", (ev) => { if (ev.buttons) probeFromEvent(ev); });
}

// стенд — растр фиксированного размера, вписываем по ширине
function fit() {
  const box = el.stand.parentElement;
  const s = Math.min(1, box.clientWidth / 682);
  el.stand.style.transform = "scale(" + s + ")";
  box.style.height = Math.ceil(356 * s) + "px";
}
window.addEventListener("resize", fit);

applyLoad();
fit();
render();

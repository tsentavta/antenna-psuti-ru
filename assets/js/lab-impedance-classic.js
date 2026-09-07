/* Классическая модель работы «Измерение полных сопротивлений нагрузки».
   Перенесена без изменений из автономной страницы. */
"use strict";

// --- константы, восстановленные из Graph и WorkBench -----------------------
const C_MM_GHZ = 299.792458;    // скорость света, мм·ГГц
const Z0 = 50;                   // волновое сопротивление линии, Ом
const UT = 0.0253;               // тепловой потенциал детекторного диода, В
const I0 = 10;                   // масштабный ток детектора
const GRAPH_W = 420, GRAPH_H = 118;
const X_REF = 620;               // опорная плоскость нагрузки, десятые доли мм

// геометрия стенда (снята из вызовов reshape в WorkBench.init)
const HEAD_W = 84, HEAD_TOP = 136, HEAD_AXIS = 44;
const GRAPH_X = 86;
const CABLE_Y = 159;             // высота стержня головки
const JACK_X = 600, JACK_Y = 119;   // разъём «Вход» микроамперметра
const PATCH = { x: 545, y: 153, w: 66, h: 14 };   // чем закрыть вплавленный кабель

const RANGES = [
  { label: " 10 мА",   iMax: 9990,   iMin: 10,     nMult: 1,      nDiv: 100, fmt: 2 },
  { label: "1000 мкА", iMax: 999,    iMin: 1,      nMult: 10,     nDiv: 1,   fmt: 0 },
  { label: "100 мкА",  iMax: 99.9,   iMin: 0.1,    nMult: 100,    nDiv: 10,  fmt: 1 },
  { label: " 10 мкА",  iMax: 9.99,   iMin: 0.01,   nMult: 1000,   nDiv: 100, fmt: 2 },
  { label: "1000 нА",  iMax: 0.999,  iMin: 0.001,  nMult: 10000,  nDiv: 1,   fmt: 0 },
  { label: " 100 нА",  iMax: 0.0999, iMin: 0.0001, nMult: 100000, nDiv: 10,  fmt: 1 },
];

const LOADS = [" Замыкание", "Согласование", "  Активная",
               " Малый КСВ", "Средний КСВ", "Большой КСВ", " КЗ поршень"];

const state = {
  freq: 5.00, power: 60.0, xProbe: 0, xLine: 0,
  genOn: false, microOn: false,
  range: 0, load: 0, plunger: false,
  zRe: 0, zIm: 0, modRefl: 1, phaseRefl: Math.PI,
};

const $ = (id) => document.getElementById(id);
const el = {
  stand: $("stand"), lbFreq: $("lbFreq"), lbPower: $("lbPower"), lbCurrent: $("lbCurrent"),
  lbCoord: $("lbCoord"), lbLine: $("lbLine"), slFreq: $("slFreq"), slPower: $("slPower"),
  slLine: $("slLine"), btGen: $("btGenPower"), btMicro: $("btMicroPower"),
  btLeft: $("btLeft"), btRight: $("btRight"), chRange: $("choiceRange"), chLoad: $("choiceLoad"),
  head: $("head"), graph: $("graph"), cable: $("cablePath"), patch: $("cablePatch"),
};
const ctx = el.graph.getContext("2d");

// --- физика (воспроизводит Graph.Beta / Press / Refl / Amplitude) ----------

function beta() { return 2 * Math.PI * state.freq / C_MM_GHZ; }
function press() { return 1 / Math.pow(10, state.power / 20); }

/** Γ = (Z_н − Z₀)/(Z_н + Z₀) */
function refl() {
  const nr = state.zRe - Z0, ni = state.zIm;
  const dr = state.zRe + Z0, di = state.zIm;
  const den = dr * dr + di * di;
  const gr = (nr * dr + ni * di) / den;
  const gi = (ni * dr - nr * di) / den;
  state.modRefl = Math.hypot(gr, gi);
  state.phaseRefl = Math.atan2(gi, gr);
}

/** Амплитуда в точке x (десятые доли мм от начала линии). */
function amplitude(x) {
  const x2 = X_REF + state.xLine;
  const t = 2 * state.modRefl *
    Math.cos(2 * beta() * (x - x2) / 10 + state.phaseRefl);
  return press() * Math.sqrt(1 + state.modRefl * state.modRefl + t);
}

// --- розыгрыш нагрузки (воспроизводит WorkBench.Select / SelLoad) ----------

/** Случайное сопротивление: либо в a…b раз больше 50 Ом, либо во столько же меньше. */
function select(a, b) {
  if (Math.random() > 0.5) return Z0 * (a + (b - a) * Math.random());
  return Z0 * (1 / a + (1 / b - 1 / a) * Math.random());
}

function selLoad(a, b) {
  const re = select(a, b);
  let im = re > Z0 ? select(a, b)
                   : Z0 * (1 / a + (1 / b - 1 / a) * Math.random());
  if (Math.random() > 0.5) im = -im;
  return { re: re, im: im };
}

function applyLoad() {
  state.plunger = false;
  state.xLine = 0;
  let z;
  switch (state.load) {
    case 0: z = { re: 0,  im: 0 }; break;                      // замыкание
    case 1: z = { re: Z0, im: 0 }; break;                      // согласование
    case 2: z = { re: select(8, 1), im: 0 }; break;            // активная
    case 3: z = selLoad(3, 1);  break;                         // малый КСВ
    case 4: z = selLoad(8, 3);  break;                         // средний КСВ
    case 5: z = selLoad(25, 8); break;                         // большой КСВ
    default:                                                    // КЗ поршень
      z = { re: 0, im: 0 };
      state.plunger = true;
      state.xLine = +el.slLine.value;
  }
  state.zRe = z.re;
  state.zIm = z.im;
  refl();
  el.slLine.classList.toggle("hidden", !state.plunger);
  el.lbLine.classList.toggle("hidden", !state.plunger);
}

// --- показания -------------------------------------------------------------

function fmt(v, dec) { return v.toFixed(dec); }

function currentText() {
  if (!state.genOn || !state.microOn) return "0.00";
  const r = RANGES[state.range];
  // реальный детекторный диод, а не квадратичный закон
  const cur = I0 * (Math.exp(amplitude(state.xProbe) / UT) - 1);
  if (cur > r.iMax) return "####";
  if (cur < r.iMin) return fmt(0, r.fmt);
  let n = Math.trunc(cur * r.nMult);
  const d = n % 10;
  n = Math.trunc(n / 10);
  if (d >= 5) n++;
  return fmt(n / r.nDiv, r.fmt);
}

function drawGraph() {
  ctx.fillStyle = state.genOn ? "#04231f" : "#101816";
  ctx.fillRect(0, 0, GRAPH_W, GRAPH_H);
  if (!state.genOn) return;

  const scale = GRAPH_H / 2 / press();
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
  const ax = headLeft() + HEAD_W;
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
  setField(el.lbFreq, fmt(state.freq, 2));
  setField(el.lbPower, "-" + fmt(state.power, 1));
  setField(el.lbCoord, fmt(state.xProbe / 10, 1));
  el.lbCurrent.textContent = currentText();
  el.lbLine.textContent = fmt(state.xLine / 10, 1);

  el.lbFreq.classList.toggle("off", !state.genOn);
  el.lbPower.classList.toggle("off", !state.genOn);
  el.lbCurrent.classList.toggle("off", !state.microOn);
  el.btGen.setAttribute("aria-pressed", String(state.genOn));
  el.btMicro.setAttribute("aria-pressed", String(state.microOn));

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
  const commit = function () {
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

const inRange = (lo, hi) => (s) => {
  const v = parseFloat(s);
  return Number.isFinite(v) && v >= lo && v <= hi ? v : null;
};

bindField(el.lbFreq, inRange(5, 15), (v) => {
  state.freq = v; el.slFreq.value = Math.round(v * 100);
});
bindField(el.lbPower, (s) => {
  const v = parseFloat(s);
  if (!Number.isFinite(v)) return null;
  const a = Math.abs(v);
  return a >= 20 && a <= 60 ? a : null;
}, (v) => { state.power = v; el.slPower.value = Math.round(v * 10); });
bindField(el.lbCoord, inRange(0, 39.8), (v) => { state.xProbe = Math.round(v * 10); });

// --- органы управления -----------------------------------------------------

RANGES.forEach((r, i) => el.chRange.add(new Option(r.label, String(i))));
LOADS.forEach((s, i) => el.chLoad.add(new Option(s, String(i))));

el.slFreq.addEventListener("input", (e) => { state.freq = +e.target.value / 100; render(); });
el.slPower.addEventListener("input", (e) => { state.power = +e.target.value / 10; render(); });
el.slLine.addEventListener("input", (e) => { state.xLine = +e.target.value; render(); });
el.chRange.addEventListener("change", (e) => { state.range = +e.target.value; render(); });
el.chLoad.addEventListener("change", (e) => { state.load = +e.target.value; applyLoad(); render(); });
el.btGen.addEventListener("click", () => { state.genOn = !state.genOn; render(); });
el.btMicro.addEventListener("click", () => { state.microOn = !state.microOn; render(); });

function moveProbe(d) {
  state.xProbe = Math.max(0, Math.min(398, state.xProbe + d));
  render();
}
el.btLeft.addEventListener("click", () => moveProbe(-1));
el.btRight.addEventListener("click", () => moveProbe(1));

function probeFromEvent(ev) {
  const r = el.stand.getBoundingClientRect();
  const scale = r.width / 700;
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

el.patch.setAttribute("x", PATCH.x); el.patch.setAttribute("y", PATCH.y);
el.patch.setAttribute("width", PATCH.w); el.patch.setAttribute("height", PATCH.h);

function fit() {
  const box = el.stand.parentElement;
  const s = Math.min(1, box.clientWidth / 700);
  el.stand.style.transform = "scale(" + s + ")";
  box.style.height = Math.ceil(375 * s) + "px";
}
window.addEventListener("resize", fit);

applyLoad();
fit();
render();

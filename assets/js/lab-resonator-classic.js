/* Классическая модель работы «Исследование вынуждённых колебаний в объёмном резонаторе».
   Перенесена без изменений из автономной страницы. */
"use strict";

// --- константы, восстановленные из GraphRez -------------------------------
const C_MM_GHZ = 299.792458;   // скорость света, мм·ГГц
const A_WG = 23, B_WG = 10, L_RES = 40;   // размеры резонатора, мм
const NMAX = 15;                           // число учитываемых мод
const Z_PROBE = 25.464790894703256;        // положение зонда, мм
const GRAPH_W = 400, GRAPH_H = 100;

const RANGES = [
  { label: " 10 мА",   iMax: 9990,   iMin: 10,     nMult: 1,      nDiv: 100, fmt: 2 },
  { label: "1000 мкА", iMax: 999,    iMin: 1,      nMult: 10,     nDiv: 1,   fmt: 0 },
  { label: "100 мкА",  iMax: 99.9,   iMin: 0.1,    nMult: 100,    nDiv: 10,  fmt: 1 },
  { label: " 10 мкА",  iMax: 9.99,   iMin: 0.01,   nMult: 1000,   nDiv: 100, fmt: 2 },
  { label: "1000 нА",  iMax: 0.999,  iMin: 0.001,  nMult: 10000,  nDiv: 1,   fmt: 0 },
  { label: " 100 нА",  iMax: 0.0999, iMin: 0.0001, nMult: 100000, nDiv: 10,  fmt: 1 },
];

// добротность разыгрывается: SelectQ(a,b) = a + (b−a)·random
const Q_LEVELS = [
  { label: "высокая", a: 10000, b: 6000 },
  { label: "средняя", a: 5000,  b: 1000 },
  { label: " низкая", a: 200,   b: 800  },
];
const AMPL = [" 1:1  ", " 1:10 ", "1:100 ", "1:1000"];

const state = {
  freq: 7.000, power: 40.0,
  genOn: false, microOn: false,
  range: 0, qLevel: 0, ampl: 0,
  tanDel: 1 / 8000, zoom: 1,
};

const cESolen = new Array(NMAX).fill(null).map(() => ({ re: 0, im: 0 }));
const ePoten = new Float64Array(NMAX);

const $ = (id) => document.getElementById(id);
const el = {
  stand: $("stand"), lbFreq: $("lbFreq"), lbPower: $("lbPower"), lbCurrent: $("lbCurrent"),
  slFreq: $("slFreq"), slPower: $("slPower"), btGen: $("btGenPower"), btMicro: $("btMicroPower"),
  chRange: $("choiceRange"), chQ: $("choiceQ"), chAmpl: $("choiceAmpl"), graph: $("graph"),
};
const ctx = el.graph.getContext("2d");

// --- физика (воспроизводит GraphRez.EigenFunc / Ey) ------------------------

function omega() { return 2 * Math.PI * state.freq; }

/** Модальные амплитуды: вихревая часть C_n и потенциальная P_n. */
function eigenFunc() {
  const td = state.tanDel;
  const w = omega(), w2 = w * w;
  const cc = Math.pow(C_MM_GHZ / Math.sqrt(1 + td * td), 2);
  const ct = Math.cos(td / 2), st = Math.sin(td / 2);
  const rotRe = ct * ct - st * st, rotIm = 2 * ct * st;   // e^(j·tgδ)

  for (let n = 1; n < NMAX; n++) {
    const kz = n * Math.PI / L_RES, kz2 = kz * kz;
    let c2re = 0, c2im = 0, accM = 0;

    for (let m = 1; m < NMAX; m++) {
      const kx = m * Math.PI / A_WG, kx2 = kx * kx;
      let c3re = 0, c3im = 0, accP = 0;

      for (let p = 0; p < NMAX; p++) {
        const ky = p * Math.PI / B_WG, ky2 = ky * ky;
        const k2 = kx2 + ky2 + kz2;
        let neu = 1.0;                       // множитель Неймана
        let wgt = Math.sin(2 * p) / p / 2;
        if (p === 0) { wgt = 1.0; neu = 0.707106781186548; }
        else { accP += wgt * (ky2 / k2); }

        const wRes2 = k2 * cc;               // квадрат собственной частоты
        let re = w2 - rotRe * wRes2;
        let im = -rotIm * wRes2;
        const mag2 = re * re + im * im;      // 1/(ω² − e^(j·tgδ)·ω²_res)
        re = re / mag2;
        im = -im / mag2;

        let t = ky * kz + neu * kx * Math.sqrt(k2);
        t = t * t * wgt / k2 / (kx2 + ky2);
        c3re += re * t;
        c3im += im * t;
      }

      const sm = Math.sin(m) * Math.sin(m);  // весовой коэффициент возбуждения
      c2re += c3re * sm;
      c2im += c3im * sm;
      accM += accP * sm;
    }

    const sn = Math.sin(n);
    cESolen[n].re = c2re * sn;
    cESolen[n].im = c2im * sn;
    ePoten[n] = accM * sn;
  }
}

/** Модуль поля в точке z (мм от торца резонатора). */
function Ey(z) {
  const w = omega();
  const kz = z * Math.PI / L_RES;
  let re = 0, im = 0, pot = 0;
  for (let n = 1; n < NMAX; n++) {
    const s = Math.sin(n * kz);
    re += cESolen[n].re * s;
    im += cESolen[n].im * s;
    pot += ePoten[n] * s;
  }
  re = re * w + pot / w;
  im = im * w;
  return Math.hypot(re, im);
}

function applyZoom() {
  state.zoom = state.ampl === 0 ? 15625 * state.tanDel : Math.pow(10, state.ampl);
}

function applyQ() {
  const q = Q_LEVELS[state.qLevel];
  state.tanDel = 1 / (q.a + (q.b - q.a) * Math.random());
  applyZoom();
}

// --- показания -------------------------------------------------------------

const fmt = (v, dec) => v.toFixed(dec);

function currentText() {
  if (!state.genOn || !state.microOn) return "0.00";
  const r = RANGES[state.range];
  let cur = Ey(Z_PROBE);
  cur = cur * cur;                                   // квадратичный детектор
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

  ctx.strokeStyle = "#3ce08a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 200; i++) {
    const x = i * 2;
    const y = GRAPH_H - state.zoom * Ey(x / 10);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();

  // отметка зонда
  const xp = Z_PROBE * 10;
  ctx.strokeStyle = "#f0c419";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(xp, 0); ctx.lineTo(xp, GRAPH_H);
  ctx.stroke();
}

// --- сборка кадра ----------------------------------------------------------

function render() {
  eigenFunc();

  setField(el.lbFreq, fmt(state.freq, 3));
  setField(el.lbPower, "-" + fmt(state.power, 1));
  el.lbCurrent.textContent = currentText();

  el.lbFreq.classList.toggle("off", !state.genOn);
  el.lbPower.classList.toggle("off", !state.genOn);
  el.lbCurrent.classList.toggle("off", !state.microOn);
  el.btGen.setAttribute("aria-pressed", String(state.genOn));
  el.btMicro.setAttribute("aria-pressed", String(state.microOn));

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

bindField(el.lbFreq, (s) => {
  const v = parseFloat(s);
  return Number.isFinite(v) && v >= 7 && v <= 40 ? v : null;
}, (v) => { state.freq = v; el.slFreq.value = Math.round(v * 1000); });

bindField(el.lbPower, (s) => {
  const v = parseFloat(s);
  if (!Number.isFinite(v)) return null;
  const abs = Math.abs(v);
  return abs <= 40 ? abs : null;
}, (v) => { state.power = v; el.slPower.value = Math.round(v * 10); });

// --- органы управления -----------------------------------------------------

RANGES.forEach((r, i) => el.chRange.add(new Option(r.label, String(i))));
Q_LEVELS.forEach((q, i) => el.chQ.add(new Option(q.label, String(i))));
AMPL.forEach((s, i) => el.chAmpl.add(new Option(s, String(i))));

el.slFreq.addEventListener("input", (e) => { state.freq = +e.target.value / 1000; render(); });
el.slPower.addEventListener("input", (e) => { state.power = +e.target.value / 10; render(); });
el.chRange.addEventListener("change", (e) => { state.range = +e.target.value; render(); });
el.chQ.addEventListener("change", (e) => { state.qLevel = +e.target.value; applyQ(); render(); });
el.chAmpl.addEventListener("change", (e) => { state.ampl = +e.target.value; applyZoom(); render(); });
el.btGen.addEventListener("click", () => { state.genOn = !state.genOn; render(); });
el.btMicro.addEventListener("click", () => { state.microOn = !state.microOn; render(); });

// стенд — растр фиксированного размера, вписываем по ширине
function fit() {
  const box = el.stand.parentElement;
  const s = Math.min(1, box.clientWidth / 554);
  el.stand.style.transform = "scale(" + s + ")";
  box.style.height = Math.ceil(348 * s) + "px";
}
window.addEventListener("resize", fit);

applyQ();
fit();
render();

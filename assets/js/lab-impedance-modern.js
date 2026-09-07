/* Современная модель измерения полных сопротивлений.

   Физика та же, что в классической версии (функции Beta / Refl / Amplitude
   из Graph): Γ = (Z_н − Z₀)/(Z_н + Z₀), картина стоячей волны складывается
   из падающей и отражённой. Но в апплете Z₀ было зашито на 50 Ом, а нагрузка
   выбиралась из набора «Активная / Малый, Средний, Большой КСВ / КЗ поршень»
   с разыгранными параметрами. Здесь и линия, и нагрузка задаются прямо —
   можно решать обратную задачу в обе стороны.

   Цвета берутся из CSS-переменных сайта, поэтому график перекрашивается
   вместе с контрастными схемами ГОСТ. */
(function () {
  "use strict";

  var canvas = document.getElementById("imPlot");
  if (!canvas) return;

  var C = 299.792458;   // скорость света, мм·ГГц
  var LINE_MM = 120;    // длина измерительной линии
  var X_REF = 120;      // плоскость нагрузки — правый конец линии

  var state = { z0: 50, freq: 3, r: 100, x: 0, probe: 0 };

  var el = {};
  ["imZ0", "imFreq", "imR", "imX", "imProbe", "imZ0Val", "imFreqVal", "imRVal",
   "imXVal", "imProbeVal", "imGamma", "imSwr", "imDmin", "imAmp", "imHint"]
    .forEach(function (id) { el[id] = document.getElementById(id); });

  var ctx = canvas.getContext("2d");
  var PAD = { l: 58, r: 16, t: 18, b: 42 };

  function num(v, d) {
    return v.toLocaleString("ru", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function cssVar(n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  }

  // --- физика ---------------------------------------------------------------

  function beta() { return 2 * Math.PI * state.freq / C; }

  /** Γ = (Z_н − Z₀)/(Z_н + Z₀) */
  function refl() {
    var nr = state.r - state.z0, ni = state.x;
    var dr = state.r + state.z0, di = state.x;
    var den = dr * dr + di * di;
    if (den === 0) return { mod: 1, phase: Math.PI };
    var gr = (nr * dr + ni * di) / den;
    var gi = (ni * dr - nr * di) / den;
    return { mod: Math.hypot(gr, gi), phase: Math.atan2(gi, gr) };
  }

  /** |U(x)| при отсчёте x от начала линии, нагрузка в X_REF. */
  function amplitude(x, g) {
    var t = 2 * g.mod * Math.cos(2 * beta() * (x - X_REF) + g.phase);
    return Math.sqrt(1 + g.mod * g.mod + t);
  }

  /** Расстояние от нагрузки до ближайшего минимума. */
  function dMin(g) {
    var lam = 2 * Math.PI / beta();
    var d = (Math.PI - g.phase) / (2 * beta());
    while (d < 0) d += lam / 2;
    while (d >= lam / 2) d -= lam / 2;
    return d;
  }

  // --- отрисовка ------------------------------------------------------------

  function resize() {
    var cssW = canvas.parentElement.clientWidth - 24;
    var cssH = Math.max(260, Math.min(380, cssW * 0.42));
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas._w = cssW; canvas._h = cssH;
  }

  function draw() {
    var w = canvas._w, h = canvas._h;
    var g = refl();
    var x0 = PAD.l, x1 = w - PAD.r, y0 = PAD.t, y1 = h - PAD.b;
    var maxA = 1 + g.mod;

    var toX = function (mm) { return x0 + (mm / LINE_MM) * (x1 - x0); };
    var toY = function (a) { return y1 - (a / (maxA * 1.08)) * (y1 - y0); };

    ctx.clearRect(0, 0, w, h);
    ctx.font = "11px system-ui, sans-serif";

    // сетка через λ/2
    var lam = 2 * Math.PI / beta();
    ctx.strokeStyle = cssVar("--grid");
    ctx.textAlign = "center";
    for (var k = 1; k * lam / 2 < LINE_MM; k++) {
      var xg = Math.round(toX(LINE_MM - k * lam / 2)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(xg, y0); ctx.lineTo(xg, y1); ctx.stroke();
    }

    // огибающие: максимум 1+|Γ| и минимум 1−|Γ|
    ctx.strokeStyle = cssVar("--envelope");
    ctx.setLineDash([4, 3]);
    [1 + g.mod, Math.abs(1 - g.mod)].forEach(function (lev) {
      ctx.beginPath();
      ctx.moveTo(x0, toY(lev)); ctx.lineTo(x1, toY(lev)); ctx.stroke();
    });
    ctx.setLineDash([]);

    // оси
    ctx.strokeStyle = cssVar("--axis");
    ctx.beginPath();
    ctx.moveTo(x0, y1 + 0.5); ctx.lineTo(x1, y1 + 0.5);
    ctx.moveTo(x0 + 0.5, y0); ctx.lineTo(x0 + 0.5, y1);
    ctx.stroke();

    ctx.fillStyle = cssVar("--muted");
    ctx.textAlign = "right";
    for (var j = 0; j <= 4; j++) {
      ctx.fillText(num(maxA * 1.08 * j / 4, 2), x0 - 7, toY(maxA * 1.08 * j / 4) + 4);
    }
    ctx.textAlign = "left";
    ctx.fillText("0", x0 + 2, y1 + 14);
    ctx.textAlign = "right";
    ctx.fillText("нагрузка", x1 - 2, y1 + 14);
    ctx.textAlign = "center";
    ctx.fillText("координата вдоль линии z, мм", (x0 + x1) / 2, h - 8);
    ctx.save();
    ctx.translate(15, (y0 + y1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = cssVar("--ink");
    ctx.fillText("|U|, отн. ед.", 0, 0);
    ctx.restore();

    // кривая
    ctx.strokeStyle = cssVar("--wave");
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var px = 0; px <= x1 - x0; px++) {
      var mm = (px / (x1 - x0)) * LINE_MM;
      var y = toY(amplitude(mm, g));
      if (px === 0) ctx.moveTo(x0 + px, y); else ctx.lineTo(x0 + px, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    // зонд
    var xp = toX(state.probe), ap = amplitude(state.probe, g);
    ctx.strokeStyle = cssVar("--probe");
    ctx.beginPath();
    ctx.moveTo(Math.round(xp) + 0.5, y0); ctx.lineTo(Math.round(xp) + 0.5, y1);
    ctx.stroke();
    ctx.fillStyle = cssVar("--probe");
    ctx.beginPath();
    ctx.arc(xp, toY(ap), 4, 0, 2 * Math.PI);
    ctx.fill();

    // показания
    el.imGamma.textContent = num(g.mod, 3);
    el.imSwr.textContent = g.mod >= 0.999 ? "∞" : num((1 + g.mod) / (1 - g.mod), 2);
    // При согласовании стоячей волны нет, и минимум не определён.
    el.imDmin.textContent = g.mod < 1e-6 ? "—" : num(dMin(g), 1);
    el.imAmp.textContent = num(ap, 3);
    el.imHint.textContent = "Длина волны в линии " + num(lam, 1)
      + " мм, минимумы повторяются через " + num(lam / 2, 1) + " мм. "
      + "Пунктиром показаны уровни 1+|Γ| и 1−|Γ|: их отношение и есть КСВ. "
      + "По КСВ и смещению минимума от нагрузки восстанавливается Z_н — "
      + "это и есть обратная задача работы.";
  }

  function sync() {
    state.z0 = Number(el.imZ0.value);
    state.freq = Number(el.imFreq.value);
    state.r = Number(el.imR.value);
    state.x = Number(el.imX.value);
    state.probe = Number(el.imProbe.value);
    el.imZ0Val.textContent = String(state.z0);
    el.imFreqVal.textContent = num(state.freq, 2);
    el.imRVal.textContent = String(state.r);
    el.imXVal.textContent = String(state.x);
    el.imProbeVal.textContent = num(state.probe, 1);
    draw();
  }

  ["imZ0", "imFreq", "imR", "imX", "imProbe"].forEach(function (id) {
    el[id].addEventListener("input", sync);
  });
  window.addEventListener("resize", function () { resize(); draw(); });

  resize();
  sync();
})();

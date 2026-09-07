/* Современная модель объёмного резонатора.

   Классическая версия считала поле суммой по модам с комплексным знаменателем
   ω² − e^(j·tgδ)·ω²_рез, а размеры 23 × 10 × 40 мм и добротность были зашиты:
   добротность вдобавок разыгрывалась случайно и студенту не показывалась.

   Здесь та же по смыслу картина, но развёрнутая в резонансную кривую: сумма
   лоренцевых откликов всех мод, у которых собственная частота попадает в полосу
   обзора. Размеры и добротность открыты, поэтому видно, как перестраивается
   спектр собственных колебаний.

   Собственные частоты прямоугольного резонатора:
       f_mnp = (c/2)·√((m/a)² + (n/b)² + (p/l)²)
   Отклик вблизи резонанса — лоренциан с нагруженной добротностью Q:
       A(f) = 1 / √(1 + (2Q·(f − f₀)/f₀)²) */
(function () {
  "use strict";

  var canvas = document.getElementById("rzPlot");
  if (!canvas) return;

  var C = 299.792458;   // скорость света, мм·ГГц
  var NMAX = 4;         // индексы мод, которые перебираем

  var state = { a: 23, b: 10, l: 40, q: 2000, freq: 10, span: 2 };

  var el = {};
  ["rzA", "rzB", "rzL", "rzQ", "rzFreq", "rzSpan", "rzAVal", "rzBVal", "rzLVal",
   "rzQVal", "rzFreqVal", "rzSpanVal", "rzF0", "rzMode", "rzBw", "rzResp", "rzHint"]
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

  /** Собственные частоты в полосе обзора. Для H- и E-колебаний в прямоугольном
      резонаторе хотя бы два индекса должны быть ненулевыми. */
  function modes(fMin, fMax) {
    var out = [];
    for (var m = 0; m <= NMAX; m++)
      for (var n = 0; n <= NMAX; n++)
        for (var p = 0; p <= NMAX; p++) {
          var nz = (m > 0 ? 1 : 0) + (n > 0 ? 1 : 0) + (p > 0 ? 1 : 0);
          if (nz < 2) continue;
          var f = C / 2 * Math.sqrt(
            Math.pow(m / state.a, 2) + Math.pow(n / state.b, 2) + Math.pow(p / state.l, 2));
          if (f >= fMin && f <= fMax) out.push({ f: f, m: m, n: n, p: p });
        }
    out.sort(function (x, y) { return x.f - y.f; });
    return out;
  }

  /** Возбуждение падает с ростом индексов: зонд связан с низшими модами сильнее. */
  function weight(md) {
    return 1 / (1 + md.m * md.m + md.n * md.n + 0.25 * md.p * md.p);
  }

  function response(f, ms) {
    var sum = 0;
    for (var i = 0; i < ms.length; i++) {
      var d = 2 * state.q * (f - ms[i].f) / ms[i].f;
      sum += weight(ms[i]) / Math.sqrt(1 + d * d);
    }
    return sum;
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
    var fMin = Math.max(0.1, state.freq - state.span / 2);
    var fMax = state.freq + state.span / 2;
    var ms = modes(fMin, fMax);

    var x0 = PAD.l, x1 = w - PAD.r, y0 = PAD.t, y1 = h - PAD.b;
    var N = Math.max(200, Math.round(x1 - x0));

    var vals = [], maxA = 1e-9;
    for (var i = 0; i <= N; i++) {
      var f = fMin + (fMax - fMin) * i / N;
      var a = response(f, ms);
      vals.push(a);
      if (a > maxA) maxA = a;
    }

    var toX = function (f) { return x0 + (f - fMin) / (fMax - fMin) * (x1 - x0); };
    var toY = function (a) { return y1 - (a / (maxA * 1.1)) * (y1 - y0); };

    ctx.clearRect(0, 0, w, h);
    ctx.font = "11px system-ui, sans-serif";

    // отметки собственных частот
    ctx.strokeStyle = cssVar("--grid");
    ctx.textAlign = "center";
    for (var k = 0; k < ms.length; k++) {
      var xm = Math.round(toX(ms[k].f)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(xm, y0); ctx.lineTo(xm, y1); ctx.stroke();
      if (ms.length <= 12) {
        ctx.fillStyle = cssVar("--muted");
        ctx.fillText(ms[k].m + "" + ms[k].n + "" + ms[k].p, xm, y0 - 4);
      }
    }

    // оси
    ctx.strokeStyle = cssVar("--axis");
    ctx.beginPath();
    ctx.moveTo(x0, y1 + 0.5); ctx.lineTo(x1, y1 + 0.5);
    ctx.moveTo(x0 + 0.5, y0); ctx.lineTo(x0 + 0.5, y1);
    ctx.stroke();

    ctx.fillStyle = cssVar("--muted");
    ctx.textAlign = "right";
    for (var j = 0; j <= 4; j++) {
      ctx.fillText(num(maxA * 1.1 * j / 4, 2), x0 - 7, toY(maxA * 1.1 * j / 4) + 4);
    }
    ctx.textAlign = "left";
    ctx.fillText(num(fMin, 3), x0 + 2, y1 + 14);
    ctx.textAlign = "right";
    ctx.fillText(num(fMax, 3) + " ГГц", x1 - 2, y1 + 14);
    ctx.textAlign = "center";
    ctx.fillText("частота, ГГц", (x0 + x1) / 2, h - 8);
    ctx.save();
    ctx.translate(15, (y0 + y1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = cssVar("--ink");
    ctx.fillText("отклик, отн. ед.", 0, 0);
    ctx.restore();

    // кривая
    ctx.strokeStyle = cssVar("--wave");
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var q = 0; q <= N; q++) {
      var xx = x0 + (x1 - x0) * q / N, yy = toY(vals[q]);
      if (q === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    // частота генератора
    var xg = toX(state.freq), ag = response(state.freq, ms);
    ctx.strokeStyle = cssVar("--probe");
    ctx.beginPath();
    ctx.moveTo(Math.round(xg) + 0.5, y0); ctx.lineTo(Math.round(xg) + 0.5, y1);
    ctx.stroke();
    ctx.fillStyle = cssVar("--probe");
    ctx.beginPath();
    ctx.arc(xg, toY(ag), 4, 0, 2 * Math.PI);
    ctx.fill();

    // показания
    if (ms.length) {
      var near = ms[0], best = Math.abs(ms[0].f - state.freq);
      for (var t = 1; t < ms.length; t++) {
        var d = Math.abs(ms[t].f - state.freq);
        if (d < best) { best = d; near = ms[t]; }
      }
      el.rzF0.textContent = num(near.f, 3);
      el.rzMode.textContent = "H/E " + near.m + near.n + near.p;
      el.rzBw.textContent = num(near.f / state.q * 1000, 1);
      el.rzHint.textContent = "В полосе обзора " + ms.length
        + (ms.length === 1 ? " собственная частота. " : " собственных частот. ")
        + "Вертикальные линии отмечают их положение, подписи — индексы m n p. "
        + "Сужайте полосу обзора, чтобы разделить близкие резонансы.";
    } else {
      el.rzF0.textContent = "—";
      el.rzMode.textContent = "—";
      el.rzBw.textContent = "—";
      el.rzHint.textContent = "В полосе обзора нет собственных частот: "
        + "расширьте полосу или сдвиньте частоту генератора.";
    }
    el.rzResp.textContent = num(ag, 3);
  }

  function sync() {
    state.a = Number(el.rzA.value);
    state.b = Number(el.rzB.value);
    state.l = Number(el.rzL.value);
    state.q = Number(el.rzQ.value);
    state.freq = Number(el.rzFreq.value);
    state.span = Number(el.rzSpan.value);
    el.rzAVal.textContent = num(state.a, 1);
    el.rzBVal.textContent = num(state.b, 1);
    el.rzLVal.textContent = num(state.l, 1);
    el.rzQVal.textContent = String(state.q);
    el.rzFreqVal.textContent = num(state.freq, 3);
    el.rzSpanVal.textContent = num(state.span, 2);
    draw();
  }

  ["rzA", "rzB", "rzL", "rzQ", "rzFreq", "rzSpan"].forEach(function (id) {
    el[id].addEventListener("input", sync);
  });
  window.addEventListener("resize", function () { resize(); draw(); });

  resize();
  sync();
})();

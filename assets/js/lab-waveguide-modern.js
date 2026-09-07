/* Современная модель прямоугольного волновода.

   Физика та же, что в классической версии (функции Beta / Alpha / Refl /
   Amplitude из GraphWG), но размеры сечения открыты: в апплете они были
   зашиты на a = 23 мм, b = 10 мм. Отсюда критическая частота, длина волны
   в волноводе и КСВ пересчитываются на лету.

   Цвета берутся из CSS-переменных сайта, поэтому график перекрашивается
   вместе с контрастными схемами ГОСТ. */
(function () {
  "use strict";

  var canvas = document.getElementById("wgPlot");
  if (!canvas) return;

  var C = 299.792458;          // скорость света, мм·ГГц
  var MU = 1.2566370614359172; // магнитная постоянная в единицах оригинала
  var LINE_MM = 60;            // длина измерительной линии
  var X_REF = 60;              // опорная плоскость нагрузки, мм

  // Длина тракта — в миллиметрах, как и вся геометрия здесь. В классике она
  // хранилась в десятых долях миллиметра, и перенос формулы «как есть» дал бы
  // затухание в сотни раз меньше нужного.
  var state = { a: 23, b: 10, freq: 10, load: "short", probe: 0,
                sigma: 5.8e4, dTract: 300 };

  var el = {
    a: document.getElementById("wgA"), b: document.getElementById("wgB"),
    freq: document.getElementById("wgFreq"), load: document.getElementById("wgLoad"),
    probe: document.getElementById("wgProbe"),
    aVal: document.getElementById("wgAVal"), bVal: document.getElementById("wgBVal"),
    freqVal: document.getElementById("wgFreqVal"), probeVal: document.getElementById("wgProbeVal"),
    fcr: document.getElementById("wgFcr"), lambda: document.getElementById("wgLambda"),
    swr: document.getElementById("wgSwr"), amp: document.getElementById("wgAmp"),
    mode: document.getElementById("wgMode")
  };

  var ctx = canvas.getContext("2d");
  var PAD = { l: 58, r: 16, t: 18, b: 42 };

  function num(v, d) {
    return v.toLocaleString("ru", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function cssVar(n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  }

  // --- физика ---------------------------------------------------------------

  function kap2() { return Math.pow(Math.PI / state.a, 2); }
  function omega() { return 2 * Math.PI * state.freq; }
  function fCrit() { return C / (2 * state.a); }

  /** β при распространении, коэффициент затухания при запредельном режиме. */
  function beta() {
    var k = omega() / C, k2 = k * k, kp = kap2();
    return k2 > kp ? Math.sqrt(k2 - kp) : Math.sqrt(kp - k2);
  }
  function travelling() { var k = omega() / C; return k * k > kap2(); }

  /* Затухание в стенках для волны H₁₀.

     Здесь сознательное расхождение с апплетом. В нём стояло
         α ~ κ²·((f/f_кр)² + 2b/a) / (√(2ωμσ)·β),
     то есть с ростом узкой стенки затухание РОСЛО. Пока b было зашито
     на 10 мм, это никак не проявлялось, но здесь b открыто, и неверная
     зависимость учила бы обратному.

     Классическая формула для H₁₀ обратно пропорциональна b:
         α = R_s / (b·√(1 − (f_кр/f)²)) · (1 + (2b/a)·(f_кр/f)²)
     Более высокий волновод теряет меньше. Классическая версия работы
     сохранена как была — расхождение только здесь. */
  function alpha() {
    var w = omega();
    var ratio = Math.pow(state.freq / fCrit(), 2);   // (f/f_кр)²
    if (ratio <= 1) return 0;
    var Rs = 0.70710678 * Math.sqrt(w * MU / state.sigma);
    return Rs / (state.b * Math.sqrt(1 - 1 / ratio))
             * (1 + (2 * state.b / state.a) / ratio) / 100;
  }

  /** Коэффициент отражения от нагрузки. */
  function reflection() {
    if (state.load === "match") return { mod: 0, phase: 0 };
    if (state.load === "short") return { mod: 1, phase: Math.PI };
    var wm = omega() * MU;
    var Zw = wm / beta();
    var Rs = 0.70710678 * Math.sqrt(wm / state.sigma);
    var nr = Rs - Zw, ni = Rs, dr = Rs + Zw, di = Rs;
    var den = dr * dr + di * di;
    var gr = (nr * dr + ni * di) / den;
    var gi = (ni * dr - nr * di) / den;
    return {
      mod: Math.hypot(gr, gi) / Math.exp(2 * alpha() * state.dTract),
      phase: Math.atan2(gi, gr) - 2 * beta() * state.dTract
    };
  }

  /** Амплитуда в точке x (мм от начала линии). */
  function amplitude(x, refl) {
    if (!travelling()) return Math.exp(-beta() * x * 10);
    var t = 2 * refl.mod * Math.cos(2 * beta() * (x - X_REF) + refl.phase);
    return Math.sqrt(1 + refl.mod * refl.mod + t);
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
    canvas._w = cssW;
    canvas._h = cssH;
  }

  function draw() {
    var w = canvas._w, h = canvas._h;
    var refl = reflection();
    var trav = travelling();

    var x0 = PAD.l, x1 = w - PAD.r, y0 = PAD.t, y1 = h - PAD.b;

    // максимум для масштаба
    var maxA = 0;
    for (var s = 0; s <= 200; s++) {
      var v = amplitude(s / 200 * LINE_MM, refl);
      if (v > maxA) maxA = v;
    }
    if (maxA <= 0) maxA = 1;

    var toX = function (mm) { return x0 + (mm / LINE_MM) * (x1 - x0); };
    var toY = function (a) { return y1 - (a / (maxA * 1.08)) * (y1 - y0); };

    ctx.clearRect(0, 0, w, h);
    ctx.font = "11px system-ui, sans-serif";

    // сетка по λ_в
    if (trav) {
      var lam = 2 * Math.PI / beta();
      ctx.strokeStyle = cssVar("--grid");
      ctx.lineWidth = 1;
      ctx.textAlign = "center";
      for (var k = 1; k * lam / 2 < LINE_MM; k++) {
        var xg = Math.round(toX(k * lam / 2)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(xg, y0); ctx.lineTo(xg, y1); ctx.stroke();
        ctx.fillStyle = cssVar("--muted");
        ctx.fillText(k % 2 ? "λ/2" : (k / 2) + "λ", xg, y1 + 28);
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
    for (var i = 0; i <= 4; i++) {
      var av = maxA * 1.08 * i / 4;
      ctx.fillText(num(av, 2), x0 - 7, toY(av) + 4);
    }
    ctx.textAlign = "center";
    ctx.fillText("координата вдоль линии z, мм", (x0 + x1) / 2, h - 8);
    ctx.textAlign = "left";
    ctx.fillText("0", x0 + 2, y1 + 14);
    ctx.textAlign = "right";
    ctx.fillText(LINE_MM + " мм", x1 - 2, y1 + 14);

    ctx.save();
    ctx.translate(15, (y0 + y1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillStyle = cssVar("--ink");
    ctx.fillText("|E|, отн. ед.", 0, 0);
    ctx.restore();

    // кривая
    ctx.strokeStyle = cssVar("--wave");
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var px = 0; px <= x1 - x0; px++) {
      var mm = (px / (x1 - x0)) * LINE_MM;
      var y = toY(amplitude(mm, refl));
      if (px === 0) ctx.moveTo(x0 + px, y); else ctx.lineTo(x0 + px, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    // зонд
    var xp = toX(state.probe), ap = amplitude(state.probe, refl);
    ctx.strokeStyle = cssVar("--probe");
    ctx.beginPath();
    ctx.moveTo(Math.round(xp) + 0.5, y0);
    ctx.lineTo(Math.round(xp) + 0.5, y1);
    ctx.stroke();
    ctx.fillStyle = cssVar("--probe");
    ctx.beginPath();
    ctx.arc(xp, toY(ap), 4, 0, 2 * Math.PI);
    ctx.fill();

    // показания
    el.fcr.textContent = num(fCrit(), 2);
    if (trav) {
      el.lambda.textContent = num(2 * Math.PI / beta(), 1);
      var swr = (1 + refl.mod) / (1 - refl.mod);
      el.swr.textContent = refl.mod >= 0.999 ? "∞" : num(swr, 2);
      el.mode.textContent = "Волна распространяется: частота выше критической. "
        + "Узлы стоячей волны отстоят друг от друга на половину длины волны в волноводе.";
    } else {
      el.lambda.textContent = "—";
      el.swr.textContent = "—";
      el.mode.textContent = "Запредельный режим: частота ниже критической ("
        + num(fCrit(), 2) + " ГГц). Волна не распространяется, поле спадает "
        + "по экспоненте — как в классической версии при 5 ГГц.";
    }
    el.amp.textContent = num(ap, 3);
  }

  function sync() {
    state.a = Number(el.a.value);
    state.b = Number(el.b.value);
    state.freq = Number(el.freq.value);
    state.load = el.load.value;
    state.probe = Number(el.probe.value);
    el.aVal.textContent = num(state.a, 1);
    el.bVal.textContent = num(state.b, 1);
    el.freqVal.textContent = num(state.freq, 2);
    el.probeVal.textContent = num(state.probe, 1);
    draw();
  }

  ["a", "b", "freq", "probe"].forEach(function (k) {
    el[k].addEventListener("input", sync);
  });
  el.load.addEventListener("change", sync);
  window.addEventListener("resize", function () { resize(); draw(); });

  resize();
  sync();
})();

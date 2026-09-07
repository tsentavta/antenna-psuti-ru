/* Классическая модель скин-эффекта — реконструкция апплета SkinEffect
   (codea.jar, 23.04.2012, исходные модули 2000–2001, I. N. Semenikhin).

   Что взято из самого класса: четыре металла с проводимостями 5,6·10^7,
   1,45·10^7, 8,6·10^6 и 8,0·10^6 См/м; частота 1000 Гц, зашитая константой;
   единственный регулятор — положение зонда; ширина пластины менялась
   перетаскиванием её края; подписи показывали ширину, координату и поле.
   Картина статическая: потока анимации в апплете не было.

   Палитра — из Equipment2.gif и DetectHead.gif соседних работ. */
(function () {
  "use strict";

  var canvas = document.getElementById("seClassic");
  if (!canvas) return;

  var MU0 = 4 * Math.PI * 1e-7;
  var FREQ = 1000;          // Гц — в оригинале не регулировалась
  var E0 = 100;             // мВ/м на поверхности

  var METALS = [
    { name: "Медь",   sigma: 5.6e7,  color: "#b87333" },
    { name: "Латунь", sigma: 1.45e7, color: "#c9a227" },
    { name: "Олово",  sigma: 8.6e6,  color: "#9aa5ad" },
    { name: "Сталь",  sigma: 8.0e6,  color: "#78838f" }
  ];

  var el = {
    metal: document.getElementById("seMetal"),
    plate: document.getElementById("sePlate"),
    probe: document.getElementById("seProbe"),
    plateVal: document.getElementById("sePlateVal"),
    probeVal: document.getElementById("seProbeVal"),
    field: document.getElementById("seField"),
    delta: document.getElementById("seDelta")
  };

  var state = { metal: 0, plate: 5, probe: 0 };

  var PAD = { l: 38, r: 12, t: 14, b: 30 };
  var ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height;

  function setupDpr() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function skinDepth(sigma) {
    return Math.sqrt(2 / (2 * Math.PI * FREQ * MU0 * sigma)) * 1000; // мм
  }

  function num(v, d) {
    return v.toLocaleString("ru", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // --- геометрия графика ---

  function plotBox() {
    return { x0: PAD.l, x1: W - PAD.r, y0: PAD.t, y1: H - PAD.b };
  }

  function zToX(z) {
    var b = plotBox();
    return b.x0 + (z / state.plate) * (b.x1 - b.x0);
  }

  function eToY(e) {
    var b = plotBox();
    var mid = (b.y0 + b.y1) / 2;
    return mid - e * ((b.y1 - b.y0) / 2 / (E0 * 1.15));
  }

  function draw() {
    var b = plotBox();
    var mat = METALS[state.metal];
    var delta = skinDepth(mat.sigma);
    var mid = (b.y0 + b.y1) / 2;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // тело пластины — прямоугольник от поверхности до правого края
    ctx.fillStyle = mat.color;
    ctx.globalAlpha = 0.16;
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.globalAlpha = 1;

    // узлы, кратные глубине проникновения
    ctx.strokeStyle = "#c0c0c0";
    ctx.lineWidth = 1;
    ctx.font = "10px Verdana, sans-serif";
    ctx.textAlign = "center";
    for (var k = 1; k * delta < state.plate; k++) {
      var xk = Math.round(zToX(k * delta)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(xk, b.y0);
      ctx.lineTo(xk, b.y1);
      ctx.stroke();
      ctx.fillStyle = "#505050";
      ctx.fillText(k + "Δ", xk, b.y1 + 22);
    }

    // оси
    ctx.strokeStyle = "#202020";
    ctx.beginPath();
    ctx.moveTo(b.x0, Math.round(mid) + 0.5);
    ctx.lineTo(b.x1, Math.round(mid) + 0.5);
    ctx.moveTo(Math.round(b.x0) + 0.5, b.y0);
    ctx.lineTo(Math.round(b.x0) + 0.5, b.y1);
    ctx.stroke();

    ctx.fillStyle = "#202020";
    ctx.textAlign = "right";
    for (var i = 0; i < 3; i++) {
      var v = [100, 0, -100][i];
      ctx.fillText(String(v), b.x0 - 5, eToY(v) + 3);
    }

    // огибающая ±E0·exp(−z/Δ)
    ctx.strokeStyle = "#c02020";
    ctx.setLineDash([4, 3]);
    for (var s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      for (var px = 0; px <= b.x1 - b.x0; px++) {
        var z = (px / (b.x1 - b.x0)) * state.plate;
        var y = eToY(s * E0 * Math.exp(-z / delta));
        if (px === 0) ctx.moveTo(b.x0 + px, y); else ctx.lineTo(b.x0 + px, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // мгновенное распределение поля
    ctx.strokeStyle = "#187878";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var p = 0; p <= b.x1 - b.x0; p++) {
      var zz = (p / (b.x1 - b.x0)) * state.plate;
      var e = E0 * Math.exp(-zz / delta) * Math.cos(zz / delta);
      var yy = eToY(e);
      if (p === 0) ctx.moveTo(b.x0 + p, yy); else ctx.lineTo(b.x0 + p, yy);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    // зонд
    var zProbe = state.probe * state.plate;
    var xp = zToX(zProbe);
    var eProbe = E0 * Math.exp(-zProbe / delta) * Math.cos(zProbe / delta);
    ctx.strokeStyle = "#008000";
    ctx.beginPath();
    ctx.moveTo(Math.round(xp) + 0.5, b.y0);
    ctx.lineTo(Math.round(xp) + 0.5, b.y1);
    ctx.stroke();
    ctx.fillStyle = "#008000";
    ctx.beginPath();
    ctx.arc(xp, eToY(eProbe), 4, 0, 2 * Math.PI);
    ctx.fill();

    // правый край пластины — ручка перетаскивания
    ctx.fillStyle = "#187878";
    ctx.fillRect(b.x1 - 3, b.y0, 3, b.y1 - b.y0);
    ctx.fillStyle = "#505050";
    ctx.textAlign = "center";
    ctx.fillText("z, мм", (b.x0 + b.x1) / 2, H - 6);
    ctx.textAlign = "left";
    ctx.fillText("0", b.x0 + 2, b.y1 + 12);
    ctx.textAlign = "right";
    ctx.fillText(num(state.plate, 1), b.x1 - 2, b.y1 + 12);

    // показания
    el.plateVal.textContent = num(state.plate, 1) + " мм";
    el.probeVal.textContent = num(zProbe, 2) + " мм";
    el.field.textContent = num(eProbe, 1) + " мВ/м";
    el.delta.textContent = num(delta, 3) + " мм";
  }

  // --- перетаскивание правого края пластины ---

  var dragging = false;

  function widthFromX(clientX) {
    var r = canvas.getBoundingClientRect();
    var b = plotBox();
    var x = clientX - r.left;
    var frac = (x - b.x0) / (b.x1 - b.x0);
    return Math.min(20, Math.max(0.5, state.plate * frac));
  }

  canvas.addEventListener("pointerdown", function (ev) {
    var r = canvas.getBoundingClientRect();
    var b = plotBox();
    if (Math.abs((ev.clientX - r.left) - b.x1) <= 10) {
      dragging = true;
      canvas.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    }
  });

  canvas.addEventListener("pointermove", function (ev) {
    var r = canvas.getBoundingClientRect();
    var b = plotBox();
    canvas.style.cursor =
      Math.abs((ev.clientX - r.left) - b.x1) <= 10 ? "ew-resize" : "crosshair";
    if (!dragging) return;
    var w = widthFromX(ev.clientX);
    if (w > 0.5) {
      state.plate = Math.round(w * 10) / 10;
      el.plate.value = String(state.plate);
      draw();
    }
  });

  canvas.addEventListener("pointerup", function () { dragging = false; });
  canvas.addEventListener("pointercancel", function () { dragging = false; });

  // --- органы управления ---

  el.metal.addEventListener("change", function () {
    state.metal = Number(el.metal.value);
    draw();
  });
  el.plate.addEventListener("input", function () {
    state.plate = Number(el.plate.value);
    draw();
  });
  el.probe.addEventListener("input", function () {
    state.probe = Number(el.probe.value);
    draw();
  });

  setupDpr();
  draw();
})();

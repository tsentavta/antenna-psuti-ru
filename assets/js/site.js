/* Кафедра РЭС ПГУТИ — мобильное меню и режим для слабовидящих.
   Без библиотек: то, что не имеет зависимостей, не устаревает. */
(function () {
  "use strict";

  var root = document.documentElement;
  var STORE = "a11y";
  var DEFAULTS = { size: "normal", scheme: "normal", spacing: "normal", images: "on" };

  function load() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORE) || "{}"));
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(state) {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }

  function apply(state) {
    setAttr("data-size", state.size);
    setAttr("data-scheme", state.scheme);
    setAttr("data-spacing", state.spacing);
    setAttr("data-images", state.images === "off" ? "off" : null);

    document.querySelectorAll("[data-a11y]").forEach(function (btn) {
      var key = btn.getAttribute("data-a11y");
      btn.setAttribute("aria-pressed", String(state[key] === btn.getAttribute("data-value")));
    });
  }

  function setAttr(name, value) {
    if (value && value !== "normal" && value !== "on") root.setAttribute(name, value);
    else root.removeAttribute(name);
  }

  var state = load();
  apply(state);

  // --- панель доступности ---

  var bar = document.getElementById("a11y-bar");
  var opener = document.querySelector(".a11y-open");

  if (opener && bar) {
    opener.addEventListener("click", function () {
      var open = bar.hasAttribute("hidden");
      if (open) bar.removeAttribute("hidden"); else bar.setAttribute("hidden", "");
      opener.setAttribute("aria-expanded", String(open));
    });
    // если настройки уже выбраны, панель показываем сразу
    if (state.scheme !== "normal" || state.size !== "normal" ||
        state.spacing !== "normal" || state.images === "off") {
      bar.removeAttribute("hidden");
      opener.setAttribute("aria-expanded", "true");
    }
  }

  document.querySelectorAll("[data-a11y]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state[btn.getAttribute("data-a11y")] = btn.getAttribute("data-value");
      save(state);
      apply(state);
    });
  });

  var reset = document.querySelector("[data-a11y-reset]");
  if (reset) {
    reset.addEventListener("click", function () {
      state = Object.assign({}, DEFAULTS);
      save(state);
      apply(state);
      if (bar) bar.setAttribute("hidden", "");
      if (opener) opener.setAttribute("aria-expanded", "false");
    });
  }

  // --- меню на узких экранах ---

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  var header = document.querySelector(".site-header");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      // Тот же класс на шапке: поиск и кнопка доступности спрятаны в меню.
      if (header) header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // --- широкие таблицы старой CMS ---

  document.querySelectorAll(".page__body table").forEach(function (table) {
    if (table.parentElement.closest("table")) return;      // вложенные пропускаем
    var box = document.createElement("div");
    box.className = "table-scroll";
    table.parentNode.insertBefore(box, table);
    box.appendChild(table);
    if (box.scrollWidth > box.clientWidth) {
      // Прокручиваемая область должна быть достижима с клавиатуры.
      box.tabIndex = 0;
      box.setAttribute("role", "region");
      box.setAttribute("aria-label", "Таблица, прокручивается по горизонтали");
    }
  });
})();

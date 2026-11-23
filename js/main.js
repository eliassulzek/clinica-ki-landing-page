/* Campo de pontos do herói: reage ao toque ou ao mouse com ondas suaves. */
(function () {
  "use strict";

  var canvas = document.getElementById("campo");
  if (!canvas || !canvas.getContext) return;

  var hero = canvas.parentElement;
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var SPACING = 22;
  var BASE_RADIUS = 1.25;
  var SPEED = 230;      // px por segundo (ajustado ao tamanho da tela)
  var LIFE = 2.6;       // segundos
  var BAND = 46;        // espessura da onda em px
  var MAX_RIPPLES = 10;

  var INK = [18, 38, 58];
  var GOLD = [232, 169, 43];

  var width = 0;
  var height = 0;
  var dpr = 1;
  var dots = [];
  var ripples = [];
  var rafId = 0;
  var visible = true;
  var lastTime = 0;
  var lastMove = 0;
  var breathTimer = 0;

  function resize() {
    var rect = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    SPEED = Math.max(120, Math.min(230, width * 0.2));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    dots = [];
    var cols = Math.ceil(width / SPACING) + 1;
    var rows = Math.ceil(height / SPACING) + 1;
    var offsetX = (width - (cols - 1) * SPACING) / 2;
    var offsetY = (height - (rows - 1) * SPACING) / 2;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        dots.push({ x: offsetX + c * SPACING, y: offsetY + r * SPACING });
      }
    }
    draw(0);
  }

  function addRipple(x, y, strength) {
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x: x, y: y, age: 0, strength: strength });
    start();
  }

  function draw(dt) {
    ctx.clearRect(0, 0, width, height);

    for (var i = ripples.length - 1; i >= 0; i--) {
      ripples[i].age += dt;
      if (ripples[i].age > LIFE) ripples.splice(i, 1);
    }

    for (var d = 0; d < dots.length; d++) {
      var dot = dots[d];
      var energy = 0;

      for (var k = 0; k < ripples.length; k++) {
        var rp = ripples[k];
        var dx = dot.x - rp.x;
        var dy = dot.y - rp.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var front = rp.age * SPEED;
        var off = (dist - front) / BAND;
        var fade = 1 - rp.age / LIFE;
        energy += Math.exp(-off * off) * fade * fade * rp.strength;
      }

      if (energy > 1) energy = 1;

      var radius = BASE_RADIUS + energy * 2.6;
      var mix = energy;
      var rC = INK[0] + (GOLD[0] - INK[0]) * mix;
      var gC = INK[1] + (GOLD[1] - INK[1]) * mix;
      var bC = INK[2] + (GOLD[2] - INK[2]) * mix;
      var alpha = 0.26 + energy * 0.74;

      ctx.fillStyle = "rgba(" + Math.round(rC) + "," + Math.round(gC) + "," + Math.round(bC) + "," + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, radius, 0, 6.2832);
      ctx.fill();
    }
  }

  function frame(time) {
    rafId = 0;
    var dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
    lastTime = time;
    draw(dt);

    if (ripples.length && visible && !document.hidden) {
      rafId = requestAnimationFrame(frame);
    } else {
      lastTime = 0;
    }
  }

  function start() {
    if (!rafId && visible && !document.hidden) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function localPoint(event) {
    var rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onMove(event) {
    var now = performance.now();
    if (now - lastMove < 90) return;
    lastMove = now;
    var p = localPoint(event);
    addRipple(p.x, p.y, 0.55);
  }

  function onDown(event) {
    var p = localPoint(event);
    addRipple(p.x, p.y, 1);
  }

  function breathe() {
    if (!visible || document.hidden) return;
    if (width < 640) {
      addRipple(width * 0.5, height * 0.82, 0.9);
    } else {
      addRipple(width * 0.72, height * 0.5, 0.8);
    }
  }

  function setup() {
    if (reduceMotion.matches) {
      ripples = [];
      draw(0);
      return;
    }
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerdown", onDown, { passive: true });
    setTimeout(breathe, 500);
    breathTimer = setInterval(breathe, 7000);
  }

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) start();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }).observe(hero);
  }

  reduceMotion.addEventListener("change", function () {
    if (reduceMotion.matches) {
      clearInterval(breathTimer);
      ripples = [];
      draw(0);
    } else {
      setup();
    }
  });

  resize();
  setup();
})();

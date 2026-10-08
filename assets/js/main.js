/* Simon wird 40 – Einblendungen + detaillierte 3D-Parallax-Objekte (Three.js) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 720px)").matches;
  var isTouch = window.matchMedia("(pointer: coarse)").matches;

  /* ---------- Einblenden beim Scrollen ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Effekte, die auch ohne 3D funktionieren ---------- */
  // Platzhalter – werden vom 3D-Teil durch Glas-Konfetti ersetzt
  var fx = { burst: function () {}, rain: function () {} };

  /* ---------- Parallax für HTML-Elemente (data-parallax="Faktor") ---------- */
  (function domParallax() {
    var els = [].slice.call(document.querySelectorAll("[data-parallax]")).map(function (el) {
      return { el: el, f: parseFloat(el.dataset.parallax) || 0, sec: el.closest("section, header, footer") || el.parentElement };
    });
    if (!els.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      els.forEach(function (o) {
        var r = o.sec.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        // Hero: ab Seitenanfang; sonst relativ zur Bildschirmmitte
        var d = o.sec.tagName === "HEADER" ? -r.top : (r.top + r.height / 2 - vh / 2);
        o.el.style.translate = "0 " + (d * o.f).toFixed(1) + "px";
      });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  /* Route zeichnet sich beim Scrollen */
  (function routeDraw() {
    var fig = document.querySelector(".route__map");
    var path = document.getElementById("route-path");
    if (!fig || !path || !path.getTotalLength) return;
    var svg = path.ownerSVGElement;
    var len = path.getTotalLength();
    path.setAttribute("stroke-dasharray", len);
    path.setAttribute("stroke-dashoffset", len);
    var head = svg.querySelector(".route__head");
    var kmEl = document.querySelector(".route__km");
    var totalKm = parseFloat(kmEl && kmEl.dataset.km) || 0;
    var ns = "http://www.w3.org/2000/svg";
    var stops = (svg.dataset.stops || "").split(",").filter(Boolean).map(function (s) {
      var parts = s.split(":");
      var at = parseFloat(parts[0]);
      var pt = path.getPointAtLength(len * at);
      var g = document.createElementNS(ns, "g");
      g.setAttribute("class", "route__stop");
      g.setAttribute("transform", "translate(" + pt.x + " " + pt.y + ")");
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("r", 7);
      var t = document.createElementNS(ns, "text");
      t.setAttribute("x", pt.x > 200 ? -12 : 12);
      t.setAttribute("y", 4);
      t.setAttribute("text-anchor", pt.x > 200 ? "end" : "start");
      t.textContent = parts.slice(1).join(":");
      g.appendChild(c); g.appendChild(t);
      svg.appendChild(g);
      return { at: at, el: g };
    });
    if (head) svg.appendChild(head);
    function update() {
      var r = fig.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
      p = Math.max(0, Math.min(1, p));
      path.setAttribute("stroke-dashoffset", (len * (1 - p)).toFixed(2));
      if (head) {
        var pt = path.getPointAtLength(len * p);
        head.setAttribute("transform", "translate(" + pt.x + " " + pt.y + ")");
        head.style.opacity = p > 0.001 && p < 0.999 ? 1 : 0;
      }
      stops.forEach(function (s) { s.el.classList.toggle("is-on", p >= s.at - 0.001); });
      if (kmEl && totalKm) kmEl.textContent = Math.round(totalKm * p);
    }
    var queued = false;
    function queue() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; update(); }); } }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("touchmove", queue, { passive: true });
    window.addEventListener("resize", queue);
    update();
  })();

  /* Rubbellos zum Freirubbeln */
  (function scratchCard() {
    var card = document.querySelector(".scratch__card");
    var cv = card && card.querySelector(".scratch__layer");
    if (!cv) return;
    var ctx = cv.getContext("2d", { willReadFrequently: true });
    var done = false, last = null, moves = 0, dpr = 1;
    function paint() {
      var r = card.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var w = r.width, h = r.height;
      var g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#d9dce3"); g.addColorStop(0.45, "#f4f5f8"); g.addColorStop(0.55, "#b8bcc6"); g.addColorStop(1, "#e4e6eb");
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < w * h / 40; i++) {
        ctx.fillStyle = "rgba(255,255,255," + Math.random() * 0.35 + ")";
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      ctx.fillStyle = "rgba(43,61,245,.55)";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = Math.round(Math.min(w, h) * 0.16) + "px Anton, Impact, sans-serif";
      ctx.fillText("HIER RUBBELN", w / 2, h / 2);
      ctx.font = Math.round(Math.min(w, h) * 0.07) + "px Anton, Impact, sans-serif";
      for (var k = 0; k < 6; k++) ctx.fillText("★", w * (0.1 + k * 0.16), h * 0.18);
      for (k = 0; k < 6; k++) ctx.fillText("★", w * (0.1 + k * 0.16), h * 0.82);
    }
    function pos(e) {
      var r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function scratch(p) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 46; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo((last || p).x, (last || p).y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
      if (++moves % 12 === 0) check();
    }
    function check() {
      var data = ctx.getImageData(0, 0, cv.width, cv.height).data, clear = 0, n = 0;
      for (var i = 3; i < data.length; i += 4 * 24) { n++; if (data[i] < 40) clear++; }
      if (clear / n > 0.5) reveal();
    }
    function reveal() {
      if (done) return;
      done = true;
      cv.classList.add("is-done");
      card.classList.add("is-won");
      var r = card.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, 70);
    }
    cv.addEventListener("pointerdown", function (e) {
      if (done) return;
      cv.setPointerCapture(e.pointerId);
      last = null;
      scratch(pos(e));
    });
    cv.addEventListener("pointermove", function (e) {
      // auch rubbeln, wenn die Maus gedrückt von außen ins Feld gezogen wird
      if (done || !(cv.hasPointerCapture(e.pointerId) || (e.buttons & 1))) return;
      scratch(pos(e));
    });
    cv.addEventListener("pointerup", function () { last = null; if (!done) check(); });
    cv.addEventListener("pointerleave", function () { last = null; });
    var ready = false;
    function init() { if (!ready) { ready = true; paint(); } }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
    setTimeout(init, 1500);
    window.addEventListener("resize", function () { if (!done && ready) paint(); });
  })();

  /* Klänge (nur nach Antippen) */
  var audio = null;
  function ac() {
    if (!audio) {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      audio = new A();
    }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  // Gezupfte Saite (Karplus-Strong)
  function pluck(ctx, freq, when, gain) {
    var sr = ctx.sampleRate, dur = 2.2, n = Math.floor(sr * dur);
    var buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    var period = Math.round(sr / freq);
    for (var i = 0; i < period; i++) d[i] = Math.random() * 2 - 1;
    for (i = period; i < n; i++) d[i] = 0.996 * 0.5 * (d[i - period] + d[i - period - 1 >= 0 ? i - period - 1 : 0]);
    var src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    g.gain.value = gain;
    src.connect(g); g.connect(ctx.destination);
    src.start(when);
  }
  var chords = [
    [98.0, 123.47, 146.83, 196.0, 246.94, 392.0],   // G
    [82.41, 123.47, 164.81, 196.0, 246.94, 329.63], // Em
    [130.81, 164.81, 196.0, 261.63, 329.63],         // C
    [146.83, 220.0, 293.66, 369.99]                  // D
  ];
  var chordIdx = 0;
  function strum() {
    var ctx = ac();
    if (!ctx) return;
    var ch = chords[chordIdx++ % chords.length];
    ch.forEach(function (f, i) { pluck(ctx, f, ctx.currentTime + i * 0.035, 0.22); });
  }
  function popSound() {
    var ctx = ac();
    if (!ctx) return;
    var n = Math.floor(ctx.sampleRate * 0.12);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 0.7; g.gain.value = 0.6;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start();
  }

  /* ---------- 3D ---------- */
  if (!window.THREE) return;
  var canvas = document.getElementById("scene3d");
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (err) {
    return; // kein WebGL – Seite funktioniert trotzdem
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene();
  // Orthografische Kamera in Pixel-Einheiten: 1 Einheit = 1 CSS-Pixel
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -3000, 3000);
  camera.position.z = 1000;

  /* ---------- Licht + Umgebung (für Spiegelungen auf Chrom, Folie, Lack) ---------- */
  (function buildEnvironment() {
    var env = new THREE.Scene();
    var sky = new THREE.SphereGeometry(10, 32, 16);
    var colors = [];
    var pos = sky.attributes.position;
    var top = new THREE.Color(0xfff6e8), mid = new THREE.Color(0x9fb0ff), bottom = new THREE.Color(0x1a2050);
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i) / 10;
      var c = y > 0 ? mid.clone().lerp(top, y) : mid.clone().lerp(bottom, -y);
      colors.push(c.r, c.g, c.b);
    }
    sky.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    env.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    function panel(w, h, color, x, y, z) {
      var p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide }));
      p.position.set(x, y, z);
      p.lookAt(0, 0, 0);
      env.add(p);
    }
    panel(6, 3, new THREE.Color(6, 6, 6), -4, 6, 5);     // Hauptlicht oben links
    panel(3, 6, new THREE.Color(3, 3, 3.2), 7, 1, 3);    // Seitenlicht
    panel(4, 2, new THREE.Color(2.5, 0.6, 0.4), 0, -5, 6); // warmer Reflex von unten
    panel(3, 3, new THREE.Color(0.4, 0.6, 3), -7, -1, -2); // kühler Reflex
    // kleine bunte Lichtpunkte – lassen Chrom und Discokugel funkeln
    var sparkle = [[4, 4, 4], [3, 1.2, 0.6], [0.8, 1, 4], [1, 3.5, 2], [4, 3, 1], [3.5, 1, 3]];
    for (var s = 0; s < 18; s++) {
      var th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
      var c = sparkle[s % sparkle.length];
      panel(0.8, 0.8, new THREE.Color(c[0], c[1], c[2]), 8 * Math.sin(ph) * Math.cos(th), 8 * Math.cos(ph), 8 * Math.sin(ph) * Math.sin(th));
    }
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.03).texture;
    pmrem.dispose();
  })();

  var key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(-400, 700, 900);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334, 0.35));

  /* ---------- Materialien & Helfer ---------- */
  var C = {
    blue: 0x2b3df5, butter: 0xf6e7a8, red: 0xff4f2e, ink: 0x10172e,
    green: 0x1f4b3a, mint: 0x7fe0b5, lilac: 0xebcdf0, cream: 0xfbf3e2,
    pink: 0xff8fc7, gold: 0xf3c35b, brass: 0xd9a84e, leather: 0x7a4a2b, wicker: 0xc28a4a
  };
  function std(color, o) {
    var p = { color: color, roughness: 0.45, metalness: 0 };
    for (var k in o) p[k] = o[k];
    return linearize(new THREE.MeshStandardMaterial(p));
  }
  // Hex-Farben sind sRGB – für korrektes, sattes Rendering in Linear umrechnen
  function linearize(m) {
    m.color.convertSRGBToLinear();
    if (m.emissive) m.emissive.convertSRGBToLinear();
    return m;
  }
  function lacquer(color, o) {
    var p = { color: color, roughness: 0.3, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.1 };
    for (var k in o) p[k] = o[k];
    return linearize(new THREE.MeshPhysicalMaterial(p));
  }
  var M = {
    chrome: std(0xffffff, { metalness: 1, roughness: 0.12 }),
    steel: std(0xb8bcc6, { metalness: 1, roughness: 0.35 }),
    darkMetal: std(0x3a3d46, { metalness: 0.9, roughness: 0.4 }),
    rubber: std(0x1d1e24, { roughness: 0.9 }),
    gold: std(C.gold, { metalness: 1, roughness: 0.18 }),
    brass: std(C.brass, { metalness: 1, roughness: 0.3 })
  };
  function mesh(geo, m) { return new THREE.Mesh(geo, m); }
  function v(x, y, z) { return new THREE.Vector3(x, y, z || 0); }
  // Zylinder zwischen zwei Punkten
  function rod(a, b, r, m, seg) {
    var dir = new THREE.Vector3().subVectors(b, a);
    var t = mesh(new THREE.CylinderGeometry(r, r, dir.length(), seg || 12), m);
    t.position.copy(a).addScaledVector(dir, 0.5);
    t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return t;
  }
  // Rohr entlang einer Kurve
  function pipe(points, r, m, closed, segs) {
    var curve = new THREE.CatmullRomCurve3(points, !!closed);
    return mesh(new THREE.TubeGeometry(curve, segs || 64, r, 12, !!closed), m);
  }
  function lathe(points, m, segs) {
    return mesh(new THREE.LatheGeometry(points.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), segs || 64), m);
  }
  function extrude(shape, depth, bevel, m, bevelSeg) {
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8,
      bevelSegments: bevelSeg || 5, curveSegments: 32
    });
    geo.center();
    return mesh(geo, m);
  }
  function circleHole(x, y, r) {
    var p = new THREE.Path();
    p.absarc(x, y, r, 0, Math.PI * 2, true);
    return p;
  }
  function canvasTex(w, h, draw) {
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d"), w, h);
    var tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }
  // Text so klein setzen, dass er in maxW passt (falls die Schrift breiter ausfällt)
  function fitText(ctx, text, x, y, maxW, size, family) {
    ctx.font = size + "px " + family;
    var w = ctx.measureText(text).width;
    if (w > maxW) ctx.font = Math.floor(size * maxW / w) + "px " + family;
    ctx.fillText(text, x, y);
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  // Viele kleine gleiche Teile (Profilstollen, Streusel …) als InstancedMesh
  function scatter(geo, m, count, place) {
    var im = new THREE.InstancedMesh(geo, m, count);
    var d = new THREE.Object3D();
    for (var i = 0; i < count; i++) {
      d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
      var color = place(d, i);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
      if (color !== undefined && im.setColorAt) im.setColorAt(i, new THREE.Color(color));
    }
    return im;
  }

  // Zahnrad-Kontur (Kettenblatt / Ritzel)
  function gearShape(R, teeth, holeR, spider) {
    var s = new THREE.Shape();
    var inner = R * 0.9;
    for (var i = 0; i < teeth; i++) {
      var a = (i / teeth) * Math.PI * 2, step = (Math.PI * 2) / teeth;
      var pts = [[inner, a], [R, a + step * 0.3], [R, a + step * 0.55], [inner, a + step * 0.85]];
      pts.forEach(function (p, j) {
        var x = Math.cos(p[1]) * p[0], y = Math.sin(p[1]) * p[0];
        if (i === 0 && j === 0) s.moveTo(x, y); else s.lineTo(x, y);
      });
    }
    s.closePath();
    s.holes.push(circleHole(0, 0, holeR));
    if (spider) {
      for (var k = 0; k < 5; k++) {
        var ang = (k / 5) * Math.PI * 2 + 0.6;
        s.holes.push(circleHole(Math.cos(ang) * R * 0.58, Math.sin(ang) * R * 0.58, R * 0.18));
      }
    }
    return s;
  }
  function gear(R, teeth, thick, m, spider) {
    var g = new THREE.ExtrudeGeometry(gearShape(R, teeth, R * 0.22, spider), { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.25, bevelSize: thick * 0.2, bevelSegments: 2, curveSegments: 12 });
    g.center();
    return mesh(g, m);
  }

  /* ---------- Objekt-Baukasten ---------- */
  var builders = {
    /* Laufrad mit Profil, Felge, 32 gekreuzten Speichen, Nabe, Ventil, Ritzelpaket */
    wheel: function (r, opts) {
      opts = opts || {};
      r = r || 1;
      var g = new THREE.Group();
      g.add(mesh(new THREE.TorusGeometry(r, r * 0.075, 20, 120), M.rubber));
      // Seitenwand-Streifen (Retro-Reifen)
      g.add(mesh(new THREE.TorusGeometry(r * 0.955, r * 0.05, 12, 120), std(0xc9a36b, { roughness: 0.8 })));
      // Profilstollen
      var knobs = 72;
      g.add(scatter(new THREE.BoxGeometry(r * 0.05, r * 0.035, r * 0.06), M.rubber, knobs, function (d, i) {
        var a = (i / knobs) * Math.PI * 2;
        d.position.set(Math.cos(a) * r * 1.07, Math.sin(a) * r * 1.07, (i % 2 ? 1 : -1) * r * 0.035);
        d.rotation.z = a;
      }));
      // Felge
      g.add(mesh(new THREE.TorusGeometry(r * 0.91, r * 0.032, 12, 120), opts.rim ? lacquer(opts.rim) : M.chrome));
      g.add(mesh(new THREE.TorusGeometry(r * 0.88, r * 0.012, 8, 120), M.steel));
      // Nabe
      var hub = lathe([[0, -r * 0.16], [r * 0.03, -r * 0.16], [r * 0.03, -r * 0.13], [r * 0.08, -r * 0.12], [r * 0.08, -r * 0.1], [r * 0.035, -r * 0.09], [r * 0.045, 0], [r * 0.035, r * 0.09], [r * 0.08, r * 0.1], [r * 0.08, r * 0.12], [r * 0.03, r * 0.13], [r * 0.03, r * 0.16], [0, r * 0.16]], M.chrome, 32);
      hub.rotation.x = Math.PI / 2;
      g.add(hub);
      // Speichen (gekreuzt eingespeicht)
      var spokes = 32;
      for (var i = 0; i < spokes; i++) {
        var a = (i / spokes) * Math.PI * 2;
        var side = i % 2 ? 1 : -1;
        var b = a + side * 0.42;
        g.add(rod(v(Math.cos(b) * r * 0.075, Math.sin(b) * r * 0.075, side * r * 0.11),
          v(Math.cos(a) * r * 0.89, Math.sin(a) * r * 0.89, 0), r * 0.0055, M.steel, 5));
      }
      // Ventil
      var valve = rod(v(0, r * 0.84), v(0, r * 0.72), r * 0.012, M.brass, 8);
      valve.position.applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.3);
      valve.rotation.z += 0.3;
      g.add(valve);
      if (opts.cassette) {
        for (var k = 0; k < 6; k++) {
          var cog = gear(r * (0.2 - k * 0.018), 26 - k * 2, r * 0.01, M.steel);
          cog.position.z = r * (0.13 + k * 0.022);
          g.add(cog);
        }
      }
      return g;
    },

    /* Hollandrad mit Korb, Kette, Kettenblatt, Schutzblechen, Lampe, Klingel */
    bike: function () {
      var g = new THREE.Group();
      var frame = lacquer(C.red);
      var R = 0.62;
      var rear = v(-1.02, 0), front = v(1.02, 0), bb = v(-0.12, -0.04);
      var seat = v(-0.38, 0.8), headTop = v(0.66, 0.9), headBot = v(0.74, 0.62);
      var w1 = builders.wheel(R, { cassette: true }); w1.position.copy(rear); g.add(w1);
      var w2 = builders.wheel(R); w2.position.copy(front); g.add(w2);
      g.userData.wheels = [w1, w2];
      // Rahmen (Diamant + Tiefeinsteiger-Bogen)
      g.add(rod(seat, bb, 0.04, frame));
      g.add(rod(headTop, headBot, 0.05, frame));
      g.add(pipe([headBot, v(0.35, 0.25), v(0.05, 0.02), bb], 0.042, frame));
      g.add(pipe([headTop.clone().add(v(-0.02, -0.08)), v(0.25, 0.62), v(-0.1, 0.62), seat.clone().add(v(0.02, -0.12))], 0.034, frame));
      [-1, 1].forEach(function (s) {
        g.add(rod(v(rear.x, rear.y, s * 0.07), v(bb.x, bb.y, s * 0.05), 0.022, frame));
        g.add(rod(v(rear.x, rear.y, s * 0.07), v(seat.x, seat.y - 0.06, s * 0.03), 0.02, frame));
        // Gabel
        g.add(pipe([v(headBot.x, headBot.y, s * 0.04), v(0.84, 0.35, s * 0.075), v(0.95, 0.1, s * 0.075), v(front.x, front.y, s * 0.075)], 0.022, M.chrome, false, 24));
      });
      // Sattelstütze + Ledersattel mit Federn
      var postTop = v(-0.43, 1.0);
      g.add(rod(seat, postTop, 0.022, M.chrome));
      var saddle = mesh(new THREE.SphereGeometry(1, 32, 16), lacquer(C.leather, { roughness: 0.5, clearcoat: 0.4 }));
      saddle.scale.set(0.2, 0.05, 0.11);
      saddle.position.set(-0.46, 1.06, 0);
      g.add(saddle);
      var nose = mesh(new THREE.SphereGeometry(1, 24, 12), saddle.material);
      nose.scale.set(0.12, 0.04, 0.05); nose.position.set(-0.3, 1.07, 0);
      g.add(nose);
      [-1, 1].forEach(function (s) {
        var spring = mesh(new THREE.TorusKnotGeometry(0.025, 0.006, 48, 6, 1, 6), M.chrome);
        spring.rotation.x = Math.PI / 2;
        spring.position.set(-0.56, 1.01, s * 0.06);
        g.add(spring);
      });
      // Vorbau + geschwungener Lenker + Griffe
      var stemTop = v(0.63, 1.05);
      g.add(rod(headTop, stemTop, 0.022, M.chrome));
      g.add(pipe([v(0.42, 1.08, -0.4), v(0.55, 1.07, -0.33), v(0.66, 1.05, -0.12), v(0.66, 1.05, 0.12), v(0.55, 1.07, 0.33), v(0.42, 1.08, 0.4)], 0.018, M.chrome));
      [-1, 1].forEach(function (s) {
        var grip = rod(v(0.42, 1.08, s * 0.4), v(0.28, 1.08, s * 0.41), 0.03, std(C.cream, { roughness: 0.7 }), 16);
        g.add(grip);
      });
      // Klingel
      var bell = builders.bell();
      bell.scale.setScalar(0.06);
      bell.position.set(0.6, 1.12, -0.22);
      g.add(bell);
      // Lampe
      var lamp = lathe([[0, 0], [0.05, 0], [0.065, 0.05], [0.065, 0.1], [0, 0.1]], M.chrome, 32);
      lamp.rotation.z = -Math.PI / 2;
      lamp.position.set(0.76, 0.78, 0);
      g.add(lamp);
      var lens = mesh(new THREE.CircleGeometry(0.06, 32), std(0xfff3c4, { emissive: 0xffe9a0, emissiveIntensity: 1.2 }));
      lens.rotation.y = Math.PI / 2;
      lens.position.set(0.865, 0.78, 0);
      g.add(lens);
      // Korb (Weide) vorne
      var basket = new THREE.Group();
      var wick = std(C.wicker, { roughness: 0.8 });
      for (var row = 0; row < 5; row++) {
        var ring = mesh(new THREE.TorusGeometry(1, 0.035, 6, 4), wick);
        ring.rotation.set(Math.PI / 2, 0, Math.PI / 4);
        ring.scale.set(0.24, 0.18, 1);
        ring.position.y = row * 0.055;
        basket.add(ring);
      }
      for (var c2 = 0; c2 < 12; c2++) {
        var u = c2 / 12;
        var px = u < 0.5 ? (u * 4 - 1) * 0.17 : ((u - 0.5) * 4 - 1) * 0.17;
        var pz = u < 0.5 ? 0.13 : -0.13;
        basket.add(rod(v(px, -0.01, pz), v(px, 0.23, pz), 0.008, wick, 5));
      }
      var bottom = mesh(new THREE.BoxGeometry(0.34, 0.02, 0.26), wick);
      basket.add(bottom);
      // Inhalt: Baguette + Blumen
      var bread = mesh(THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.035, 0.35, 6, 12) : new THREE.CylinderGeometry(0.035, 0.035, 0.4, 12), std(0xd79a52, { roughness: 0.7 }));
      bread.rotation.z = 1.1; bread.position.set(-0.04, 0.25, 0.03);
      basket.add(bread);
      for (var fl = 0; fl < 3; fl++) {
        var stem2 = rod(v(0.06 + fl * 0.03, 0.05, -0.05 + fl * 0.04), v(0.08 + fl * 0.05, 0.36 - fl * 0.03, -0.05 + fl * 0.05), 0.006, std(C.green), 5);
        basket.add(stem2);
        var head = builders.flower(pick([C.pink, C.butter, C.red]));
        head.scale.setScalar(0.06);
        head.position.copy(stem2.position).add(v(0.01 + fl * 0.01, 0.15 - fl * 0.015, 0));
        basket.add(head);
      }
      basket.position.set(0.92, 0.88, 0);
      g.add(basket);
      g.add(rod(v(0.74, 0.7), v(0.86, 0.88), 0.012, M.steel));
      // Schutzbleche
      [[rear, 0.2, 2.4], [front, 0.35, 2.0]].forEach(function (f) {
        var fender = mesh(new THREE.TorusGeometry(R * 1.13, 0.05, 8, 48, f[2]), lacquer(C.cream));
        fender.scale.z = 1.4;
        fender.position.copy(f[0]);
        fender.rotation.z = f[1];
        g.add(fender);
      });
      // Antrieb: Kettenblatt, Kurbeln, Pedale, Kette
      var ring2 = gear(0.17, 38, 0.012, M.steel, true);
      ring2.position.set(bb.x, bb.y, 0.1);
      g.add(ring2);
      g.userData.crank = new THREE.Group();
      g.userData.crank.position.copy(bb);
      [[0.13, 1], [-0.17, -1]].forEach(function (c) {
        var arm = rod(v(0, 0, c[0]), v(0, -0.18 * c[1], c[0]), 0.018, M.chrome);
        g.userData.crank.add(arm);
        var pedal = mesh(new THREE.BoxGeometry(0.1, 0.025, 0.12), M.rubber);
        pedal.position.set(0, -0.18 * c[1], c[0] + 0.07 * Math.sign(c[0]));
        g.userData.crank.add(pedal);
      });
      g.add(g.userData.crank);
      var chainPts = [];
      for (var k = 0; k <= 16; k++) {
        var aa = Math.PI / 2 - (k / 16) * Math.PI;
        chainPts.push(v(bb.x + Math.cos(aa) * 0.175, bb.y + Math.sin(aa) * 0.175, 0.1));
      }
      for (k = 0; k <= 12; k++) {
        var ab = -Math.PI / 2 - (k / 12) * Math.PI;
        chainPts.push(v(rear.x + Math.cos(ab) * 0.085, rear.y + Math.sin(ab) * 0.085, 0.1));
      }
      g.add(pipe(chainPts, 0.011, M.darkMetal, true, 160));
      // Ständer
      g.add(rod(v(-0.4, 0, -0.08), v(-0.55, -0.6, -0.14), 0.016, M.steel));
      return g;
    },

    flower: function (color) {
      var g = new THREE.Group();
      var petal = lacquer(color, { roughness: 0.4 });
      for (var i = 0; i < 8; i++) {
        var p = mesh(new THREE.SphereGeometry(0.5, 12, 8), petal);
        p.scale.set(1, 0.25, 0.45);
        var a = (i / 8) * Math.PI * 2;
        p.position.set(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55);
        p.rotation.y = -a;
        g.add(p);
      }
      var center = mesh(new THREE.SphereGeometry(0.35, 16, 12), std(0x6b3a12, { roughness: 0.9 }));
      center.scale.y = 0.6;
      g.add(center);
      g.rotation.x = 0.9;
      return g;
    },

    /* Fahrradhelm mit Lüftungsschlitzen, Rippen, Visier, Gurten, Schnalle */
    helmet: function () {
      var g = new THREE.Group();
      var shellMat = lacquer(C.mint);
      var shell = mesh(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.47), shellMat);
      shell.scale.set(0.9, 0.78, 1.18);
      g.add(shell);
      // Innenschale (EPS-Schaum)
      var inner = mesh(new THREE.SphereGeometry(0.97, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), std(0x2d2f38, { roughness: 0.95, side: THREE.BackSide }));
      inner.scale.copy(shell.scale);
      g.add(inner);
      // Lüftungsschlitze: in Reihen von vorne nach hinten auf der Schale
      var vent = std(0x10131c, { roughness: 0.6 });
      var S = v(0.9, 0.78, 1.18);
      [-0.56, -0.28, 0, 0.28, 0.56].forEach(function (a) {
        [0.55, 1.05, 1.55, 2.05, 2.55].forEach(function (b) {
          var n = v(Math.sin(a), Math.cos(a) * Math.sin(b), Math.cos(a) * Math.cos(b));
          var p = v(n.x * S.x, n.y * S.y, n.z * S.z);
          if (p.y < 0.2) return;
          var N = v(p.x / (S.x * S.x), p.y / (S.y * S.y), p.z / (S.z * S.z)).normalize();
          var T = v(0, Math.cos(a) * Math.cos(b) * S.y, -Math.cos(a) * Math.sin(b) * S.z).normalize();
          var B = new THREE.Vector3().crossVectors(T, N).normalize();
          T.crossVectors(N, B);
          var slot = mesh(new THREE.SphereGeometry(1, 16, 8), vent);
          slot.scale.set(0.065 - Math.abs(a) * 0.03, 0.2, 0.035);
          slot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(B, T, N));
          slot.position.copy(p);
          g.add(slot);
        });
      });
      // Rippen
      [-0.2, 0.2].forEach(function (x) {
        var rib = mesh(new THREE.TorusGeometry(1.0, 0.03, 8, 64, Math.PI), lacquer(C.ink));
        rib.rotation.y = Math.PI / 2;
        rib.scale.set(1.18, 0.79, 1);
        rib.position.x = x;
        g.add(rib);
      });
      // Unterer Rand
      var band = mesh(new THREE.TorusGeometry(1, 0.035, 8, 96), lacquer(C.ink));
      band.rotation.x = Math.PI / 2;
      band.scale.set(0.905, 1.185, 1);
      band.position.y = 0.06;
      g.add(band);
      // Visier
      var visor = mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.04, 48, 1, true, -0.7, 1.4), lacquer(C.ink, { side: THREE.DoubleSide }));
      visor.scale.set(0.95, 1, 1.22);
      visor.position.y = 0.12;
      visor.rotation.x = -0.12;
      g.add(visor);
      // Gurte + Schnalle
      var strap = std(0x222631, { roughness: 0.8 });
      [-1, 1].forEach(function (s) {
        g.add(pipe([v(s * 0.86, 0.05, 0.35), v(s * 0.82, -0.35, 0.25), v(s * 0.4, -0.75, 0.15), v(0, -0.85, 0.1)], 0.018, strap));
        g.add(pipe([v(s * 0.86, 0.05, -0.35), v(s * 0.86, -0.3, -0.05), v(s * 0.82, -0.35, 0.25)], 0.016, strap));
      });
      var buckle = mesh(new THREE.BoxGeometry(0.16, 0.08, 0.05), std(0x111111, { roughness: 0.3 }));
      buckle.position.set(0, -0.85, 0.12);
      g.add(buckle);
      g.rotation.x = 0.15;
      return g;
    },

    /* Fahrradklingel */
    bell: function () {
      var g = new THREE.Group();
      var dome = lathe([[0, 0.55], [0.3, 0.53], [0.62, 0.42], [0.85, 0.2], [0.95, 0], [0.92, -0.04], [0, -0.04]], M.chrome, 64);
      g.add(dome);
      var enamel = lathe([[0, 0.56], [0.28, 0.545], [0.42, 0.5], [0, 0.5]], lacquer(C.red), 48);
      g.add(enamel);
      var stud = mesh(new THREE.SphereGeometry(0.08, 16, 12), M.chrome);
      stud.position.y = 0.58; g.add(stud);
      var base = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.12, 48), M.darkMetal);
      base.position.y = -0.12; g.add(base);
      var clamp = mesh(new THREE.TorusGeometry(0.28, 0.07, 12, 32), M.steel);
      clamp.position.set(0, -0.45, 0); clamp.rotation.y = Math.PI / 2; g.add(clamp);
      var lever = pipe([v(0.6, -0.1, 0), v(0.95, -0.05, 0.1), v(1.25, 0.05, 0.25)], 0.05, M.chrome, false, 20);
      g.add(lever);
      var pad = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 24), M.chrome);
      pad.position.set(1.28, 0.07, 0.27); g.add(pad);
      return g;
    },

    /* Trinkflasche mit Griffmulde, Etikett, Deckel, Mundstück */
    bottle: function () {
      var g = new THREE.Group();
      var label = canvasTex(1024, 256, function (ctx, w, h) {
        ctx.fillStyle = "#2b3df5"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#f6e7a8";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        fitText(ctx, "SIMON", w * 0.25, h / 2 + 10, 420, 180, "Anton, Impact, sans-serif");
        fitText(ctx, "SIMON", w * 0.75, h / 2 + 10, 420, 180, "Anton, Impact, sans-serif");
      });
      var body = lathe([[0, -1.1], [0.36, -1.1], [0.42, -1.04], [0.43, -0.6], [0.37, -0.4], [0.37, -0.2], [0.43, 0], [0.43, 0.55], [0.4, 0.7], [0.3, 0.8], [0.3, 0.86], [0, 0.86]], lacquer(C.butter, { roughness: 0.25, transparent: true, opacity: 0.93 }), 72);
      g.add(body);
      var lab = mesh(new THREE.CylinderGeometry(0.437, 0.437, 0.48, 72, 1, true), lacquer(0xffffff, { map: label, roughness: 0.35 }));
      lab.position.y = 0.27;
      g.add(lab);
      // Griffrillen
      for (var i = 0; i < 4; i++) {
        var ridge = mesh(new THREE.TorusGeometry(0.375, 0.012, 8, 64), lacquer(C.butter));
        ridge.rotation.x = Math.PI / 2;
        ridge.position.y = -0.38 + i * 0.055;
        g.add(ridge);
      }
      var cap = lathe([[0, 0.84], [0.33, 0.84], [0.34, 0.88], [0.34, 1.02], [0.28, 1.08], [0.12, 1.1], [0, 1.1]], lacquer(C.ink), 48);
      g.add(cap);
      for (var k = 0; k < 24; k++) {
        var a = (k / 24) * Math.PI * 2;
        var grip = mesh(new THREE.BoxGeometry(0.02, 0.12, 0.02), lacquer(C.ink));
        grip.position.set(Math.cos(a) * 0.345, 0.94, Math.sin(a) * 0.345);
        grip.rotation.y = -a;
        g.add(grip);
      }
      var nozzle = lathe([[0, 1.08], [0.12, 1.08], [0.1, 1.2], [0.08, 1.32], [0.09, 1.36], [0, 1.37]], lacquer(C.red), 32);
      g.add(nozzle);
      g.rotation.z = -0.25;
      return g;
    },

    /* Discokugel aus Spiegelfacetten */
    disco: function () {
      var g = new THREE.Group();
      var ball = mesh(new THREE.IcosahedronGeometry(1, isMobile ? 5 : 6), std(0xffffff, { metalness: 1, roughness: 0.06, flatShading: true }));
      g.add(ball);
      var cap = lathe([[0, 1.12], [0.18, 1.1], [0.2, 1.0], [0.12, 0.96], [0, 0.96]], M.chrome, 32);
      g.add(cap);
      for (var i = 0; i < 6; i++) {
        var link = mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 20), M.steel);
        link.position.y = 1.18 + i * 0.1;
        link.rotation.y = i % 2 ? Math.PI / 2 : 0;
        link.scale.y = 1.4;
        g.add(link);
      }
      return g;
    },

    /* Latexballon mit Knoten, Glanz und Ringelschnur */
    balloon: function (color, noString) {
      var g = new THREE.Group();
      var c = color || C.red;
      var pts = [];
      for (var i = 0; i <= 40; i++) {
        var t = i / 40;
        var a = t * Math.PI;
        var r = Math.sin(a) * (0.78 - 0.12 * Math.cos(a)) * (1 - 0.15 * Math.pow(1 - t, 6));
        pts.push([Math.max(r, 0.0001), -Math.cos(a) * 1.0 + 0.1 * t]);
      }
      pts[0][0] = 0.06;
      g.add(lathe(pts, lacquer(c, { roughness: 0.18, clearcoat: 1 }), 64));
      var knot = lathe([[0, -1.18], [0.07, -1.16], [0.09, -1.08], [0.05, -1.02], [0.06, -0.99], [0, -0.98]], lacquer(c), 24);
      g.add(knot);
      g.userData.isBalloon = true;
      g.userData.color = c;
      if (noString) return g;
      var s = [];
      for (var k = 0; k <= 80; k++) {
        var u = k / 80;
        s.push(v(Math.sin(u * 26) * 0.05 * (1 - u * 0.4) + u * 0.2, -1.18 - u * 1.3, Math.cos(u * 26) * 0.05));
      }
      g.add(pipe(s, 0.008, std(0xffffff, { roughness: 0.5 }), false, 240));
      return g;
    },
    /* Strauß aus vielen Luftballons mit zusammenlaufenden Schnüren und Schleife */
    balloons: function (count) {
      var g = new THREE.Group();
      var n = count || 9;
      var colors = [C.red, C.mint, C.butter, C.pink, C.blue, C.lilac, 0xffffff, C.gold];
      var knot = v(0, -2.9, 0);
      for (var i = 0; i < n; i++) {
        var b = builders.balloon(colors[i % colors.length], true);
        var a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
        var ring = i === 0 ? 0 : 0.95 + (i % 2) * 0.35;
        var pos = v(Math.cos(a) * ring, rand(-0.2, 0.5) + (i === 0 ? 0.6 : 0), Math.sin(a) * ring * 0.8);
        var sc = rand(0.8, 1.05);
        b.scale.setScalar(sc);
        b.userData.baseScale = sc;
        b.position.copy(pos);
        b.rotation.set(Math.sin(a) * 0.25, rand(0, Math.PI * 2), -Math.cos(a) * 0.25 * (ring ? 1 : 0));
        g.add(b);
        var start = new THREE.Vector3(0, -1.18 * sc, 0).applyEuler(b.rotation).add(pos);
        g.add(pipe([start, start.clone().lerp(knot, 0.4).add(v(rand(-0.15, 0.15), 0, rand(-0.15, 0.15))), knot], 0.01, std(0xffffff, { roughness: 0.5 }), false, 40));
      }
      // Schleife + lange Ringelschnur nach unten
      var bowMat = lacquer(C.red);
      [-1, 1].forEach(function (s) {
        g.add(pipe([knot, v(s * 0.12, -2.75, 0.04), v(s * 0.25, -2.85, 0), v(s * 0.12, -2.95, -0.04), knot], 0.03, bowMat, true, 32));
      });
      var tail = [];
      for (var k = 0; k <= 60; k++) {
        var u = k / 60;
        tail.push(v(Math.sin(u * 22) * 0.06, -2.9 - u * 0.9, Math.cos(u * 22) * 0.06));
      }
      g.add(pipe(tail, 0.012, std(0xffffff, { roughness: 0.5 }), false, 160));
      return g;
    },

    /* Rubbellos mit Rubbelfeldern, teils freigerubbelt, Münze und Rubbelkrümeln */
    lotto: function () {
      var g = new THREE.Group();
      var W = 1.4, H = 2.1;
      var front = canvasTex(512, 768, function (ctx, w, h) {
        var grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#ff4f2e"); grd.addColorStop(1, "#2b3df5");
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        // Sonnenstrahlen
        ctx.save(); ctx.translate(w / 2, 150); ctx.fillStyle = "rgba(255,255,255,.12)";
        for (var r = 0; r < 18; r++) { ctx.rotate(Math.PI / 9); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, 600); ctx.lineTo(30, 600); ctx.fill(); }
        ctx.restore();
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#f6e7a8"; ctx.font = "96px Anton, Impact, sans-serif";
        ctx.fillText("GLÜCKSLOS", w / 2, 100);
        ctx.font = "34px Anton, Impact, sans-serif"; ctx.fillStyle = "#ffffff";
        ctx.fillText("RUBBELN & GEWINNEN – SIMON 40", w / 2, 175);
        // Felder: Hintergrund mit Gewinnsymbolen
        var labels = ["40", "TOUR", "40", "♥", "40", "PARTY"];
        for (var i = 0; i < 6; i++) {
          var x = 46 + (i % 2) * 220, y = 230 + Math.floor(i / 2) * 150;
          ctx.fillStyle = "#fbf3e2"; ctx.fillRect(x, y, 200, 130);
          ctx.fillStyle = "#ff4f2e"; ctx.font = (labels[i].length > 2 ? 52 : 80) + "px Anton, Impact, sans-serif";
          ctx.fillText(labels[i], x + 100, y + 68);
        }
        // Feld 3 halb freigerubbelt (silberne Reste)
        ctx.fillStyle = "#b9bdc7";
        var fx = 46, fy = 380;
        for (var k = 0; k < 140; k++) {
          var px = fx + Math.random() * 200, py = fy + Math.random() * 130;
          if (px - fx + (py - fy) * 0.8 > 150) ctx.fillRect(px, py, 6 + Math.random() * 10, 4 + Math.random() * 6);
        }
        ctx.fillStyle = "#f6e7a8"; ctx.font = "26px 'Space Grotesk', sans-serif";
        ctx.fillText("3 × „40“ = HAUPTGEWINN", w / 2, 715);
      });
      var edge = std(0xf4efe6, { roughness: 0.7 });
      var card = mesh(new THREE.BoxGeometry(W, H, 0.025), [edge, edge, edge, edge, lacquer(0xffffff, { map: front, roughness: 0.4, clearcoat: 0.5 }), std(C.cream, { roughness: 0.8 })]);
      g.add(card);
      // Silberne Rubbelschicht auf den noch nicht gerubbelten Feldern (leicht erhaben)
      var foil = std(0xc9ccd4, { metalness: 0.9, roughness: 0.35 });
      [1, 3, 5].forEach(function (i) {
        var x = 46 + (i % 2) * 220, y = 230 + Math.floor(i / 2) * 150;
        var cx = ((x + 100) / 512 - 0.5) * W, cy = (0.5 - (y + 65) / 768) * H;
        var f = mesh(new THREE.BoxGeometry(200 / 512 * W, 130 / 768 * H, 0.008), foil);
        f.position.set(cx, cy, 0.016);
        g.add(f);
        // Sternchen-Prägung
        var st = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 5), std(0xe9ebf0, { metalness: 1, roughness: 0.2 }));
        st.position.set(cx, cy, 0.022);
        g.add(st);
      });
      // Münze mit Riffelrand
      var coin = new THREE.Group();
      coin.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 64), M.gold));
      g.add(scatter(new THREE.BoxGeometry(0.012, 0.05, 0.02), M.gold, 90, function (o, i) {
        var a = (i / 90) * Math.PI * 2;
        o.position.set(0.74 + Math.cos(a) * 0.285, -0.9, 0.25 + Math.sin(a) * 0.285);
        o.rotation.y = -a;
      }));
      var face = mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 48), M.gold);
      face.rotation.x = Math.PI / 2; face.position.y = 0.03;
      coin.add(face);
      coin.position.set(0.74, -0.9, 0.25);
      g.add(coin);
      // Rubbelkrümel
      g.add(scatter(new THREE.BoxGeometry(0.03, 0.02, 0.008), foil, 40, function (o) {
        o.position.set(rand(-0.75, -0.1), rand(-0.95, -0.2), rand(0.02, 0.12));
        o.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
        o.scale.setScalar(rand(0.5, 1.6));
      }));
      g.rotation.z = -0.12;
      return g;
    },

    /* Akustikgitarre mit Sunburst-Decke, Schallloch-Rosette, Bünden, Mechaniken und Saiten */
    guitar: function () {
      var g = new THREE.Group();
      var right = [[0, -0.78], [0.36, -0.73], [0.53, -0.5], [0.5, -0.2], [0.33, 0.03], [0.38, 0.26], [0.34, 0.5], [0.17, 0.62], [0, 0.64]];
      var pts = right.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      for (var i = right.length - 2; i >= 1; i--) pts.push(new THREE.Vector2(-right[i][0], right[i][1]));
      var shape = new THREE.Shape();
      shape.moveTo(pts[0].x, pts[0].y);
      shape.splineThru(pts.slice(1).concat([pts[0]]));
      var bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.26, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 4, curveSegments: 48 });
      var uv = bodyGeo.attributes.uv, pos = bodyGeo.attributes.position;
      for (var j = 0; j < uv.count; j++) uv.setXY(j, (pos.getX(j) + 0.6) / 1.2, (pos.getY(j) + 0.8) / 1.5);
      var burst = canvasTex(512, 640, function (ctx, w, h) {
        var grd = ctx.createRadialGradient(w / 2, h * 0.45, 30, w / 2, h * 0.45, w * 0.62);
        grd.addColorStop(0, "#f6c46a"); grd.addColorStop(0.55, "#d9822b"); grd.addColorStop(0.85, "#7a2e12"); grd.addColorStop(1, "#2a0f06");
        ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 0.08; ctx.strokeStyle = "#3a1a08";
        for (var x = 0; x < w; x += 6) { ctx.beginPath(); ctx.moveTo(x + Math.random() * 3, 0); ctx.lineTo(x + Math.random() * 3, h); ctx.stroke(); }
      });
      var body = mesh(bodyGeo, [lacquer(0xffffff, { map: burst, roughness: 0.25, clearcoat: 1 }), lacquer(0x4a1d0c, { roughness: 0.3 })]);
      body.position.z = -0.13;
      g.add(body);
      var topZ = 0.13 + 0.03;
      // Schallloch + Rosette
      var hole = mesh(new THREE.CircleGeometry(0.15, 48), std(0x0b0704, { roughness: 1 }));
      hole.position.set(0, 0.2, topZ + 0.002);
      g.add(hole);
      [[0.17, 0.012, 0x1a0d05], [0.19, 0.008, 0xf2e2c0], [0.21, 0.012, 0x1a0d05]].forEach(function (r) {
        var ring = mesh(new THREE.TorusGeometry(r[0], r[1], 6, 64), std(r[2], { roughness: 0.4 }));
        ring.position.set(0, 0.2, topZ);
        g.add(ring);
      });
      // Schlagbrett
      var pg = new THREE.Shape();
      pg.moveTo(0.12, 0.05); pg.quadraticCurveTo(0.34, 0.0, 0.3, 0.18); pg.quadraticCurveTo(0.28, 0.32, 0.18, 0.33); pg.absarc(0, 0.2, 0.215, 0.6, -0.95, true);
      var pick2 = mesh(new THREE.ExtrudeGeometry(pg, { depth: 0.004, bevelEnabled: false, curveSegments: 24 }), lacquer(0x2a1208, { roughness: 0.2 }));
      pick2.position.z = topZ;
      g.add(pick2);
      // Steg mit Stegeinlage und Pins
      var bridge = mesh(new THREE.BoxGeometry(0.42, 0.07, 0.025), lacquer(0x1a0d05));
      bridge.position.set(0, -0.42, topZ + 0.012);
      g.add(bridge);
      var saddle = mesh(new THREE.BoxGeometry(0.26, 0.012, 0.02), std(0xf6f0e0));
      saddle.position.set(0, -0.4, topZ + 0.03);
      g.add(saddle);
      // Hals, Griffbrett, Bünde, Einlagen
      var neckLen = 1.25, neckY0 = 0.55;
      var neck = mesh(new THREE.BoxGeometry(0.13, neckLen, 0.08), lacquer(0x6b3a1c, { roughness: 0.35 }));
      neck.position.set(0, neckY0 + neckLen / 2, 0.08);
      g.add(neck);
      var board = mesh(new THREE.BoxGeometry(0.15, neckLen + 0.1, 0.02), std(0x1c120c, { roughness: 0.6 }));
      board.position.set(0, neckY0 + neckLen / 2 - 0.05, topZ + 0.005);
      g.add(board);
      var fretY = neckY0 + neckLen;
      for (var f = 1; f <= 18; f++) {
        var y = fretY - (1 - Math.pow(2, -f / 12)) * 1.9;
        var fret = mesh(new THREE.BoxGeometry(0.15, 0.008, 0.008), M.steel);
        fret.position.set(0, y, topZ + 0.018);
        g.add(fret);
        if ([3, 5, 7, 9, 15, 17].indexOf(f) >= 0 || f === 12) {
          var yPrev = fretY - (1 - Math.pow(2, -(f - 1) / 12)) * 1.9;
          [f === 12 ? -0.035 : 0, f === 12 ? 0.035 : null].forEach(function (dx) {
            if (dx === null) return;
            var dot = mesh(new THREE.CircleGeometry(0.012, 16), std(0xf3efe6, { roughness: 0.2 }));
            dot.position.set(dx, (y + yPrev) / 2, topZ + 0.0165);
            g.add(dot);
          });
        }
      }
      var nut = mesh(new THREE.BoxGeometry(0.15, 0.015, 0.03), std(0xf6f0e0));
      nut.position.set(0, fretY, topZ + 0.02);
      g.add(nut);
      // Kopfplatte + Mechaniken
      var head = mesh(new THREE.BoxGeometry(0.2, 0.36, 0.04), lacquer(0x1a0d05));
      head.position.set(0, fretY + 0.19, 0.12);
      head.rotation.x = -0.25;
      g.add(head);
      for (var k = 0; k < 6; k++) {
        var side = k < 3 ? -1 : 1;
        var py = fretY + 0.08 + (k % 3) * 0.1;
        var post = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12), M.chrome);
        post.rotation.x = Math.PI / 2;
        post.position.set(side * 0.06, py, 0.17 - (py - fretY) * 0.25);
        g.add(post);
        g.add(rod(v(side * 0.1, py, 0.11 - (py - fretY) * 0.25), v(side * 0.16, py, 0.11 - (py - fretY) * 0.25), 0.012, M.chrome));
        var btn = mesh(new THREE.SphereGeometry(0.035, 16, 12), std(0xf3efe6, { roughness: 0.3 }));
        btn.scale.set(0.6, 1, 0.4);
        btn.position.set(side * 0.18, py, 0.11 - (py - fretY) * 0.25);
        g.add(btn);
      }
      // Saiten (Bass dicker, Diskant dünner)
      for (var s = 0; s < 6; s++) {
        var x = -0.055 + s * 0.022;
        g.add(rod(v(x * 1.15, -0.4, topZ + 0.042), v(x * 0.9, fretY, topZ + 0.03), 0.0035 - s * 0.0004, s < 3 ? M.brass : M.chrome, 6));
      }
      // Gurtpin
      var pin = mesh(new THREE.SphereGeometry(0.025, 12, 8), M.chrome);
      pin.position.set(0, -0.8, 0);
      g.add(pin);
      g.rotation.z = 0.35;
      return g;
    }
  };
  var randomPool = ["balloon", "balloon", "balloon", "balloon", "balloons", "balloon", "lotto", "disco", "helmet", "bottle", "guitar"];
  var swayTypes = { bike: 1, guitar: 1, lotto: 1, balloons: 1 };

  /* ---------- Glas ----------
     Jedes Mesh bekommt zwei Schichten:
     1) getönter, durchscheinender Glaskörper (Farbe des Originals)
     2) additive Spiegelschicht mit Fresnel-Kante – Reflexionen + helle Ränder,
        die auch über dem HTML-Hintergrund leuchten */
  var glassCache = {};
  function glassBody(src) {
    if (glassCache[src.uuid]) return glassCache[src.uuid];
    var tint = src.color ? src.color.clone() : new THREE.Color(1, 1, 1);
    
    // helle Farben werden klares Glas, kräftige Farben farbiges Glas
    var lum = tint.r * 0.3 + tint.g * 0.59 + tint.b * 0.11;
    var m = new THREE.MeshPhysicalMaterial({
      color: tint,
      map: src.map || null,
      // leichtes Eigenleuchten in der Glasfarbe, damit die Tönung auch vor Blau kräftig bleibt
      emissive: src.emissive && src.emissive.getHex() ? src.emissive.clone() : tint.clone().multiplyScalar(src.map ? 0.05 : 0.12 * (1 - lum)),
      emissiveIntensity: src.emissive && src.emissive.getHex() ? src.emissiveIntensity : 1,
      metalness: 0,
      roughness: 0.12,
      envMapIntensity: 0.5,
      transparent: true,
      opacity: src.map ? 0.78 : Math.max(0.24, 0.72 - 0.5 * lum),
      depthWrite: false,
      side: THREE.DoubleSide,
      flatShading: !!src.flatShading
    });
    glassCache[src.uuid] = m;
    return m;
  }
  var glintMat = (function () {
    var m = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 1, roughness: 0.04, envMapIntensity: 1,
      transparent: true, depthWrite: false,
      // rein additiv auf RGB, Alpha bleibt unverändert -> Lichtreflexe ohne dunkle Flächen
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor
    });
    m.onBeforeCompile = function (shader) {
      shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>",
        "float fr = pow(1.0 - abs(dot(normalize(normal), vec3(0.0, 0.0, 1.0))), 2.6);\n" +
        "gl_FragColor.rgb = gl_FragColor.rgb * (0.1 + 0.7 * fr) + vec3(0.85, 0.9, 1.0) * fr * 0.55;\n" +
        "#include <dithering_fragment>");
    };
    return m;
  })();
  // Facettiertes Glas (Discokugel): kräftigere Spiegelungen
  var glintFlat = glintMat.clone();
  glintFlat.flatShading = true;
  glintFlat.onBeforeCompile = function (shader) {
    shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>",
      "float fr = pow(1.0 - abs(dot(normalize(normal), vec3(0.0, 0.0, 1.0))), 2.0);\n" +
      "gl_FragColor.rgb = gl_FragColor.rgb * (0.3 + 0.6 * fr) + vec3(0.85, 0.9, 1.0) * fr * 0.25;\n" +
      "#include <dithering_fragment>");
  };
  function glassify(root) {
    var meshes = [];
    root.traverse(function (o) { if (o.isMesh) meshes.push(o); });
    meshes.forEach(function (o) {
      var src = Array.isArray(o.material) ? o.material : [o.material];
      var body = src.map(glassBody);
      o.material = Array.isArray(o.material) ? body : body[0];
      o.renderOrder = 1;
      var gm = src[0].flatShading ? glintFlat : glintMat;
      var glint;
      if (o.isInstancedMesh) {
        glint = new THREE.InstancedMesh(o.geometry, gm, o.count);
        glint.instanceMatrix.copy(o.instanceMatrix);
      } else {
        glint = new THREE.Mesh(o.geometry, gm);
      }
      glint.renderOrder = 2;
      o.add(glint);
    });
    return root;
  }

  // Objekt zentrieren und auf "Radius 1" normieren; der äußere Holder wird pro Frame skaliert
  function normalize(obj) {
    obj.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(obj);
    var size = box.getSize(new THREE.Vector3());
    obj.position.sub(box.getCenter(new THREE.Vector3()));
    var wrap = new THREE.Group();
    wrap.add(obj);
    wrap.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
    var holder = new THREE.Group();
    holder.add(wrap);
    return holder;
  }

  /* ---------- Objekte an DOM-Anker hängen ---------- */
  var items = [];
  function addItem(el, type, speed) {
    if (!builders[type]) type = pick(randomPool);
    var inner = type === "balloon" && !el.dataset.obj ? builders.balloon(pick([C.red, C.mint, C.butter, C.pink, C.blue])) : builders[type]();
    var obj = normalize(glassify(inner));
    scene.add(obj);
    items.push({
      el: el, obj: obj, inner: inner, type: type, speed: speed,
      spinAxis: type === "wheel" ? "z" : "y",
      sway: !!swayTypes[type],
      spin: (0.25 + Math.random() * 0.35) * (Math.random() < 0.5 ? -1 : 1),
      tilt: (Math.random() - 0.5) * 0.5,
      phase: Math.random() * Math.PI * 2,
      ride: el.dataset.ride === "true"
    });
  }

  var smoothY = window.scrollY;
  function measure() {
    var sx = window.scrollX, sy = window.scrollY;
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      it.px = r.left + r.width / 2 + sx;
      it.py = r.top + r.height / 2 + sy;
      it.size = Math.max(r.width, r.height) * 0.5;
      it.w = r.width;
    });
  }

  function init() {
    document.querySelectorAll(".obj3d").forEach(function (el) {
      addItem(el, el.dataset.obj, parseFloat(el.dataset.speed || "0.2"));
    });

    // Zufällig verstreute kleinere Objekte am Seitenrand
    var floaterCount = isMobile ? 16 : 28;
    var docH = document.documentElement.scrollHeight;
    var vh = window.innerHeight;
    // Container mit overflow:hidden, damit Randobjekte keinen horizontalen Scroll erzeugen
    var layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:absolute;left:0;top:0;width:100%;height:" + docH + "px;overflow:hidden;pointer-events:none;";
    document.body.appendChild(layer);
    for (var i = 0; i < floaterCount; i++) {
      var f = document.createElement("div");
      f.className = "obj3d obj3d--floater";
      var left = i % 2 === 0;
      // Auf dem Handy halb aus dem Bild ragen lassen, damit der Text frei bleibt
      // meist am Rand, jedes vierte Objekt frei im Raum
      var x = i % 4 === 3 ? rand(25, 65) : left ? (isMobile ? rand(-6, 10) : rand(2, 14)) : (isMobile ? rand(70, 86) : rand(80, 92));
      f.style.left = x + "vw";
      f.style.top = Math.round(vh * 0.1 + (docH - vh * 0.6) * (i + Math.random() * 0.8) / floaterCount) + "px";
      var s = (isMobile ? rand(80, 120) : rand(90, 150)) * (i % 4 === 3 ? 0.7 : 1);
      f.style.width = s + "px";
      f.style.height = s + "px";
      layer.appendChild(f);
      addItem(f, pick(randomPool), rand(-0.7, 0.7));
    }
    resize();
    measure();
    smoothY = window.scrollY;
    window.addEventListener("load", measure);
    setInterval(measure, 1000); // Layout ändert sich z. B. durch nachladende Bilder
    requestAnimationFrame(frame);
  }

  /* ---------- Render-Loop ---------- */
  var W = 0, H = 0;
  function resize() {
    // Auf dem Handy ändert die ein-/ausfahrende Adressleiste nur die Höhe:
    // dann Canvas nur vergrößern, nie verkleinern – sonst springen die Objekte
    var w = window.innerWidth, h = window.innerHeight;
    var sameWidth = w === W;
    if (isTouch && sameWidth && h <= H) return;
    W = w;
    H = isTouch && sameWidth ? Math.max(h, H) : h;
    renderer.setSize(W, H); // setzt auch die CSS-Größe (wichtig bei iOS-Adressleiste)
    camera.left = -W / 2; camera.right = W / 2;
    camera.top = H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", function () { resize(); measure(); });

  // Maus (nur Desktop)
  var mouseX = 0, mouseY = 0, tx = 0, ty = 0;
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    tx = e.clientX / W - 0.5;
    ty = e.clientY / H - 0.5;
  });

  /* ---------- Glas-Konfetti / Splitter (Bildschirm-Koordinaten) ---------- */
  var MAXP = isMobile ? 220 : 360;
  var parts = [];
  var confettiGeo = new THREE.BoxGeometry(1, 0.55, 0.08);
  var confettiMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.1, metalness: 0, envMapIntensity: 0.6,
    transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide
  });
  var confetti = new THREE.InstancedMesh(confettiGeo, confettiMat, MAXP);
  var confettiGlint = new THREE.InstancedMesh(confettiGeo, glintMat, MAXP);
  confetti.renderOrder = 3; confettiGlint.renderOrder = 4;
  confetti.frustumCulled = false; confettiGlint.frustumCulled = false;
  var tmpO = new THREE.Object3D(), tmpC = new THREE.Color();
  for (var pi = 0; pi < MAXP; pi++) {
    tmpO.scale.setScalar(0); tmpO.updateMatrix();
    confetti.setMatrixAt(pi, tmpO.matrix); confettiGlint.setMatrixAt(pi, tmpO.matrix);
    confetti.setColorAt(pi, tmpC.set(0xffffff));
  }
  scene.add(confetti, confettiGlint);
  var confettiColors = [C.red, C.mint, C.butter, C.pink, C.blue, C.lilac, 0xffffff, C.gold];
  function spawn(p) {
    if (parts.length >= MAXP) parts.shift();
    p.rx = rand(0, 6); p.ry = rand(0, 6); p.rz = rand(0, 6);
    p.vrx = rand(-8, 8); p.vry = rand(-8, 8); p.vrz = rand(-4, 4);
    p.color = new THREE.Color(p.color || pick(confettiColors)).convertSRGBToLinear();
    parts.push(p);
  }
  fx.burst = function (x, y, n, color) {
    for (var i = 0; i < (n || 40); i++) {
      var a = rand(0, Math.PI * 2), sp = rand(150, 650);
      spawn({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200, g: 1100, drag: 1.2,
        size: rand(7, 15), life: rand(1.1, 1.8), age: 0, color: color });
    }
  };
  fx.rain = function () {
    var n = isMobile ? 120 : 220;
    for (var i = 0; i < n; i++) {
      spawn({ x: rand(0, W), y: -rand(20, H * 0.9), vx: rand(-40, 40), vy: rand(60, 160), g: 120, drag: 0.6,
        sway: rand(1.5, 3.5), swayAmp: rand(30, 80), size: rand(9, 18), life: 9, age: 0 });
    }
  };
  function updateParticles(dt) {
    var count = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.age += dt;
      p.vy += p.g * dt;
      p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt * 0.5;
      p.x += (p.vx + (p.sway ? Math.cos(p.age * p.sway) * p.swayAmp : 0)) * dt;
      p.y += p.vy * dt;
      p.rx += p.vrx * dt; p.ry += p.vry * dt; p.rz += p.vrz * dt;
      if (p.age > p.life || p.y > H + 60) parts.splice(i, 1);
    }
    for (i = 0; i < MAXP; i++) {
      var q = parts[i];
      if (q) {
        var fade = q.sway ? 1 : Math.min(1, (q.life - q.age) * 2);
        tmpO.position.set(q.x - W / 2, H / 2 - q.y, 200);
        tmpO.rotation.set(q.rx, q.ry, q.rz);
        tmpO.scale.setScalar(q.size * fade);
        confetti.setColorAt(i, q.color);
        count++;
      } else {
        tmpO.scale.setScalar(0);
      }
      tmpO.updateMatrix();
      confetti.setMatrixAt(i, tmpO.matrix);
      confettiGlint.setMatrixAt(i, tmpO.matrix);
    }
    confetti.instanceMatrix.needsUpdate = true;
    confettiGlint.instanceMatrix.needsUpdate = true;
    if (confetti.instanceColor) confetti.instanceColor.needsUpdate = true;
    return count > 0;
  }

  /* ---------- Lichtpunkte der Discokugel (über die ganze Seite) ---------- */
  var dotLayer = document.createElement("div");
  dotLayer.className = "disco-dots";
  dotLayer.setAttribute("aria-hidden", "true");
  document.body.appendChild(dotLayer);
  var dots = [];
  function discoLights(x, y) {
    var colors = ["#ffffff", "#f6e7a8", "#7fe0b5", "#ebcdf0", "#ff8fc7", "#9fb0ff"];
    for (var i = 0; i < (isMobile ? 28 : 46); i++) {
      var el = document.createElement("span");
      var s = rand(5, 14);
      el.style.width = el.style.height = s + "px";
      el.style.background = pick(colors);
      el.style.boxShadow = "0 0 " + s * 1.5 + "px " + el.style.background;
      dotLayer.appendChild(el);
      dots.push({ el: el, x: x, y: y, a: rand(0, Math.PI * 2), r: rand(10, 40), vr: rand(120, 420), va: rand(0.5, 1.2), age: 0, life: rand(2.5, 4) });
    }
  }
  function updateDots(dt) {
    for (var i = dots.length - 1; i >= 0; i--) {
      var d = dots[i];
      d.age += dt;
      d.r += d.vr * dt; d.a += d.va * dt;
      var k = d.age / d.life;
      d.el.style.transform = "translate(" + (d.x + Math.cos(d.a) * d.r) + "px," + (d.y + Math.sin(d.a) * d.r * 0.7) + "px)";
      d.el.style.opacity = Math.max(0, k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
      if (k >= 1) { d.el.remove(); dots.splice(i, 1); }
    }
    return dots.length > 0;
  }

  /* ---------- Antippen: Ballons platzen, Discokugel funkelt, Gitarre klingt ---------- */
  var raycaster = new THREE.Raycaster();
  var popped = [];
  function itemOf(o) {
    while (o) {
      for (var i = 0; i < items.length; i++) if (items[i].obj === o) return items[i];
      o = o.parent;
    }
    return null;
  }
  window.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("a, button, input, textarea, .scratch__card")) return;
    var ndc = new THREE.Vector2((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    var targets = items.filter(function (it) { return it.obj.visible; }).map(function (it) { return it.obj; });
    var hit = raycaster.intersectObjects(targets, true).filter(function (h) { return h.object.visible; })[0];
    if (!hit) return;
    var it = itemOf(hit.object);
    if (!it) return;
    // Ballon? -> platzen lassen
    var b = hit.object;
    while (b && !b.userData.isBalloon) b = b.parent;
    if (b && b.visible) {
      var wp = b.getWorldPosition(new THREE.Vector3());
      b.visible = false;
      popped.push({ g: b, back: performance.now() + 5000 });
      fx.burst(wp.x + W / 2, H / 2 - wp.y, 34, b.userData.color);
      popSound();
      return;
    }
    if (it.type === "disco") {
      it.boost = 9;
      discoLights(e.clientX, e.clientY);
    } else if (it.type === "guitar") {
      it.shake = 1;
      strum();
    } else {
      it.boost = 6;
    }
  });
  // Konfetti-Regen beim Abschluss (und nochmal beim Antippen der Überschrift)
  var outroTitle = document.querySelector(".outro__title");
  if (outroTitle) {
    var rained = false;
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !rained) { rained = true; fx.rain(); }
    }, { threshold: 0.6 }).observe(outroTitle);
    outroTitle.addEventListener("click", function () { fx.rain(); });
  }

  /* ---------- Render-Schleife ---------- */
  var clock = new THREE.Clock();
  var lastNow = performance.now();
  function easeOutBack(k) { var c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
  function frame() {
    requestAnimationFrame(frame);
    var now = performance.now();
    var dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    var t = clock.getElapsedTime() * (reduceMotion ? 0.3 : 1);
    var scroll = window.scrollY;
    // geglättete Scrollposition: Objekte gleiten weich hinterher statt zu zittern
    var k = 1 - Math.pow(0.7, dt * 60);
    smoothY += (scroll - smoothY) * k;
    if (Math.abs(scroll - smoothY) < 0.3) smoothY = scroll;
    mouseX += (tx - mouseX) * 0.06;
    mouseY += (ty - mouseY) * 0.06;
    var anyVisible = false;
    items.forEach(function (it) {
      // Position aus dem Cache (Seitenkoordinaten) statt Layout-Abfrage pro Frame
      var cx = it.px - window.scrollX;
      var cy = it.py - smoothY;
      var size = it.size;
      var r = { width: it.w };
      var y, roll = null;
      if (it.ride) {
        // Fahrrad fährt beim Scrollen durch den Abschnitt von links nach rechts
        // Fortschritt: Anker kommt unten rein (0) bis er oben rausgeht (1)
        var p = (H + size * 0.6 - cy) / (H + size * 1.2);
        p = Math.max(0, Math.min(1, (p - 0.08) / 0.84));
        cx = -size * 1.1 + (W + size * 2.2) * p;
        y = cy;
        roll = -cx / (size * 0.47);
      } else {
        var offset = (cy - H / 2) * it.speed;
        y = cy - offset;
      }
      var visible = y + size > -80 && y - size < H + 80 && r.width > 0;
      it.obj.visible = visible;
      if (!visible) return;
      anyVisible = true;
      var o = it.obj;
      o.position.set(cx - W / 2 + (it.ride ? 0 : mouseX * 24 * it.speed), H / 2 - y + (it.ride ? Math.abs(Math.sin(roll * 0.5)) * -3 : Math.sin(t * 1.2 + it.phase) * 6), 0);
      o.scale.setScalar(size);
      // Extra-Drehung nach Antippen
      it.boost = (it.boost || 0) * Math.pow(0.35, dt);
      it.extra = (it.extra || 0) + it.boost * dt;
      it.shake = (it.shake || 0) * Math.pow(0.08, dt);
      var scrollRot = scroll * 0.0025 * Math.sign(it.spin);
      o.rotation.x = it.tilt + mouseY * 0.5;
      if (it.ride) {
        o.rotation.set(0.12 + mouseY * 0.2, 0.3 + mouseX * 0.4, 0);
      } else if (it.sway) {
        o.rotation.y = Math.sin(t * 0.5 + it.phase) * 0.6 + mouseX * 0.8 + scrollRot * 0.3 + it.extra;
        o.rotation.z = Math.sin(t * 0.7 + it.phase) * 0.05 + Math.sin(now * 0.06) * 0.06 * it.shake;
      } else {
        o.rotation.y = t * it.spin + scrollRot + mouseX * 0.6 + it.extra;
        o.rotation.z = it.tilt * 0.4;
      }
      if (it.type === "bike" && it.inner.userData.wheels) {
        if (roll === null) roll = -(scroll * 0.01 + t * 0.6);
        it.inner.userData.wheels.forEach(function (w) { w.rotation.z = roll; });
        it.inner.userData.crank.rotation.z = roll * 0.45;
      }
    });
    // geplatzte Ballons kommen wieder
    for (var i = popped.length - 1; i >= 0; i--) {
      var pb = popped[i], g = pb.g, base = g.userData.baseScale || 1;
      if (now < pb.back) continue;
      g.visible = true;
      var k = Math.min(1, (now - pb.back) / 450);
      g.scale.setScalar(base * Math.max(0.001, easeOutBack(k)));
      if (k >= 1) popped.splice(i, 1);
    }
    var particles = updateParticles(dt);
    var lights = updateDots(dt);
    if (anyVisible || particles || frame.drawnEmpty !== true) {
      renderer.render(scene, camera);
      frame.drawnEmpty = !anyVisible && !particles;
    }
    void lights;
  }

  // Erst bauen, wenn die Schriften da sind (für Text auf Etiketten), spätestens nach 1,5 s
  var started = false;
  function start() { if (!started) { started = true; init(); } }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  setTimeout(start, 1500);
})();

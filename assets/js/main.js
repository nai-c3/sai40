/* Simon wird 40 – Einblendungen + detaillierte 3D-Parallax-Objekte (Three.js) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 720px)").matches;

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

  // Ziffern-Konturen für Folienballons / Torten-Topper
  function digitShape(d) {
    var s = new THREE.Shape();
    if (d === "0") {
      s.absellipse(0, 0, 0.62, 1, 0, Math.PI * 2, false, 0);
      var h = new THREE.Path();
      h.absellipse(0, 0, 0.27, 0.6, 0, Math.PI * 2, true, 0);
      s.holes.push(h);
    } else { // "4"
      [[0.32, -1], [0.72, -1], [0.72, -0.48], [0.98, -0.48], [0.98, -0.12], [0.72, -0.12], [0.72, 1], [0.34, 1], [-0.78, -0.08], [-0.78, -0.48], [0.32, -0.48]]
        .forEach(function (p, i) { if (i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]); });
      s.closePath();
      var t = new THREE.Path();
      t.moveTo(-0.26, -0.12); t.lineTo(0.32, 0.5); t.lineTo(0.32, -0.12); t.closePath();
      s.holes.push(t);
    }
    return s;
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
        ctx.font = "160px Anton, Impact, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("SIMON 40   SIMON 40", 20, h / 2 + 8);
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

    /* Folienballons "40" mit Ringelschnüren */
    forty: function () {
      var g = new THREE.Group();
      var foilA = std(C.gold, { metalness: 1, roughness: 0.16 });
      var foilB = std(0xe7b9ff, { metalness: 1, roughness: 0.16 });
      var four = extrude(digitShape("4"), 0.12, 0.2, foilA, 8);
      four.position.set(-0.85, 0.15, 0); four.rotation.z = 0.08;
      var zero = extrude(digitShape("0"), 0.12, 0.2, foilB, 8);
      zero.position.set(0.82, 0, 0); zero.rotation.z = -0.08;
      g.add(four, zero);
      [[-0.85, -0.9], [0.82, -1.05]].forEach(function (p) {
        var pts = [];
        for (var i = 0; i <= 60; i++) {
          var t = i / 60;
          pts.push(v(p[0] + Math.sin(t * 20) * 0.06 + t * 0.1, p[1] - t * 1.1, Math.cos(t * 20) * 0.06));
        }
        g.add(pipe(pts, 0.012, std(0xffffff, { roughness: 0.5 }), false, 200));
        var knot = mesh(new THREE.ConeGeometry(0.06, 0.12, 12), foilA);
        knot.position.set(p[0], p[1] + 0.02, 0);
        knot.rotation.x = Math.PI;
        g.add(knot);
      });
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

    /* Zweistöckige Torte mit Glasur-Tropfen, Streuseln, Kerzen und "40"-Topper */
    cake: function () {
      var g = new THREE.Group();
      var sponge = lacquer(C.cream, { roughness: 0.6, clearcoat: 0.2 });
      var icing = lacquer(C.pink, { roughness: 0.2 });
      function tier(r, h, y) {
        var t = lathe([[0, y], [r - 0.04, y], [r, y + 0.03], [r, y + h - 0.04], [r - 0.04, y + h], [0, y + h]], sponge, 72);
        g.add(t);
        var top = lathe([[0, y + h + 0.03], [r - 0.02, y + h + 0.025], [r + 0.025, y + h - 0.02], [r + 0.02, y + h - 0.06], [0, y + h - 0.06]], icing, 72);
        g.add(top);
        var drips = 26;
        for (var i = 0; i < drips; i++) {
          var a = (i / drips) * Math.PI * 2 + rand(-0.05, 0.05);
          var len = rand(0.08, h * 0.65);
          var d = mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 10), icing);
          d.position.set(Math.cos(a) * (r + 0.012), y + h - len / 2 - 0.02, Math.sin(a) * (r + 0.012));
          g.add(d);
          var tip = mesh(new THREE.SphereGeometry(0.035, 10, 8), icing);
          tip.position.set(d.position.x, y + h - len - 0.02, d.position.z);
          g.add(tip);
        }
        // Perlenrand unten
        var beads = 40;
        g.add(scatter(new THREE.SphereGeometry(0.035, 10, 8), lacquer(0xffffff, { roughness: 0.25 }), beads, function (o, i) {
          var a = (i / beads) * Math.PI * 2;
          o.position.set(Math.cos(a) * (r + 0.02), y + 0.035, Math.sin(a) * (r + 0.02));
        }));
      }
      tier(1, 0.6, -0.9);
      tier(0.68, 0.48, -0.25);
      // Streusel
      var colors = [C.blue, C.red, C.mint, C.butter, 0xffffff];
      g.add(scatter(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6), lacquer(0xffffff), 90, function (o) {
        var a = rand(0, Math.PI * 2), rr = Math.sqrt(Math.random()) * 0.6;
        o.position.set(Math.cos(a) * rr, 0.26, Math.sin(a) * rr);
        o.rotation.set(Math.PI / 2, 0, rand(0, Math.PI));
        return pick(colors);
      }));
      // Kerzen mit Streifen + Flammen
      var stripe = canvasTex(64, 256, function (ctx, w, h) {
        for (var i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? "#ffffff" : "#2b3df5"; ctx.fillRect(0, i * 16, w, 16); }
      });
      stripe.wrapS = THREE.RepeatWrapping;
      [[-0.45, 0.2], [0.42, -0.25], [-0.15, -0.48], [0.25, 0.42]].forEach(function (p, i) {
        var candle = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 16), lacquer(0xffffff, { map: stripe }));
        candle.position.set(p[0], 0.4, p[1]);
        candle.rotation.y = i;
        g.add(candle);
        var flame = lathe([[0, 0], [0.03, 0.03], [0.035, 0.07], [0.02, 0.12], [0, 0.16]], std(0xffc04d, { emissive: 0xff9a1f, emissiveIntensity: 2 }), 16);
        flame.position.set(p[0], 0.58, p[1]);
        g.add(flame);
      });
      // Topper "40"
      var topper = new THREE.Group();
      var t4 = extrude(digitShape("4"), 0.05, 0.03, M.gold, 3); t4.scale.setScalar(0.22); t4.position.x = -0.15;
      var t0 = extrude(digitShape("0"), 0.05, 0.03, M.gold, 3); t0.scale.setScalar(0.22); t0.position.x = 0.15;
      topper.add(t4, t0);
      topper.add(rod(v(-0.15, -0.2), v(-0.15, -0.45), 0.008, M.gold));
      topper.add(rod(v(0.15, -0.2), v(0.15, -0.45), 0.008, M.gold));
      topper.position.y = 0.7;
      g.add(topper);
      return g;
    },

    /* Latexballon mit Knoten, Glanz und Ringelschnur */
    balloon: function (color) {
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
      var s = [];
      for (var k = 0; k <= 80; k++) {
        var u = k / 80;
        s.push(v(Math.sin(u * 26) * 0.05 * (1 - u * 0.4) + u * 0.2, -1.18 - u * 1.3, Math.cos(u * 26) * 0.05));
      }
      g.add(pipe(s, 0.008, std(0xffffff, { roughness: 0.5 }), false, 240));
      return g;
    },

    /* Geschenk mit Muster, Deckel, Schleife und Anhänger */
    gift: function () {
      var g = new THREE.Group();
      var paper = canvasTex(512, 512, function (ctx, w, h) {
        ctx.fillStyle = "#2b3df5"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#ebcdf0";
        for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
          ctx.beginPath(); ctx.arc(x * 64 + (y % 2) * 32 + 16, y * 64 + 32, 9, 0, Math.PI * 2); ctx.fill();
        }
      });
      var pm = lacquer(0xffffff, { map: paper, roughness: 0.4, clearcoat: 0.5 });
      var box = mesh(new THREE.BoxGeometry(1.4, 1.05, 1.4), pm);
      box.position.y = -0.1;
      g.add(box);
      var lid = mesh(new THREE.BoxGeometry(1.5, 0.25, 1.5), pm);
      lid.position.y = 0.52;
      g.add(lid);
      var rib = lacquer(C.butter, { roughness: 0.25, clearcoat: 1 });
      g.add(mesh(new THREE.BoxGeometry(1.52, 1.32, 0.22), rib));
      g.add(mesh(new THREE.BoxGeometry(0.22, 1.32, 1.52), rib));
      g.children[g.children.length - 1].position.y = 0.02;
      g.children[g.children.length - 2].position.y = 0.02;
      // Schleife aus Bandschlaufen
      [-1, 1].forEach(function (s) {
        g.add(pipe([v(0, 0.68), v(s * 0.25, 0.95, 0.12), v(s * 0.55, 0.85, 0.05), v(s * 0.5, 0.7, -0.08), v(s * 0.2, 0.7, -0.05), v(0, 0.68)], 0.06, rib, true, 64));
        g.add(pipe([v(0, 0.66), v(s * 0.2, 0.66, 0.35), v(s * 0.35, 0.65, 0.6)], 0.05, rib, false, 24));
      });
      var knot = mesh(new THREE.SphereGeometry(0.12, 16, 12), rib);
      knot.position.y = 0.7;
      g.add(knot);
      var tagTex = canvasTex(256, 128, function (ctx, w, h) {
        ctx.fillStyle = "#fbf3e2"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#ff4f2e"; ctx.font = "64px Anton, Impact, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("SIMON", w / 2, h / 2 + 4);
      });
      var tag = mesh(new THREE.BoxGeometry(0.42, 0.22, 0.01), [std(C.cream), std(C.cream), std(C.cream), std(C.cream), std(0xffffff, { map: tagTex }), std(C.cream)]);
      tag.position.set(0.45, 0.25, 0.76);
      tag.rotation.z = -0.25;
      g.add(tag);
      return g;
    },

    /* Partyhut mit Muster, Fransenrand und flauschigem Bommel */
    hat: function () {
      var g = new THREE.Group();
      var tex = canvasTex(512, 512, function (ctx, w, h) {
        ctx.fillStyle = "#ff4f2e"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#f6e7a8";
        for (var i = -8; i < 16; i += 2) {
          ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 + 32, 0); ctx.lineTo(i * 32 + 32 + 256, h); ctx.lineTo(i * 32 + 256, h); ctx.fill();
        }
        ctx.fillStyle = "#2b3df5";
        for (var k = 0; k < 40; k++) { ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, 7, 0, Math.PI * 2); ctx.fill(); }
      });
      var cone = mesh(new THREE.ConeGeometry(0.72, 1.8, 64, 1, true), lacquer(0xffffff, { map: tex, side: THREE.DoubleSide, clearcoat: 0.6 }));
      g.add(cone);
      var fringeColors = [C.mint, C.butter, C.lilac];
      g.add(scatter(new THREE.SphereGeometry(0.075, 8, 6), std(0xffffff, { roughness: 0.9 }), 90, function (o, i) {
        var a = (i / 90) * Math.PI * 2 * 2;
        o.position.set(Math.cos(a) * 0.73, -0.9 + (i % 2) * 0.05, Math.sin(a) * 0.73);
        o.scale.set(1, rand(0.8, 1.4), 1);
        return pick(fringeColors);
      }));
      g.add(scatter(new THREE.SphereGeometry(0.05, 8, 6), std(0xffffff, { roughness: 1 }), 140, function (o) {
        var dir = v(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.08, 0.2));
        o.position.set(dir.x, 0.98 + dir.y, dir.z);
        return pick([0xffffff, C.mint, 0xd8fff0]);
      }));
      g.rotation.z = 0.2;
      return g;
    },

    /* Schlüssel mit Anhänger (für die Unterkunft) */
    key: function () {
      var g = new THREE.Group();
      var s = new THREE.Shape();
      s.absarc(0, 0, 0.42, 0, Math.PI * 2, false);
      s.holes.push(circleHole(0, 0.05, 0.16));
      var bow = extrude(s, 0.08, 0.04, M.brass, 4);
      bow.position.x = -0.95;
      g.add(bow);
      var shaft = new THREE.Shape();
      [[-0.6, -0.07], [0.95, -0.07], [0.95, -0.35], [0.85, -0.35], [0.85, -0.25], [0.75, -0.25], [0.75, -0.38], [0.62, -0.38], [0.62, -0.25], [0.5, -0.25], [0.5, -0.32], [0.4, -0.32], [0.4, -0.07], [0.4, 0.07], [-0.6, 0.07]]
        .forEach(function (p, i) { if (i) shaft.lineTo(p[0], p[1]); else shaft.moveTo(p[0], p[1]); });
      var sh = mesh(new THREE.ExtrudeGeometry(shaft, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3 }), M.brass);
      sh.position.z = -0.04;
      g.add(sh);
      var collar = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 32), M.brass);
      collar.rotation.z = Math.PI / 2; collar.position.x = -0.55;
      g.add(collar);
      var ring = mesh(new THREE.TorusGeometry(0.28, 0.03, 12, 48), M.steel);
      ring.position.set(-1.2, 0.35, 0); ring.rotation.y = 1.2;
      g.add(ring);
      var tagTex = canvasTex(512, 256, function (ctx, w, h) {
        ctx.fillStyle = "#ff4f2e"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#fbf3e2"; ctx.font = "92px Anton, Impact, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("ZIMMER 40", w / 2, h / 2 + 6);
      });
      var tagShape = new THREE.Shape();
      tagShape.moveTo(-0.5, -0.25); tagShape.lineTo(0.35, -0.25); tagShape.lineTo(0.55, 0); tagShape.lineTo(0.35, 0.25); tagShape.lineTo(-0.5, 0.25); tagShape.closePath();
      tagShape.holes.push(circleHole(0.38, 0, 0.06));
      var tagGeo = new THREE.ExtrudeGeometry(tagShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 });
      tagGeo.center();
      // UVs der Vorderseite auf den Text mappen
      var uv = tagGeo.attributes.uv, pos = tagGeo.attributes.position;
      for (var i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.55) / 1.1, (pos.getY(i) + 0.27) / 0.54);
      var tag = mesh(tagGeo, [lacquer(0xffffff, { map: tagTex, clearcoat: 0.3 }), lacquer(C.red)]);
      tag.position.set(-1.65, 0.75, 0);
      tag.rotation.z = -0.9;
      g.add(tag);
      return g;
    },

    /* Donut mit Glasur und bunten Streuseln */
    donut: function () {
      var g = new THREE.Group();
      g.add(mesh(new THREE.TorusGeometry(0.72, 0.36, 32, 64), std(0xd99a5b, { roughness: 0.75 })));
      var ice = mesh(new THREE.TorusGeometry(0.72, 0.33, 32, 64, Math.PI * 2), lacquer(C.pink, { roughness: 0.2 }));
      ice.scale.z = 0.75; ice.position.z = 0.12;
      g.add(ice);
      var colors = [C.blue, C.mint, C.butter, 0xffffff, C.red];
      g.add(scatter(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 6), lacquer(0xffffff), 110, function (o) {
        var a = rand(0, Math.PI * 2), b = rand(0.25, Math.PI - 0.25);
        var R = 0.72 + Math.cos(b) * 0.33, z = 0.12 + Math.sin(b) * 0.33 * 0.75;
        o.position.set(Math.cos(a) * R, Math.sin(a) * R, z + 0.01);
        o.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
        return pick(colors);
      }));
      return g;
    },

    /* Goldstern */
    star: function () {
      var s = new THREE.Shape();
      for (var i = 0; i < 10; i++) {
        var r = i % 2 ? 0.45 : 1, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      s.closePath();
      return extrude(s, 0.12, 0.14, M.gold, 6);
    }
  };
  var randomPool = ["donut", "star", "bell", "balloon", "hat", "gift", "disco", "bottle", "star"];
  var swayTypes = { bike: 1, forty: 1, key: 1, star: 0 };

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
    var obj = normalize(inner);
    scene.add(obj);
    items.push({
      el: el, obj: obj, inner: inner, type: type, speed: speed,
      spinAxis: type === "wheel" ? "z" : "y",
      sway: !!swayTypes[type],
      spin: (0.25 + Math.random() * 0.35) * (Math.random() < 0.5 ? -1 : 1),
      tilt: (Math.random() - 0.5) * 0.5,
      phase: Math.random() * Math.PI * 2
    });
  }

  function init() {
    document.querySelectorAll(".obj3d").forEach(function (el) {
      addItem(el, el.dataset.obj, parseFloat(el.dataset.speed || "0.2"));
    });

    // Zufällig verstreute kleinere Objekte am Seitenrand
    var floaterCount = isMobile ? 6 : 12;
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
      f.style.left = left ? (isMobile ? rand(-10, 2) : rand(2, 12)) + "vw" : (isMobile ? rand(80, 90) : rand(84, 92)) + "vw";
      f.style.top = Math.round(vh * 0.9 + (docH - vh * 1.5) * (i + Math.random() * 0.8) / floaterCount) + "px";
      var s = isMobile ? rand(70, 100) : rand(70, 120);
      f.style.width = s + "px";
      f.style.height = s + "px";
      layer.appendChild(f);
      addItem(f, pick(randomPool), rand(-0.5, 0.5));
    }
    resize();
    requestAnimationFrame(frame);
  }

  /* ---------- Render-Loop ---------- */
  var W = 0, H = 0;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H); // setzt auch die CSS-Größe (wichtig bei iOS-Adressleiste)
    camera.left = -W / 2; camera.right = W / 2;
    camera.top = H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  // Maus (Desktop) bzw. Neigung (Handy, wo ohne Nachfrage erlaubt)
  var mouseX = 0, mouseY = 0, tx = 0, ty = 0;
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    tx = e.clientX / W - 0.5;
    ty = e.clientY / H - 0.5;
  });
  window.addEventListener("deviceorientation", function (e) {
    if (e.gamma == null) return;
    tx = Math.max(-0.5, Math.min(0.5, e.gamma / 60));
    ty = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 60));
  });

  var clock = new THREE.Clock();
  var lastScroll = window.scrollY, scrollVel = 0;
  function frame() {
    requestAnimationFrame(frame);
    var t = reduceMotion ? 0 : clock.getElapsedTime();
    var scroll = window.scrollY;
    scrollVel += ((scroll - lastScroll) - scrollVel) * 0.15;
    lastScroll = scroll;
    mouseX += (tx - mouseX) * 0.06;
    mouseY += (ty - mouseY) * 0.06;
    var anyVisible = false;
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      // Parallax: Versatz relativ zur Bildschirmmitte
      var offset = reduceMotion ? 0 : (cy - H / 2) * it.speed;
      var y = cy - offset;
      var size = Math.max(r.width, r.height) * 0.5;
      var visible = y + size > -80 && y - size < H + 80 && r.width > 0;
      it.obj.visible = visible;
      if (!visible) return;
      anyVisible = true;
      it.obj.position.set(cx - W / 2 + mouseX * 24 * it.speed, H / 2 - y + Math.sin(t * 1.2 + it.phase) * 6, 0);
      it.obj.scale.setScalar(size);
      var scrollRot = scroll * 0.0025 * Math.sign(it.spin);
      var o = it.obj;
      o.rotation.x = it.tilt + mouseY * 0.5;
      if (it.spinAxis === "z") {
        o.rotation.y = 0.55 + mouseX * 0.6;
        o.rotation.z = t * it.spin * 2 + scrollRot * 2;
      } else if (it.sway) {
        o.rotation.y = Math.sin(t * 0.5 + it.phase) * 0.6 + mouseX * 0.8 + scrollRot * 0.3;
        o.rotation.z = Math.sin(t * 0.7 + it.phase) * 0.05;
      } else {
        o.rotation.y = t * it.spin + scrollRot + mouseX * 0.6;
        o.rotation.z = it.tilt * 0.4;
      }
      // Fahrrad: Räder drehen sich mit, wenn gescrollt wird
      if (it.type === "bike" && it.inner.userData.wheels) {
        var roll = -(scroll * 0.01 + t * 0.6);
        it.inner.userData.wheels.forEach(function (w) { w.rotation.z = roll; });
        it.inner.userData.crank.rotation.z = roll * 0.45;
      }
    });
    if (anyVisible || frame.drawnEmpty !== true) {
      renderer.render(scene, camera);
      frame.drawnEmpty = !anyVisible;
    }
  }

  // Erst bauen, wenn die Schriften da sind (für Text auf Etiketten), spätestens nach 1,5 s
  var started = false;
  function start() { if (!started) { started = true; init(); } }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  setTimeout(start, 1500);
})();

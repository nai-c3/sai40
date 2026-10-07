/* Simon wird 40 – Einblendungen + 3D-Parallax-Objekte (Three.js) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- 3D ---------- */
  if (!window.THREE) return;
  var canvas = document.getElementById("scene3d");
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (err) {
    return; // kein WebGL – Seite funktioniert trotzdem
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  // Orthografische Kamera in Pixel-Einheiten: 1 Einheit = 1 CSS-Pixel
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -3000, 3000);
  camera.position.z = 1000;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 0.9));
  var sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(-400, 600, 800);
  scene.add(sun);
  var rim = new THREE.DirectionalLight(0xffd9c4, 0.4);
  rim.position.set(600, -300, 400);
  scene.add(rim);

  /* ---------- Materialien & Helfer ---------- */
  var C = {
    blue: 0x2b3df5, butter: 0xf6e7a8, red: 0xff4f2e, ink: 0x10172e,
    green: 0x1f4b3a, mint: 0x7fe0b5, lilac: 0xebcdf0, cream: 0xfbf3e2,
    silver: 0xd7dbe3, amber: 0xf2a33a, pink: 0xff8fc7, white: 0xffffff
  };
  function mat(color, opts) {
    var o = { color: color, roughness: 0.45, metalness: 0.05 };
    for (var k in opts) o[k] = opts[k];
    return new THREE.MeshStandardMaterial(o);
  }
  function mesh(geo, m) { return new THREE.Mesh(geo, m); }
  // Zylinder zwischen zwei Punkten (für Rahmenrohre, Speichen …)
  function tube(a, b, r, m) {
    var dir = new THREE.Vector3().subVectors(b, a);
    var t = mesh(new THREE.CylinderGeometry(r, r, dir.length(), 10), m);
    t.position.copy(a).addScaledVector(dir, 0.5);
    t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return t;
  }
  function v(x, y, z) { return new THREE.Vector3(x, y, z || 0); }
  function stripeTexture(c1, c2, n) {
    var cv = document.createElement("canvas");
    cv.width = 64; cv.height = 256;
    var ctx = cv.getContext("2d");
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? c2 : c1;
      ctx.fillRect(0, (256 / n) * i, 64, 256 / n);
    }
    var tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /* ---------- Objekt-Baukasten ---------- */
  var builders = {
    wheel: function (r) {
      var g = new THREE.Group();
      r = r || 1;
      g.add(mesh(new THREE.TorusGeometry(r, r * 0.08, 14, 48), mat(C.ink, { roughness: 0.8 })));
      g.add(mesh(new THREE.TorusGeometry(r * 0.9, r * 0.03, 8, 48), mat(C.silver, { metalness: 0.6, roughness: 0.3 })));
      var spokeMat = mat(C.silver, { metalness: 0.6, roughness: 0.3 });
      for (var i = 0; i < 18; i++) {
        var a = (i / 18) * Math.PI * 2;
        g.add(tube(v(0, 0, (i % 2 ? 0.06 : -0.06) * r), v(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88), r * 0.008, spokeMat));
      }
      var hub = mesh(new THREE.CylinderGeometry(r * 0.08, r * 0.08, r * 0.22, 16), mat(C.red));
      hub.rotation.x = Math.PI / 2;
      g.add(hub);
      return g;
    },
    bike: function () {
      var g = new THREE.Group();
      var frame = mat(C.red, { roughness: 0.3 });
      var rear = v(-0.95, 0), front = v(0.95, 0), bb = v(-0.1, -0.05);
      var seat = v(-0.32, 0.78), head = v(0.62, 0.78);
      var w1 = builders.wheel(0.58); w1.position.copy(rear); g.add(w1);
      var w2 = builders.wheel(0.58); w2.position.copy(front); g.add(w2);
      [[rear, bb], [rear, seat], [seat, bb], [seat, head], [head, bb], [head, front]].forEach(function (p) {
        g.add(tube(p[0], p[1], 0.035, frame));
      });
      var stem = v(0.58, 0.98);
      g.add(tube(head, stem, 0.03, frame));
      g.add(tube(v(0.58, 0.98, -0.28), v(0.58, 0.98, 0.28), 0.03, mat(C.ink)));
      g.add(tube(seat, v(-0.36, 0.92), 0.025, mat(C.silver)));
      var saddle = mesh(new THREE.BoxGeometry(0.32, 0.06, 0.14), mat(C.ink));
      saddle.position.set(-0.38, 0.95, 0);
      g.add(saddle);
      return g;
    },
    helmet: function () {
      var g = new THREE.Group();
      var shell = mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.mint, { side: THREE.DoubleSide }));
      shell.scale.set(1, 0.85, 1.25);
      g.add(shell);
      for (var i = -1; i <= 1; i++) {
        var vent = mesh(new THREE.TorusGeometry(0.75, 0.05, 6, 30, Math.PI), mat(C.ink));
        vent.rotation.y = Math.PI / 2;
        vent.position.x = i * 0.32;
        vent.scale.set(1, 1, 1.25);
        g.add(vent);
      }
      var visor = mesh(new THREE.BoxGeometry(1.4, 0.06, 0.4), mat(C.ink));
      visor.position.set(0, 0.12, 1.25);
      visor.rotation.x = 0.25;
      g.add(visor);
      return g;
    },
    bottle: function () {
      var g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.8, 32), mat(C.butter)));
      var band = mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.5, 32), mat(C.blue));
      g.add(band);
      var cap = mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.3, 32), mat(C.ink));
      cap.position.y = 1.05; g.add(cap);
      var nozzle = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.25, 16), mat(C.red));
      nozzle.position.y = 1.32; g.add(nozzle);
      return g;
    },
    beer: function () {
      var g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.62, 0.55, 1.6, 32), mat(C.amber, { roughness: 0.15, transparent: true, opacity: 0.92 })));
      var foamMat = mat(C.white, { roughness: 0.9 });
      for (var i = 0; i < 9; i++) {
        var a = (i / 9) * Math.PI * 2;
        var f = mesh(new THREE.SphereGeometry(0.28, 16, 12), foamMat);
        f.position.set(Math.cos(a) * 0.38, 0.85, Math.sin(a) * 0.38);
        g.add(f);
      }
      var top = mesh(new THREE.SphereGeometry(0.36, 16, 12), foamMat);
      top.position.y = 0.98; g.add(top);
      var handle = mesh(new THREE.TorusGeometry(0.38, 0.08, 10, 24, Math.PI), mat(C.amber, { roughness: 0.15 }));
      handle.rotation.z = -Math.PI / 2;
      handle.position.x = 0.6;
      g.add(handle);
      return g;
    },
    disco: function () {
      var g = new THREE.Group();
      g.add(mesh(new THREE.IcosahedronGeometry(1, 3), mat(C.silver, { flatShading: true, metalness: 0.5, roughness: 0.15 })));
      g.add(tube(v(0, 0.95), v(0, 1.6), 0.03, mat(C.ink)));
      return g;
    },
    cake: function () {
      var g = new THREE.Group();
      var base = mesh(new THREE.CylinderGeometry(1, 1, 0.7, 40), mat(C.cream));
      g.add(base);
      var icing = mesh(new THREE.TorusGeometry(1, 0.08, 8, 40), mat(C.pink));
      icing.rotation.x = Math.PI / 2; icing.position.y = 0.35; g.add(icing);
      var top = mesh(new THREE.CylinderGeometry(1, 1, 0.08, 40), mat(C.pink));
      top.position.y = 0.36; g.add(top);
      [-0.3, 0.3].forEach(function (x, i) {
        var candle = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12), mat(i ? C.blue : C.red));
        candle.position.set(x, 0.7, 0); g.add(candle);
        var flame = mesh(new THREE.ConeGeometry(0.07, 0.2, 10), mat(C.amber, { emissive: C.amber, emissiveIntensity: 0.8 }));
        flame.position.set(x, 1.1, 0); g.add(flame);
      });
      return g;
    },
    balloon: function () {
      var g = new THREE.Group();
      var b = mesh(new THREE.SphereGeometry(0.75, 32, 24), mat(C.red, { roughness: 0.2 }));
      b.scale.y = 1.18; b.position.y = 0.4; g.add(b);
      var knot = mesh(new THREE.ConeGeometry(0.1, 0.16, 12), mat(C.red));
      knot.position.y = -0.5; g.add(knot);
      g.add(tube(v(0, -0.55), v(0.12, -1.3), 0.012, mat(C.ink)));
      return g;
    },
    gift: function () {
      var g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(1.4, 1.1, 1.4), mat(C.blue)));
      var rib = mat(C.butter);
      g.add(mesh(new THREE.BoxGeometry(1.42, 1.12, 0.22), rib));
      g.add(mesh(new THREE.BoxGeometry(0.22, 1.12, 1.42), rib));
      [-1, 1].forEach(function (s) {
        var bow = mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 20), rib);
        bow.position.set(s * 0.2, 0.75, 0);
        bow.rotation.y = Math.PI / 2;
        bow.rotation.x = s * 0.5;
        g.add(bow);
      });
      return g;
    },
    hat: function () {
      var g = new THREE.Group();
      var cone = mesh(new THREE.ConeGeometry(0.75, 1.8, 40, 1, true), new THREE.MeshStandardMaterial({ map: stripeTexture("#ff4f2e", "#f6e7a8", 8), roughness: 0.6, side: THREE.DoubleSide }));
      g.add(cone);
      var pom = mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(C.mint));
      pom.position.y = 0.95; g.add(pom);
      return g;
    },
    tent: function () {
      var g = new THREE.Group();
      var t = mesh(new THREE.ConeGeometry(1.1, 1.3, 4), mat(C.amber, { flatShading: true }));
      t.rotation.y = Math.PI / 4; g.add(t);
      var door = mesh(new THREE.ConeGeometry(0.35, 0.7, 3), mat(C.ink, { flatShading: true }));
      door.position.set(0, -0.3, 0.58); g.add(door);
      return g;
    },
    donut: function () {
      var g = new THREE.Group();
      g.add(mesh(new THREE.TorusGeometry(0.75, 0.35, 20, 40), mat(0xd99a5b)));
      var ice = mesh(new THREE.TorusGeometry(0.75, 0.3, 20, 40), mat(C.pink, { roughness: 0.3 }));
      ice.position.z = 0.1; ice.scale.z = 0.9; g.add(ice);
      return g;
    },
    knot: function () { return mesh(new THREE.TorusKnotGeometry(0.7, 0.22, 100, 16), mat(C.mint, { roughness: 0.25 })); },
    gem: function () { return mesh(new THREE.OctahedronGeometry(1), mat(C.lilac, { flatShading: true })); }
  };
  var randomPool = ["wheel", "donut", "knot", "gem", "balloon", "hat", "gift", "bottle", "disco", "helmet"];

  // Objekt auf Größe "Radius 1" bringen und zentrieren
  function normalize(obj) {
    var wrap = new THREE.Group();
    wrap.add(obj);
    var box = new THREE.Box3().setFromObject(obj);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center);
    var s = 2 / Math.max(size.x, size.y, size.z);
    obj.scale.multiplyScalar(s);
    obj.position.multiplyScalar(s);
    return wrap;
  }

  /* ---------- Objekte an DOM-Anker hängen ---------- */
  var items = [];
  function addItem(el, type, speed, sizeFactor) {
    var build = builders[type] || builders[randomPool[Math.floor(Math.random() * randomPool.length)]];
    var obj = normalize(build());
    var spinAxis = type === "wheel" ? "z" : "y";
    scene.add(obj);
    items.push({
      el: el, obj: obj, speed: speed, size: sizeFactor || 0.5,
      spinAxis: spinAxis,
      spin: (0.2 + Math.random() * 0.4) * (Math.random() < 0.5 ? -1 : 1),
      tilt: (Math.random() - 0.5) * 0.6,
      phase: Math.random() * Math.PI * 2
    });
  }

  document.querySelectorAll(".obj3d").forEach(function (el) {
    addItem(el, el.dataset.obj, parseFloat(el.dataset.speed || "0.2"), 0.5);
  });

  // Zufällig verstreute kleine Objekte über die ganze Seite
  var floaterCount = window.innerWidth < 720 ? 7 : 14;
  var docH = document.documentElement.scrollHeight;
  for (var i = 0; i < floaterCount; i++) {
    var f = document.createElement("div");
    f.className = "obj3d";
    var side = Math.random() < 0.5;
    f.style.left = (side ? 2 + Math.random() * 14 : 82 + Math.random() * 12) + "vw";
    f.style.top = Math.round(window.innerHeight * 0.9 + (docH - window.innerHeight * 1.4) * (i + Math.random()) / floaterCount) + "px";
    var s = 50 + Math.random() * 60;
    f.style.width = s + "px";
    f.style.height = s + "px";
    document.body.appendChild(f);
    addItem(f, randomPool[Math.floor(Math.random() * randomPool.length)], (Math.random() - 0.5) * 1.2, 0.5);
  }

  /* ---------- Render-Loop ---------- */
  var W = 0, H = 0;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.left = -W / 2; camera.right = W / 2;
    camera.top = H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  var mouseX = 0, mouseY = 0;
  window.addEventListener("pointermove", function (e) {
    mouseX = e.clientX / W - 0.5;
    mouseY = e.clientY / H - 0.5;
  });

  var clock = new THREE.Clock();
  function frame() {
    var t = reduceMotion ? 0 : clock.getElapsedTime();
    var scroll = window.scrollY;
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      // Parallax: je höher "speed", desto stärker der Versatz zur Scrollposition
      var offset = reduceMotion ? 0 : (cy - H / 2) * it.speed;
      var y = cy - offset;
      var size = Math.max(r.width, r.height) * it.size;
      var visible = y + size > -50 && y - size < H + 50;
      it.obj.visible = visible;
      if (!visible) return;
      it.obj.position.set(cx - W / 2 + mouseX * 20 * it.speed, H / 2 - y + Math.sin(t + it.phase) * 8, 0);
      it.obj.scale.setScalar(size);
      var rot = t * it.spin + scroll * 0.002 * Math.sign(it.spin);
      it.obj.rotation.x = it.tilt + mouseY * 0.3;
      if (it.spinAxis === "z") {
        it.obj.rotation.y = 0.5 + mouseX * 0.4;
        it.obj.rotation.z = rot * 2;
      } else {
        it.obj.rotation.y = rot;
        it.obj.rotation.z = it.tilt * 0.4;
      }
    });
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

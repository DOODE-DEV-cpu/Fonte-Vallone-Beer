/* =========================================================
   Fonte Vallone — 3D scenes (three.js)
   A real-time bottle in the hero, and a scroll-driven
   showcase where the bottle turns into each beer.
   Exposes window.FVScene; everything degrades to a no-op
   when WebGL is unavailable.
   ========================================================= */
(() => {
  "use strict";

  const FVScene = (window.FVScene = {
    ok: false,
    init() { return false; },
    intro() {},
    setProgress() {},
  });

  const THREE = window.THREE;
  if (!THREE) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);

  const pointer = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ---------------------------------------------------------
     Shared textures
     --------------------------------------------------------- */
  // Studio lighting painted onto an equirectangular canvas, used for reflections.
  function studioEnvironment(renderer) {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, "#3a2f24");
    bg.addColorStop(0.5, "#0d0b08");
    bg.addColorStop(1, "#050403");
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
    const softbox = (x, y, w, h, color, blur) => {
      g.save();
      g.filter = `blur(${blur}px)`;
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
      g.restore();
    };
    softbox(120, 90, 90, 260, "#fff6e2", 14);   // key strip, left
    softbox(640, 60, 50, 300, "#ffd9a0", 12);   // warm strip, right
    softbox(860, 140, 120, 120, "#e3b56a", 30); // gold fill, behind
    softbox(380, 10, 260, 40, "#fffaf0", 20);   // overhead
    softbox(0, 430, 1024, 60, "#5a3d1e", 30);   // warm floor bounce
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose(); pmrem.dispose();
    return env;
  }

  function radialTexture(stops) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, col]) => grad.addColorStop(o, col));
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function spacedText(g, text, x, y, spacing) {
    const chars = [...text];
    const widths = chars.map((ch) => g.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = x - total / 2;
    g.save();
    g.textAlign = "left";
    chars.forEach((ch, i) => { g.fillText(ch, cx, y); cx += widths[i] + spacing; });
    g.restore();
  }

  // The paper label, drawn per beer.
  function labelTexture(beer, renderer) {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 812;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.redraw = () => { drawLabel(c, beer); tex.needsUpdate = true; };
    tex.redraw();
    return tex;
  }

  function drawLabel(c, beer) {
    const W = c.width, H = c.height;
    const g = c.getContext("2d");
    const serif = '"Cormorant Garamond", Georgia, serif';
    const sans = 'Manrope, "Helvetica Neue", Arial, sans-serif';
    const ink = beer.ink || "#1d1a14";

    const paper = g.createLinearGradient(0, 0, W, 0);
    paper.addColorStop(0, "#e6dcc6");
    paper.addColorStop(0.5, "#f7f1e4");
    paper.addColorStop(1, "#e2d7bf");
    g.fillStyle = paper; g.fillRect(0, 0, W, H);

    // paper grain
    g.globalAlpha = 0.05;
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = i % 2 ? "#000" : "#fff";
      g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    g.globalAlpha = 1;

    g.strokeStyle = "#b8924a"; g.lineWidth = 5;
    g.strokeRect(34, 34, W - 68, H - 68);
    g.lineWidth = 1.5;
    g.strokeRect(50, 50, W - 100, H - 100);

    // mountain mark
    g.strokeStyle = ink; g.lineWidth = 6; g.lineJoin = "round";
    g.beginPath();
    g.moveTo(392, 210); g.lineTo(462, 130); g.lineTo(504, 168); g.lineTo(556, 100); g.lineTo(654, 210);
    g.stroke();

    g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.font = `500 44px ${serif}`;
    spacedText(g, "FONTE VALLONE", W / 2, 290, 14);

    g.strokeStyle = "#b8924a"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(330, 326); g.lineTo(694, 326); g.stroke();

    g.font = `600 ${beer.name.length > 5 ? 150 : 176}px ${serif}`;
    spacedText(g, beer.name.toUpperCase(), W / 2, 494, 10);

    g.font = `italic 500 58px ${serif}`;
    g.fillText(beer.sub, W / 2, 574);

    g.font = `600 24px ${sans}`;
    g.globalAlpha = 0.75;
    spacedText(g, "PACENTRO · ABRUZZO · ITALIA", W / 2, 668, 7);
    spacedText(g, `${beer.style.toUpperCase()}  ·  ${beer.abv.toFixed(1)}% VOL  ·  33 CL`, W / 2, 716, 4);
    g.globalAlpha = 1;
  }

  // One set of label textures per renderer, redrawn once the web fonts arrive.
  function makeLabels(beers, renderer) {
    const labels = Object.fromEntries(beers.map((b) => [b.id, labelTexture(b, renderer)]));
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load('500 44px "Cormorant Garamond"'),
        document.fonts.load('600 150px "Cormorant Garamond"'),
        document.fonts.load('italic 500 58px "Cormorant Garamond"'),
        document.fonts.load("600 24px Manrope"),
      ]).then(() => Object.values(labels).forEach((t) => t.redraw())).catch(() => {});
    }
    return labels;
  }

  /* ---------------------------------------------------------
     The bottle
     --------------------------------------------------------- */
  const BOTTLE_H = 2.42;

  function bottleProfile() {
    const pts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.3, 0),
      new THREE.Vector2(0.335, 0.012),
      new THREE.Vector2(0.354, 0.045),
      new THREE.Vector2(0.36, 0.1),
      new THREE.Vector2(0.36, 1.22),
    ];
    // shoulder: an S-curve from body to neck
    for (let i = 1; i <= 26; i++) {
      const t = i / 26;
      pts.push(new THREE.Vector2(0.36 - (0.36 - 0.125) * smooth(t), 1.22 + 0.74 * t));
    }
    pts.push(
      new THREE.Vector2(0.123, 2.26),
      new THREE.Vector2(0.136, 2.29),
      new THREE.Vector2(0.14, 2.33),
      new THREE.Vector2(0.134, 2.36),
      new THREE.Vector2(0.122, 2.38),
      new THREE.Vector2(0, 2.38),
    );
    return pts;
  }

  function createBottle(env) {
    const group = new THREE.Group();
    const inner = new THREE.Group();
    inner.position.y = -BOTTLE_H / 2;
    group.add(inner);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x8a5a16,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMap: env,
      envMapIntensity: 2.3,
      emissive: 0x8a5a16,
      emissiveIntensity: 0.16,
    });
    const glass = new THREE.Mesh(new THREE.LatheGeometry(bottleProfile(), 96), glassMat);
    inner.add(glass);

    const labelMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0, envMap: env, envMapIntensity: 0.35 });
    const arc = 2.7;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.3635, 0.3635, 0.78, 96, 1, true, -arc / 2, arc), labelMat);
    label.position.y = 0.66;
    inner.add(label);

    const foilMat = new THREE.MeshStandardMaterial({ color: 0xd2a659, roughness: 0.28, metalness: 1, envMap: env, envMapIntensity: 1.3 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1285, 0.1305, 0.2, 48, 1, true), foilMat);
    band.position.y = 2.1;
    inner.add(band);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.146, 0.156, 0.075, 28), foilMat);
    cap.position.y = 2.395;
    inner.add(cap);
    const crimp = new THREE.Mesh(new THREE.TorusGeometry(0.154, 0.014, 8, 28), foilMat);
    crimp.rotation.x = Math.PI / 2;
    crimp.position.y = 2.36;
    inner.add(crimp);

    const glassColor = new THREE.Color(0x8a5a16);
    return {
      group,
      setLabel(tex) { labelMat.map = tex; labelMat.needsUpdate = true; },
      // ease the glass toward a colour (k = 1 snaps)
      tint(target, k) {
        glassColor.lerp(target, k);
        glassMat.color.copy(glassColor);
        glassMat.emissive.copy(glassColor);
      },
    };
  }

  function createBubbles(count, spread) {
    const pos = new Float32Array(count * 3);
    const meta = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread.x;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread.y;
      pos[i * 3 + 2] = -3.5 + Math.random() * 5;
      meta.push({ speed: 0.12 + Math.random() * 0.4, phase: Math.random() * TAU, x: pos[i * 3] });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: radialTexture([[0, "rgba(255,240,205,.0)"], [0.55, "rgba(255,236,190,.12)"], [0.8, "rgba(255,226,160,.9)"], [1, "rgba(255,226,160,0)"]]),
      size: 0.075,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    return {
      points,
      update(t, dt) {
        const half = spread.y / 2;
        for (let i = 0; i < count; i++) {
          const m = meta[i];
          let y = pos[i * 3 + 1] + m.speed * dt;
          if (y > half) y = -half;
          pos[i * 3 + 1] = y;
          pos[i * 3] = m.x + Math.sin(t * 0.9 + m.phase) * 0.06;
        }
        geo.attributes.position.needsUpdate = true;
      },
    };
  }

  function createGlow(color) {
    const mat = new THREE.SpriteMaterial({
      map: radialTexture([[0, "rgba(255,255,255,.55)"], [0.35, "rgba(255,255,255,.18)"], [1, "rgba(255,255,255,0)"]]),
      color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(5.2, 5.2, 1);
    sprite.position.z = -1.6;
    return sprite;
  }

  // The Maiella as a field of gold contour lines, drifting slowly past.
  function createTerrain() {
    const geo = new THREE.PlaneGeometry(46, 20, 92, 34);
    geo.rotateX(-Math.PI / 2);
    const base = geo.attributes.position.array.slice();
    const mat = new THREE.MeshBasicMaterial({ color: 0xc9a45c, wireframe: true, transparent: true, opacity: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, -2.9, -10);
    const height = (x, z, t) => {
      const amp = 0.25 + smooth(clamp(Math.abs(x) / 9, 0, 1)) * 2.6 + clamp(-z / 10, 0, 1) * 1.4;
      const n = Math.sin(x * 0.42 + t) * Math.cos(z * 0.36 - t * 0.4)
        + Math.sin(x * 1.05 + 1.3 - t * 0.6) * 0.45
        + Math.sin(z * 0.9 + x * 0.25) * 0.35;
      return Math.abs(n) * amp;
    };
    const update = (t) => {
      const p = geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) p[i + 1] = height(base[i], base[i + 2], t);
      geo.attributes.position.needsUpdate = true;
    };
    update(0);
    return { mesh, update };
  }

  /* ---------------------------------------------------------
     A canvas + renderer + scene that only renders while visible
     --------------------------------------------------------- */
  class Stage {
    constructor(canvas) {
      this.canvas = canvas;
      this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
      this.camera.position.set(0, 0, 7.6);
      this.visible = false;
      this.view = { w: 1, h: 1, aspect: 1 };
      this.onLayout = () => {};
      this.update = () => {};

      const key = new THREE.DirectionalLight(0xfff1d6, 2.2);
      key.position.set(-3, 4, 5);
      const rim = new THREE.DirectionalLight(0xe3b56a, 2.6);
      rim.position.set(4, 1.5, -4);
      this.scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.35));

      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: "80px" }).observe(canvas);
      this.resize();
    }
    resize() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      const vh = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z;
      this.view = { w: vh * (w / h), h: vh, aspect: w / h };
      this.onLayout(this.view);
    }
    render(t, dt) {
      this.update(t, dt);
      this.renderer.render(this.scene, this.camera);
    }
  }

  /* ---------------------------------------------------------
     Hero: a single bottle floating over Pacentro
     --------------------------------------------------------- */
  function heroScene(canvas, beers) {
    const stage = new Stage(canvas);
    const beer = beers[0];
    const labels = makeLabels([beer], stage.renderer);
    const env = studioEnvironment(stage.renderer);
    const bottle = createBottle(env);
    bottle.setLabel(labels[beer.id]);
    bottle.tint(new THREE.Color(beer.glass), 1);
    const glow = createGlow(new THREE.Color(beer.accent));
    const bubbles = createBubbles(90, { x: 9, y: 5.4 });
    stage.scene.add(glow, bubbles.points, bottle.group);

    const rest = { x: 0, y: 0, scale: 1, tilt: 0 };
    stage.onLayout = (v) => {
      if (v.aspect >= 1) {
        rest.x = v.w * 0.27; rest.y = -0.08; rest.scale = 1.34; rest.tilt = -0.13;
      } else {
        // phones: the bottle leans in from the right edge, behind the copy
        rest.x = v.w * 0.47; rest.y = -0.25; rest.scale = 1.28; rest.tilt = -0.2;
      }
    };
    stage.resize();

    let introAt = null;
    stage.intro = () => { if (introAt === null) introAt = performance.now(); };

    stage.update = (t, dt) => {
      const k = introAt === null ? 0 : easeOut(clamp((performance.now() - introAt - 500) / 2200, 0, 1));
      const scroll = clamp(window.scrollY / Math.max(window.innerHeight, 1), 0, 1.2);
      const g = bottle.group;
      g.visible = glow.visible = k > 0;
      g.position.x = rest.x;
      g.position.y = rest.y - (1 - k) * 3.2 + Math.sin(t * 0.8) * 0.045 + scroll * 0.9;
      g.scale.setScalar(rest.scale);
      g.rotation.z = rest.tilt + pointer.x * 0.05;
      g.rotation.x = pointer.y * 0.09;
      g.rotation.y = (1 - k) * -4.2 + Math.sin(t * 0.45) * 0.42 + pointer.x * 0.45 + scroll * 1.6;
      glow.position.set(g.position.x, g.position.y, -1.6);
      glow.material.opacity = k * 0.5;
      bubbles.update(t, dt);
    };
    return stage;
  }

  /* ---------------------------------------------------------
     Showcase: the bottle turns into each beer as you scroll
     --------------------------------------------------------- */
  function showcaseScene(canvas, beers) {
    const stage = new Stage(canvas);
    const labels = makeLabels(beers, stage.renderer);
    const env = studioEnvironment(stage.renderer);
    stage.scene.fog = new THREE.Fog(0x0f0d0a, 9, 27);
    const bottle = createBottle(env);
    const glow = createGlow(new THREE.Color(beers[0].accent));
    const bubbles = createBubbles(70, { x: 8, y: 5.4 });
    const terrain = createTerrain();
    stage.scene.add(terrain.mesh, glow, bubbles.points, bottle.group);

    const glassColors = beers.map((b) => new THREE.Color(b.glass));
    const accentColors = beers.map((b) => new THREE.Color(b.accent));
    let shown = 0;
    bottle.setLabel(labels[beers[0].id]);
    bottle.tint(glassColors[0], 1);

    const rest = { x: 0, y: 0, scale: 1 };
    stage.onLayout = (v) => {
      if (v.aspect >= 1) { rest.x = v.w * 0.2; rest.y = -0.05; rest.scale = 1.32; }
      else { rest.x = 0; rest.y = 0.82; rest.scale = 0.88; }
    };
    stage.resize();

    let progress = 0;
    let rot = 0;
    stage.setProgress = (p) => { progress = p; };

    stage.update = (t, dt) => {
      // one full turn per beer; the label swaps while it faces away
      const target = clamp(progress, 0, 1) * (beers.length - 1) * TAU;
      rot += (target - rot) * (reduceMotion ? 1 : Math.min(1, dt * 4.5));
      const index = clamp(Math.floor(rot / TAU + 0.5), 0, beers.length - 1);
      if (index !== shown) { shown = index; bottle.setLabel(labels[beers[index].id]); }
      bottle.tint(glassColors[index], reduceMotion ? 1 : Math.min(1, dt * 5));
      glow.material.color.lerp(accentColors[index], reduceMotion ? 1 : Math.min(1, dt * 3));

      const g = bottle.group;
      g.position.set(rest.x, rest.y + Math.sin(t * 0.8) * 0.04, 0);
      g.scale.setScalar(rest.scale);
      g.rotation.y = rot + Math.sin(t * 0.5) * 0.14 + pointer.x * 0.3;
      g.rotation.x = pointer.y * 0.08;
      g.rotation.z = 0.06 + Math.sin(rot) * 0.05;
      glow.position.set(g.position.x, g.position.y, -1.6);
      glow.material.opacity = 0.42;
      bubbles.update(t, dt);
      terrain.update(t * 0.12);
      stage.camera.position.x = pointer.x * 0.12;
      stage.camera.position.y = -pointer.y * 0.08;
      stage.camera.lookAt(0, 0, 0);
    };
    return stage;
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  FVScene.init = ({ heroCanvas, showcaseCanvas, beers }) => {
    let stages;
    try {
      const probe = document.createElement("canvas");
      if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return false;

      stages = {};
      if (heroCanvas) stages.hero = heroScene(heroCanvas, beers);
      if (showcaseCanvas) stages.showcase = showcaseScene(showcaseCanvas, beers);
    } catch (err) {
      console.warn("Fonte Vallone: 3D disabled —", err);
      return false;
    }

    FVScene.ok = true;
    FVScene.intro = () => stages.hero && stages.hero.intro();
    FVScene.setProgress = (p) => stages.showcase && stages.showcase.setProgress(p);

    const clock = new THREE.Clock();
    let t = 0;
    const frame = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      if (!reduceMotion) t += dt;
      if (!document.hidden) {
        Object.values(stages).forEach((s) => { if (s.visible) s.render(t, reduceMotion ? 0 : dt); });
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return true;
  };
})();

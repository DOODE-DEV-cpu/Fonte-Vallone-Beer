/* =========================================================
   Fonte Vallone — site interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------------------------------------------------------
     Photography of Pacentro (Wikimedia Commons, CC BY-SA).
     Served at 3840px wide (4K). To self-host, drop files in
     assets/images/pacentro/ and change these URLs.
     --------------------------------------------------------- */
  const commons = (file, width = 3840) =>
    `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;

  const PHOTOS = {
    veduta: commons("Veduta di Pacentro.jpg"),
    torri: commons("Panorama su Pacentro con le Torri Caldora.jpg"),
    campo: commons("Pacentro - Veduta dalla strada per Campo di Giove.jpg"),
    castello: commons("Pacentro AQ - Castello Caldora 04.JPG"),
    majella: commons("La Majella.jpg"),
  };

  /* ---------------------------------------------------------
     Product catalogue (placeholder imagery)
     --------------------------------------------------------- */
  const BEERS = [
    {
      id: "bionda", name: "Bionda", sub: "del Vallone", style: "Helles Lager", abv: 4.8,
      price: 4.5, family: "light", tag: "Signature", accent: "#e3c88a",
      notes: "Golden and luminous. Fresh bread, wildflower honey and a clean, mineral finish from Maiella spring water.",
      img: "assets/images/beers/bionda.svg",
    },
    {
      id: "rossa", name: "Rossa", sub: "Torre Caldora", style: "Amber Ale", abv: 5.6,
      price: 5.0, family: "amber", tag: "Small Batch", accent: "#c8643a",
      notes: "Deep copper. Caramel, toasted almond and dried fig, balanced by a gentle herbal bitterness.",
      img: "assets/images/beers/rossa.svg",
    },
    {
      id: "scura", name: "Scura", sub: "Notte sulla Maiella", style: "Dark Doppelbock", abv: 7.2,
      price: 6.0, family: "dark", tag: "Riserva", accent: "#8a5a3c",
      notes: "Velvet and ebony. Cocoa, roasted chestnut and a whisper of liquorice — made for long mountain evenings.",
      img: "assets/images/beers/scura.svg",
    },
    {
      id: "ipa", name: "IPA", sub: "Sorgente Morrone", style: "Italian Pale Ale", abv: 6.1,
      price: 5.5, family: "light", tag: "Seasonal", accent: "#d9a441",
      notes: "Bright and aromatic. Citrus peel, mountain herbs and pine resin over a crisp, dry backbone.",
      img: "assets/images/beers/ipa.svg",
    },
  ];
  const beerById = Object.fromEntries(BEERS.map((b) => [b.id, b]));
  const euro = (n) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);

  /* ---------------------------------------------------------
     Background image loader with graceful fallback
     --------------------------------------------------------- */
  const imageCache = {};
  function loadPhoto(key) {
    if (!imageCache[key]) {
      imageCache[key] = new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(PHOTOS[key]);
        img.onerror = reject;
        img.src = PHOTOS[key];
      });
    }
    return imageCache[key];
  }
  function applyBackgrounds(root = document) {
    $$("[data-bg]", root).forEach((el) => {
      const key = el.dataset.bg;
      if (!PHOTOS[key]) return;
      // if a photo is unavailable, fall back to the main view of Pacentro
      loadPhoto(key)
        .catch(() => (key === "veduta" ? Promise.reject() : loadPhoto("veduta")))
        .then((url) => {
          el.style.setProperty("--photo", `url("${url}")`);
          el.classList.add("is-loaded");
        })
        .catch(() => { /* keep the gradient fallback */ });
    });
  }

  /* ---------------------------------------------------------
     Preloader + hero intro
     --------------------------------------------------------- */
  function splitChars() {
    $$("[data-split]").forEach((el) => {
      const text = el.textContent;
      el.textContent = "";
      el.setAttribute("aria-label", text);
      [...text].forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "char";
        span.setAttribute("aria-hidden", "true");
        span.textContent = ch;
        span.style.transitionDelay = `${0.35 + i * 0.06 + (el.classList.contains("split--italic") ? 0.25 : 0)}s`;
        el.appendChild(span);
      });
    });
  }

  function runPreloader() {
    const pre = $("#preloader");
    const bar = $(".preloader__bar span", pre);
    let progress = 0;
    const tick = setInterval(() => {
      progress = Math.min(progress + Math.random() * 18, 92);
      bar.style.transform = `scaleX(${progress / 100})`;
    }, 140);

    const heroReady = loadPhoto("veduta").catch(() => null);
    const minTime = new Promise((r) => setTimeout(r, reduceMotion ? 0 : 1600));
    const maxTime = new Promise((r) => setTimeout(r, 4500));

    Promise.race([Promise.all([heroReady, minTime]), maxTime]).then(() => {
      clearInterval(tick);
      bar.style.transform = "scaleX(1)";
      setTimeout(() => {
        pre.classList.add("is-done");
        document.body.classList.remove("is-loading");
        ageGate();
      }, 350);
    });
  }

  /* ---------------------------------------------------------
     Age gate
     --------------------------------------------------------- */
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  function startHero() {
    document.body.classList.add("is-ready");
    heroSlider();
  }

  function ageGate() {
    const gate = $("#ageGate");
    if (storage.get("fv-age-ok") === "1") { startHero(); return; }
    gate.hidden = false;
    document.body.classList.add("is-locked");
    $('[data-age="yes"]', gate).focus();
    gate.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-age]");
      if (!btn) return;
      if (btn.dataset.age === "yes") {
        storage.set("fv-age-ok", "1");
        gate.classList.add("is-leaving");
        document.body.classList.remove("is-locked");
        setTimeout(() => { gate.hidden = true; }, 600);
        startHero();
      } else {
        $(".age-gate__denied", gate).hidden = false;
        $(".age-gate__actions", gate).style.display = "none";
      }
    });
  }

  /* ---------------------------------------------------------
     Hero slideshow (Ken Burns crossfade)
     --------------------------------------------------------- */
  function heroSlider() {
    const slides = $$(".hero__slide");
    const dots = $$(".hero__dot");
    let current = 0;
    let timer;

    const go = (i) => {
      slides[current].classList.remove("is-active");
      dots[current].classList.remove("is-active");
      current = (i + slides.length) % slides.length;
      // restart Ken Burns on the incoming slide
      slides[current].style.transition = "none";
      slides[current].style.transform = "scale(1.12)";
      void slides[current].offsetWidth;
      slides[current].style.transition = "";
      slides[current].style.transform = "";
      slides[current].classList.add("is-active");
      // restart dot progress animation
      void dots[current].offsetWidth;
      dots[current].classList.add("is-active");
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!reduceMotion) timer = setTimeout(() => go(current + 1), 7000);
    };
    dots.forEach((d, i) => d.addEventListener("click", () => i !== current && go(i)));
    schedule();
  }

  /* ---------------------------------------------------------
     Navigation
     --------------------------------------------------------- */
  function nav() {
    const navEl = $("#nav");
    const burger = $("#burger");
    const menu = $("#mobileMenu");
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      navEl.classList.toggle("is-scrolled", y > 40);
      const hide = y > lastY && y > window.innerHeight * 0.8 && !menu.classList.contains("is-open");
      navEl.classList.toggle("is-hidden", hide);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const toggleMenu = (open) => {
      menu.classList.toggle("is-open", open);
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      menu.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("is-locked", open);
    };
    burger.addEventListener("click", () => toggleMenu(!menu.classList.contains("is-open")));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

    // active link highlighting
    const links = $$(".nav__link");
    const sections = links.map((l) => $(l.getAttribute("href"))).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${entry.target.id}`));
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------------------------------------------------------
     Scroll reveal, counters, parallax
     --------------------------------------------------------- */
  function reveals() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // stagger siblings that reveal together
        const siblings = $$(":scope > .reveal", el.parentElement);
        const idx = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = `${Math.min(idx * 0.08, 0.4)}s`;
        el.classList.add("is-in");
        $$("[data-count]", el).forEach(countUp);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  }

  function countUp(el) {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = target; return; }
    const dur = 1800;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function parallax() {
    if (reduceMotion) return;
    const items = $$(".parallax-img");
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      items.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = Number(el.dataset.speed || 0.15);
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
      // gentle hero drift
      const hero = $(".hero__slides");
      if (window.scrollY < vh) hero.style.transform = `translate3d(0, ${window.scrollY * 0.3}px, 0)`;
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------------------------------------------------------
     Button micro-interactions: ripple + magnetic
     --------------------------------------------------------- */
  function buttonFx() {
    document.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".btn, .add-btn, .chip");
      if (!btn || reduceMotion) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - r.left - size / 2}px`;
      ripple.style.top = `${e.clientY - r.top - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    });

    if (!finePointer || reduceMotion) return;
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  function cursor() {
    if (!finePointer || reduceMotion) return;
    const c = $(".cursor");
    const dot = $(".cursor__dot", c);
    const ring = $(".cursor__ring", c);
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    });
    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    const hoverSel = "a, button, .g-item, label, input, select, textarea";
    document.addEventListener("pointerover", (e) => c.classList.toggle("is-hover", !!e.target.closest(hoverSel)));
    document.addEventListener("pointerleave", () => c.classList.add("is-hidden"));
    document.addEventListener("pointerenter", () => c.classList.remove("is-hidden"));
  }

  /* ---------------------------------------------------------
     Beer cards
     --------------------------------------------------------- */
  function renderBeers() {
    const grid = $("#beerGrid");
    grid.innerHTML = BEERS.map((b) => `
      <article class="beer reveal" data-family="${b.family}" style="--accent:${b.accent}">
        <div class="beer__stage">
          <span class="beer__tag">${b.tag}</span>
          <span class="beer__abv">${b.abv.toFixed(1)}<small>% vol</small></span>
          <img class="beer__img" src="${b.img}" alt="Fonte Vallone ${b.name} ${b.sub} — placeholder bottle" loading="lazy">
        </div>
        <div class="beer__body">
          <p class="beer__style">${b.style} · 33 cl</p>
          <h3 class="beer__name">${b.name}</h3>
          <p class="beer__sub">${b.sub}</p>
          <p class="beer__notes">${b.notes}</p>
          <div class="beer__foot">
            <span class="beer__price">${euro(b.price)}<small>/ bottle</small></span>
            <button class="add-btn" data-add="${b.id}" aria-label="Add ${b.name} to order">
              <span class="add-btn__plus">+</span><span class="add-btn__text">Add</span>
            </button>
          </div>
        </div>
      </article>`).join("");

    // 3D tilt
    if (finePointer && !reduceMotion) {
      $$(".beer", grid).forEach((card) => {
        card.addEventListener("pointermove", (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-6px)`;
        });
        card.addEventListener("pointerleave", () => { card.style.transform = ""; });
      });
    }

    // Filter chips
    $$(".chip").forEach((chip) => chip.addEventListener("click", () => {
      $$(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
      const f = chip.dataset.filter;
      $$(".beer", grid).forEach((card) => card.classList.toggle("is-filtered", f !== "all" && card.dataset.family !== f));
    }));

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add]");
      if (!btn) return;
      cart.add(btn.dataset.add, 1);
      flyToCart(btn.closest(".beer").querySelector(".beer__img"));
      const text = $(".add-btn__text", btn);
      btn.classList.add("is-added");
      text.textContent = "Added";
      setTimeout(() => { btn.classList.remove("is-added"); text.textContent = "Add"; }, 1400);
    });
  }

  function flyToCart(img) {
    const target = $("#cartOpen");
    if (reduceMotion || !img || !target) return;
    const a = img.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const clone = img.cloneNode();
    clone.className = "fly";
    Object.assign(clone.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
    document.body.appendChild(clone);
    requestAnimationFrame(() => {
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.08) rotate(25deg)`;
      clone.style.opacity = "0.2";
    });
    clone.addEventListener("transitionend", () => clone.remove(), { once: true });
  }

  /* ---------------------------------------------------------
     Cart (persisted locally, purely front-end for now)
     --------------------------------------------------------- */
  const cart = {
    items: {},
    load() {
      try { this.items = JSON.parse(storage.get("fv-cart") || "{}") || {}; } catch { this.items = {}; }
      Object.keys(this.items).forEach((k) => { if (!beerById[k]) delete this.items[k]; });
    },
    save() { storage.set("fv-cart", JSON.stringify(this.items)); },
    add(id, n) {
      this.items[id] = Math.max(0, (this.items[id] || 0) + n);
      if (!this.items[id]) delete this.items[id];
      this.save();
      this.render(id);
      if (n > 0) {
        const btn = $("#cartOpen");
        $("#nav").classList.remove("is-hidden");
        btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
        toast(`${beerById[id].name} ${beerById[id].sub} added to your order`);
      }
    },
    count() { return Object.values(this.items).reduce((a, b) => a + b, 0); },
    total() { return Object.entries(this.items).reduce((s, [id, q]) => s + beerById[id].price * q, 0); },
    clear() { this.items = {}; this.save(); this.render(); },
    render(changedId) {
      const count = this.count();
      const badge = $("#cartCount");
      badge.textContent = count;
      badge.classList.toggle("has-items", count > 0);

      // drawer: only items in cart
      const inCart = BEERS.filter((b) => this.items[b.id]);
      $("#drawerBody").innerHTML = inCart.length
        ? inCart.map((b) => lineHTML(b, this.items[b.id])).join("")
        : `<div class="empty-order"><p>Your order is empty</p><span>Explore the collection to begin.</span></div>`;

      // order form: every beer with steppers
      $("#orderLines").innerHTML = BEERS.map((b) => lineHTML(b, this.items[b.id] || 0)).join("");

      const total = euro(this.total());
      $("#drawerTotal").textContent = total;
      $("#orderTotal").textContent = total;

      if (changedId) $$(`[data-qty-out="${changedId}"]`).forEach((o) => o.classList.add("tick"));
    },
  };

  function lineHTML(b, q) {
    return `
      <div class="order-line">
        <img src="${b.img}" alt="">
        <div><div class="order-line__name">${b.name} <em>${b.sub}</em></div><div class="order-line__meta">${b.style} · ${euro(b.price)}</div></div>
        <div class="qty">
          <button type="button" data-qty="${b.id}" data-step="-1" aria-label="Remove one ${b.name}">−</button>
          <output data-qty-out="${b.id}">${q}</output>
          <button type="button" data-qty="${b.id}" data-step="1" aria-label="Add one ${b.name}">+</button>
        </div>
        <div class="order-line__price">${euro(b.price * q)}</div>
      </div>`;
  }

  function cartUI() {
    const drawer = $("#drawer");
    const overlay = $("#overlay");
    const open = (state) => {
      drawer.classList.toggle("is-open", state);
      overlay.classList.toggle("is-open", state);
      drawer.setAttribute("aria-hidden", String(!state));
      document.body.classList.toggle("is-locked", state);
      if (state) $("#cartClose").focus();
    };
    $("#cartOpen").addEventListener("click", () => open(true));
    $("#cartClose").addEventListener("click", () => open(false));
    overlay.addEventListener("click", () => open(false));
    $("#drawerCheckout").addEventListener("click", () => open(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { open(false); closeLightbox(); closeModal(); } });

    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-qty]");
      if (b) cart.add(b.dataset.qty, Number(b.dataset.step) > 0 ? 1 : -1);
    });
  }

  /* ---------------------------------------------------------
     Forms (front-end only — no data is sent anywhere yet)
     --------------------------------------------------------- */
  function validate(form) {
    let ok = true;
    $$("input[required], textarea[required], select[required]", form).forEach((input) => {
      const wrap = input.type === "checkbox" ? input.closest(".check") : input.closest(".field");
      const valid = input.type === "checkbox" ? input.checked : input.checkValidity() && input.value.trim() !== "";
      if (wrap) {
        wrap.classList.remove("is-invalid");
        if (!valid) { void wrap.offsetWidth; wrap.classList.add("is-invalid"); }
      }
      if (!valid) ok = false;
    });
    return ok;
  }

  function fakeSubmit(btn) {
    btn.classList.add("is-loading");
    btn.disabled = true;
    const spin = document.createElement("span");
    spin.className = "spinner";
    btn.appendChild(spin);
    return new Promise((r) => setTimeout(() => {
      btn.classList.remove("is-loading");
      btn.disabled = false;
      spin.remove();
      r();
    }, 1400));
  }

  function forms() {
    const orderForm = $("#orderForm");
    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (cart.count() === 0) { toast("Add at least one beer to your order"); return; }
      if (!validate(orderForm)) { toast("Please complete the highlighted fields"); return; }
      await fakeSubmit($("button[type=submit]", orderForm));
      const name = orderForm.name.value.trim().split(" ")[0];
      openModal(`Grazie, ${name}! Your order of ${cart.count()} bottle${cart.count() > 1 ? "s" : ""} (${euro(cart.total())}) has been received. We'll be in touch shortly to confirm delivery.`);
      orderForm.reset();
      cart.clear();
    });

    const contactForm = $("#contactForm");
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validate(contactForm)) { toast("Please complete the highlighted fields"); return; }
      await fakeSubmit($("button[type=submit]", contactForm));
      openModal(`Thank you, ${contactForm.name.value.trim().split(" ")[0]}. Your message has reached Pacentro — we usually reply within two working days.`);
      contactForm.reset();
    });

    $("#newsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("input", e.target);
      if (!input.checkValidity() || !input.value) { toast("Please enter a valid email"); return; }
      input.value = "";
      toast("Benvenuto! You're on the list.");
    });

    $$(".field input, .field textarea").forEach((i) => i.addEventListener("input", () => i.closest(".field").classList.remove("is-invalid")));
    $$(".check input").forEach((i) => i.addEventListener("change", () => i.closest(".check").classList.remove("is-invalid")));
  }

  /* ---------------------------------------------------------
     Modal, toast, lightbox
     --------------------------------------------------------- */
  const modal = $("#modal");
  function openModal(text) {
    $(".modal__text", modal).textContent = text;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    $("[data-close-modal]", modal).focus();
  }
  function closeModal() { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); }
  modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest("[data-close-modal]")) closeModal(); });

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-shown"), 2600);
  }

  const lightbox = $("#lightbox");
  function closeLightbox() { lightbox.classList.remove("is-open"); lightbox.setAttribute("aria-hidden", "true"); }
  function gallery() {
    const open = (item) => {
      const img = $(".lightbox__img", lightbox);
      img.style.backgroundImage = item.classList.contains("is-loaded") ? `url("${PHOTOS[item.dataset.bg]}")` : getComputedStyle(item).backgroundImage;
      $(".lightbox__caption", lightbox).textContent = item.dataset.caption;
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
    };
    $$(".g-item").forEach((item) => {
      item.addEventListener("click", () => open(item));
      item.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(item); } });
    });
    lightbox.addEventListener("click", (e) => { if (!e.target.closest(".lightbox__img")) closeLightbox(); });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#year").textContent = new Date().getFullYear();
    splitChars();
    renderBeers();
    cart.load();
    cart.render();
    applyBackgrounds();
    nav();
    reveals();
    parallax();
    buttonFx();
    cursor();
    cartUI();
    forms();
    gallery();
    runPreloader();
  });
})();

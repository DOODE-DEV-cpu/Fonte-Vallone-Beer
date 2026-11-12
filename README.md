# Fonte Vallone — Website

Website for **Fonte Vallone**, a premium craft beer brewed in Pacentro (AQ), Abruzzo, Italy.

It is a static site with no build step and no dependencies: plain HTML, CSS and JavaScript.

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

You can also open `index.html` directly in a browser.

## Structure

```
index.html                 Page markup (all sections)
css/styles.css             Design system, layout, animations, responsive rules
js/main.js                 Interactions: preloader, age gate, hero slideshow, cart, forms…
js/scene3d.js              3D scenes: hero bottle and the scroll-driven beer showcase
js/vendor/three.min.js     three.js r160 (MIT), the 3D library, bundled so nothing is fetched
assets/favicon.svg         Logo mark
assets/images/beers/*.svg  PLACEHOLDER bottle images (replace with product photos)
```

## Features

- Preloader and an 18+ age gate. The visitor's answer is remembered in `localStorage`.
- Full-screen hero slideshow of Pacentro with a slow-zoom ("Ken Burns") crossfade and split-letter title animation
- A real-time 3D bottle in the hero that floats, catches the light and follows the pointer, with rising bubbles
- A 3D showcase: as you scroll, the bottle spins and becomes each of the four beers, over a drifting gold wireframe of the mountains. Labels are drawn in code from the `BEERS` list.
- Animated buttons throughout: a fill sweep, a shine pass, a click ripple and a magnetic hover, plus a custom cursor on desktop
- Content fades in as you scroll, numbers count up, and background photos move at a different speed than the page (parallax)
- Beer collection with filter chips, a 3D tilt on hover and an "add to order" animation where the bottle flies to the cart icon
- Cart drawer and order form. The cart is kept in `localStorage`.
- Contact form with topic selection, a map of Pacentro and a newsletter sign-up
- Fully responsive, with a mobile menu. Respects `prefers-reduced-motion`.

> **Work in progress:** the order, contact and newsletter forms validate and show confirmation messages, but **they do not send data anywhere yet**. To make them live, connect `forms()` in `js/main.js` to a backend, form service or e-commerce platform. Placeholder contact details (email and phone) live in `index.html`.

## Replacing the placeholder beer images

Put the product photos in `assets/images/beers/` and update the `img` paths in the `BEERS` array at the top of `js/main.js`. Transparent PNG or WebP cut-outs of about 800×1800 px work best. Names, styles, ABV, prices and tasting notes are in the same array, along with `glass` (bottle colour) and `ink` (label colour) for the 3D bottle.

The 3D bottle is modelled in `js/scene3d.js`. To match the real bottle, edit its outline in `bottleProfile()` and the label artwork in `drawLabel()`, or swap the label for an image of the real one. If a browser has no WebGL, the site shows the flat bottle images instead.

## Photography of Pacentro

The background photos are high-resolution images of Pacentro from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Pacentro). They are requested at **3840 px wide (4K)** through `Special:FilePath`. The `PHOTOS` map in `js/main.js` lists them:

| Key | Commons file |
| --- | --- |
| `veduta` | [Veduta di Pacentro.jpg](https://commons.wikimedia.org/wiki/File:Veduta_di_Pacentro.jpg) (Verdenex84, CC BY-SA 4.0) |
| `torri` | Panorama su Pacentro con le Torri Caldora.jpg |
| `campo` | Pacentro - Veduta dalla strada per Campo di Giove.jpg |
| `castello` | Pacentro AQ - Castello Caldora 04.JPG |
| `majella` | [La Majella.jpg](https://commons.wikimedia.org/wiki/File:La_Majella.jpg) |

If a photo cannot load, the site uses the main view of Pacentro instead, and after that an elegant gradient.

**Before launch:**
1. Self-host the images. Download them, put them in `assets/images/pacentro/` and point `PHOTOS` at the local files. This is faster and avoids depending on Wikimedia.
2. Keep the CC BY-SA credit in the footer, or replace the images with the brewery's own photography.

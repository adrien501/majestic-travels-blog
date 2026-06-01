# Majestic Travels — Site Redesign Spec

**Date:** 2026-06-01
**Scope:** Dark mode, navbar redesign, destination filtering + NYC, Klaviyo email integration, footer redesign

## Approach

Layered build in dependency order:
1. Dark mode CSS foundation (everything else inherits it)
2. Navbar redesign
3. Destinations + NYC + filtering
4. Klaviyo integration (dedicated section + footer form)
5. Footer redesign

---

## 1. Dark Mode Foundation

### Toggle Mechanism

- `data-theme="dark"` attribute on `<html>`
- Tiny inline `<script>` in `<head>` (before any CSS paints) reads `localStorage.getItem('theme')` or falls back to `prefers-color-scheme`. Sets the attribute immediately — no flash of wrong theme.
- Toggle button in navbar calls a function that flips the attribute and persists to `localStorage`.

### CSS Variable Overrides

All existing CSS variables get dark-mode counterparts inside `[data-theme="dark"]`:

| Token | Light | Dark |
|---|---|---|
| `--ink` | `#2c2a26` | `#f0e9df` |
| `--ink-soft` | `#5a5650` | `#a89e94` |
| `--cream` | `#faf6f0` | `#1a1917` |
| `--cream-deep` | `#f0e9df` | `#242220` |
| `--white` | `#ffffff` | `#2c2a26` |
| `--sandstone` | `#c08c5a` | `#d4a06e` |
| `--clay` | `#9e5b3c` | `#c07a5a` |
| `--sage` | `#7a8b72` | `#8a9b82` |
| `--line` | `rgba(44,42,38,0.12)` | `rgba(250,246,240,0.10)` |
| `--line-strong` | `rgba(44,42,38,0.22)` | `rgba(250,246,240,0.18)` |
| `--footer-bg` | `#2c2a26` | `#141312` |

### Principles

- Backgrounds go dark-warm (no cold grays)
- Text flips to light-warm
- Accent colors (sandstone, clay) get a small brightness boost for contrast on dark surfaces
- Images untouched — no filters or dimming

### Files Changed

- `majestic-travels-blog.html`: add `[data-theme="dark"]` CSS block in `<style>`, add inline theme script in `<head>`
- `scripts/build-blog.js`: include same theme script and dark-mode CSS in generated article pages

---

## 2. Navbar Redesign

### Structure

```html
<nav class="site-nav" aria-label="Main navigation">
  <div class="nav-inner">
    <a href="/" class="nav-brand">
      <img src="..." alt="Majestic Travels logo" class="nav-logo">
      <span class="nav-brand-name">Majestic Travels</span>
    </a>
    <ul class="nav-menu">
      <li><a href="#stories">Stories</a></li>
      <li><a href="#destinations">Destinations</a></li>
      <li><a href="#about">About</a></li>
    </ul>
    <button class="theme-toggle" aria-label="Toggle dark mode">
      <!-- sun/moon SVG icon -->
    </button>
    <button class="nav-hamburger" aria-label="Menu" aria-expanded="false">
      <!-- hamburger SVG icon -->
    </button>
  </div>
</nav>
```

### Behavior

**Default (over hero):**
- `position: sticky; top: 0; z-index: 100`
- `background: transparent`
- `backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px)`
- Subtle tint: `rgba(44,42,38,0.15)` (light) / `rgba(26,25,23,0.3)` (dark)
- Text color: `#faf6f0` (white-ish, legible over hero image)

**Scrolled past hero:**
- Class `.nav-solid` added via `IntersectionObserver` watching the hero section
- Background transitions to `var(--cream)` with `border-bottom: 1px solid var(--line)`
- Text color transitions to `var(--ink)`
- Smooth CSS transition (~200ms)

**Mobile (≤480px):**
- Logo + brand name left, theme toggle + hamburger right
- Nav menu hidden by default
- Hamburger toggles a slide-down panel with the three links
- Panel: solid background, full-width, below the nav bar

### What's Removed

- Social icons (Instagram, TikTok, Ko-fi, Gumroad) — moved to footer only
- RSS link from nav — available in footer

### What's Added

- Dark mode toggle button (sun/moon icon)
- "Destinations" and "About" anchor links
- Hamburger menu for mobile
- IntersectionObserver-based transparent→solid transition

### Files Changed

- `majestic-travels-blog.html`: nav HTML, nav CSS, observer JS
- `scripts/build-blog.js`: update nav template in article pages (article pages get solid nav only, no transparent state since they have no hero)

---

## 3. Destinations + NYC + Filtering

### NYC Card

Add a 6th destination card for New York City:
- Label: "New York City"
- `data-destination="new-york"`
- Image: placeholder gradient initially (user will provide `public/site/nyc-*.jpg` later)
- Grid changes from 5-column to 3×2 on desktop

### Destination-to-Tag Mapping

| Card | `data-destination` | Matches post tags containing |
|---|---|---|
| Dubai & Abu Dhabi | `dubai` | "Dubai", "Abu Dhabi" |
| Fuerteventura | `fuerteventura` | "Fuerteventura" |
| Ljubljana | `ljubljana` | "Ljubljana" |
| Marrakech | `marrakech` | "Marrakech" |
| Vancouver | `vancouver` | "Vancouver" |
| New York City | `new-york` | "New York" |

### Card Click Behavior

1. Click destination card
2. Smooth-scroll to `#stories` section
3. Apply destination filter — story cards without matching destination get `display: none`
4. Active filter indicator appears above story grid: sandstone pill with destination name + ✕ clear button
5. URL updates to `?destination=new-york` (shareable, bookmarkable)
6. On page load, check URL params and apply filter if present

### Filter Combination

- Destination filter works alongside existing topic pills (All / Essays / Guides / Field Notes)
- Both filters AND together: "Guides" + "NYC" = only NYC guides
- "All" topic pill does not clear destination filter — only the ✕ button or clicking the same destination again clears it
- Search input also works alongside both filters

### Empty State

When filters produce zero results: "No stories from [destination] yet — check back soon" (reuse existing empty-state pattern)

### Story Card Changes

Each story card gains a `data-destinations` attribute. The build script populates this by matching post tags against the known destination list.

Example: `<article class="story-card" data-category="Holiday Guide" data-search="..." data-destinations="new-york">`

### Mobile Responsive

- ≤768px: 3×2 → 2×3 grid
- ≤480px: horizontal scroll strip — cards become ~140px wide compact pills with background images (like story highlights). Scrollable with `-webkit-overflow-scrolling: touch`. No wrapping.

### Files Changed

- `majestic-travels-blog.html`: add NYC card HTML, update grid CSS, update filter JS, add active-filter indicator
- `scripts/build-blog.js`: output `data-destinations` attribute on story cards, cross-reference post tags against destination list

---

## 4. Klaviyo Integration

### Technical Setup

- Load Klaviyo client JS async: `<script async src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=VQW5sn"></script>`
- On form submit: `klaviyo.push(['identify', { $email: emailValue }])` then subscribe to list
- Inline success/error states — no page reload, no redirects
- No Klaviyo popups or flyouts — only our custom embedded forms

### Placement 1: Dedicated Section (above footer)

**Position:** Between the About section and the footer

**Layout:** Full-width band, centered content (max-width matches site `--max`)

**Content:**
- Heading: "Get exclusive itineraries & travel stories"
- Subtext: "Real destinations, honest tips — delivered to your inbox. No spam, ever."
- Email input + "Subscribe" button (sandstone accent, same style as footer)
- Small note below: "Unsubscribe anytime"

**Styling:**
- Background: `var(--cream-deep)` — slightly offset from page background to create a visual band
- Dark mode: the lifted surface tone (`--cream-deep` resolves to `#242220`)
- Padding: generous vertical spacing (~80px top/bottom)
- Text: centered, heading in `--font-display`, body in `--font-body`

**States:**
- Default: form visible
- Submitting: button shows "..." or spinner, input disabled
- Success: form replaced with "You're in! Check your inbox." message
- Error: inline red-ish text below input ("Something went wrong — try again")

### Placement 2: Footer Form

- Same Klaviyo integration, lighter presentation
- Label: "Stay in the loop" with mail icon (existing)
- Email input + Subscribe button
- No extra copy — the dedicated section already made the pitch
- Same success/error states

### Files Changed

- `majestic-travels-blog.html`: add Klaviyo script tag, add dedicated section HTML/CSS, update footer form with Klaviyo JS handler
- `scripts/build-blog.js`: include Klaviyo script and form handler in article pages

---

## 5. Footer Redesign

### Layout

Centered & stacked, single column:

```
[Logo ~48px]
Majestic Travels
Solo travel. Real places. No filters.

[email input] [Subscribe]
Stay in the loop

Stories · Destinations · About · RSS

[IG] [TT] [Ko-fi] [Gumroad]

© 2026 Majestic Travels
```

### Styling

- Footer stays dark in both themes. New token: `--footer-bg: #2c2a26` (light) / `--footer-bg: #141312` (dark). Text always `var(--cream)` light-mode value (`#faf6f0`).
- Logo: `48px` height, centered
- Brand name: `--font-display`, ~18px
- Tagline: `--font-body`, `opacity: 0.6`
- Newsletter form: max-width ~360px, centered
- Links: inline with `·` separators, `opacity: 0.6`, hover to `opacity: 1`
- Social icons: 24px circles with subtle border, centered row, hover lifts opacity
- Copyright: small, `opacity: 0.3`
- Vertical spacing: ~16-20px between each tier

### What's Removed

- Two-column grid layout
- Duplicate social links (were in both icon and text form)
- Separate footer-brand / footer-nav / footer-newsletter columns

### Mobile

Same layout — it's already single-column centered. Just tighter padding (~40px vertical vs ~60px desktop).

### Files Changed

- `majestic-travels-blog.html`: rewrite footer HTML and CSS
- `scripts/build-blog.js`: update footer template in article pages

---

## Cross-Cutting Concerns

### Build Script Updates

`scripts/build-blog.js` generates article pages from a template. Every change to the homepage nav, footer, dark mode, or Klaviyo must be mirrored in the article template. Changes needed:

1. Theme detection inline script in `<head>`
2. Dark mode CSS variables
3. New nav HTML + CSS + JS (solid state only for articles — no transparent hero state)
4. New footer HTML + CSS
5. Klaviyo script tag + form handler
6. `data-destinations` attribute on story cards (homepage only, not articles)

### No New Files

All changes happen in existing files:
- `majestic-travels-blog.html` (homepage)
- `scripts/build-blog.js` (article page generator)

### No New Dependencies

- Klaviyo loaded via CDN script tag
- Dark mode toggle is vanilla JS
- IntersectionObserver is native browser API
- No build tools, no npm packages added

### Browser Support

- `backdrop-filter` needs `-webkit-` prefix for Safari (already planned)
- `IntersectionObserver` supported in all modern browsers
- `localStorage` universally supported
- `prefers-color-scheme` supported in all modern browsers
- Graceful degradation: if `backdrop-filter` unsupported, nav gets a solid semi-transparent background instead

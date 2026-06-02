# Majestic Travels Site Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark mode, redesign the navbar (frosted glass), add NYC destination with click-to-filter, integrate Klaviyo email subscriptions, and redesign the footer (centered & stacked).

**Architecture:** Layered build — dark mode CSS foundation first (all subsequent layers inherit it), then navbar, destinations/filtering, Klaviyo, footer. Two files change: `majestic-travels-blog.html` (homepage) and `scripts/build-blog.js` (article page generator). No new files, no new dependencies.

**Tech Stack:** Vanilla HTML/CSS/JS, CSS custom properties, IntersectionObserver, Klaviyo client-side JS API (CDN), localStorage for theme persistence.

**Spec:** [docs/superpowers/specs/2026-06-01-site-redesign-design.md](../specs/2026-06-01-site-redesign-design.md)

---

### Task 1: Dark Mode CSS Foundation

**Goal:** Add dark-mode CSS variable overrides, a no-flash inline theme script, and a toggle utility function — on the homepage only (build script sync happens in Task 6).

**Files:**
- Modify: `majestic-travels-blog.html:62-83` (CSS `:root` block — add `[data-theme="dark"]` override block after it)
- Modify: `majestic-travels-blog.html:3-4` (add inline theme-detection script before the `<style>` tag)

**Acceptance Criteria:**
- [ ] `[data-theme="dark"]` CSS block overrides all tokens listed in the spec
- [ ] Inline `<script>` in `<head>` reads `localStorage` or `prefers-color-scheme` and sets `data-theme` before first paint
- [ ] `window.toggleTheme()` function flips the attribute and persists to `localStorage`
- [ ] No flash of wrong theme on reload
- [ ] `::selection` adapts to dark mode
- [ ] `meta[name="theme-color"]` updates dynamically when toggling

**Verify:** Open `majestic-travels-blog.html` in a browser. Run `toggleTheme()` in the console → page should flip to dark. Reload → should stay dark. Run `toggleTheme()` again → back to light.

**Steps:**

- [ ] **Step 1: Add the dark-mode CSS variable overrides**

After the existing `:root { ... }` block (line 83), add this CSS block inside the `<style>` tag:

```css
[data-theme="dark"] {
  --ink: #f0e9df;
  --ink-soft: #a89e94;
  --cream: #1a1917;
  --cream-deep: #242220;
  --white: #2c2a26;
  --sandstone: #d4a06e;
  --clay: #c07a5a;
  --sage: #8a9b82;
  --charcoal: #f0e9df;
  --line: rgba(250, 246, 240, 0.10);
  --line-strong: rgba(250, 246, 240, 0.18);
  --footer-bg: #141312;
}

:root {
  --footer-bg: #2c2a26;
}
```

Also update `::selection` to work in dark mode — the current rule uses `--sandstone` which will adapt automatically via the variable override, so no change needed.

- [ ] **Step 2: Add the inline theme-detection script in `<head>`**

Insert this immediately after the closing `</script>` of the JSON-LD block (after line 60) and before the `<style>` tag:

```html
<script>
(function(){var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t);document.querySelector('meta[name="theme-color"]').content=t==='dark'?'#1a1917':'#2c2a26'})();
</script>
```

- [ ] **Step 3: Add the global toggleTheme function**

Add this to the existing `<script>` block at the bottom of the page (before the filter logic, around line 1151):

```javascript
window.toggleTheme = function() {
  var html = document.documentElement;
  var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = next === 'dark' ? '#1a1917' : '#2c2a26';
};
```

- [ ] **Step 4: Verify dark mode works**

Open the homepage in a browser. Open console, run `toggleTheme()`. All backgrounds, text, borders should flip to warm dark tones. Reload — should persist. Toggle back — should return to light.

- [ ] **Step 5: Commit**

```bash
git add majestic-travels-blog.html
git commit -m "feat: add dark mode CSS foundation with variable overrides and toggle"
```

---

### Task 2: Navbar Redesign

**Goal:** Replace the solid sandstone navbar with a transparent frosted-glass nav that transitions to solid on scroll. Add dark-mode toggle button, hamburger menu for mobile. Remove social icons from nav.

**Files:**
- Modify: `majestic-travels-blog.html:154-228` (nav CSS)
- Modify: `majestic-travels-blog.html:396-404` (mobile media queries for nav)
- Modify: `majestic-travels-blog.html:929-954` (nav HTML)
- Modify: `majestic-travels-blog.html:1151-1189` (add IntersectionObserver JS + hamburger toggle)

**Acceptance Criteria:**
- [ ] Nav is transparent with `backdrop-filter: blur(12px)` over the hero
- [ ] Nav transitions to solid `var(--cream)` with bottom border when scrolled past hero
- [ ] Dark-mode toggle button (sun/moon SVG) calls `toggleTheme()`
- [ ] Hamburger menu on mobile (≤480px) with slide-down panel
- [ ] Social icons removed from nav
- [ ] Nav links: Stories, Destinations, About
- [ ] Text is light (`#faf6f0`) when transparent, `var(--ink)` when solid
- [ ] Works in both light and dark mode

**Verify:** Open homepage. Nav should be transparent over hero. Scroll past hero → nav becomes solid with border. Click sun/moon → theme toggles. Resize to 480px → hamburger appears, click it → menu slides down.

**Steps:**

- [ ] **Step 1: Replace the nav CSS**

Replace the nav CSS section (from `/* ─── NAV ───` through `.footer-socials svg { ... }` — lines 154-250) with:

```css
/* ─── NAV ─────────────────────────────────────────────────────── */

.site-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(44, 42, 38, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  border-bottom: 1px solid transparent;
}

[data-theme="dark"] .site-nav {
  background: rgba(26, 25, 23, 0.3);
}

.site-nav.nav-solid {
  background: var(--cream);
  border-bottom-color: var(--line);
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
}

.nav-inner {
  max-width: var(--max);
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: #faf6f0;
  transition: color 0.2s;
}

.nav-solid .nav-brand { color: var(--ink); }

.nav-logo {
  height: 30px;
  width: auto;
  filter: brightness(0) invert(1);
  transition: filter 0.2s;
}

.nav-solid .nav-logo { filter: none; }
[data-theme="dark"] .nav-solid .nav-logo { filter: brightness(0) invert(1); }

.nav-brand-name {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 650;
  font-variation-settings: "SOFT" 70, "WONK" 1;
}

.nav-menu {
  list-style: none;
  display: flex;
  gap: 2rem;
  padding: 0;
}

.nav-menu a {
  color: rgba(250, 246, 240, 0.85);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  transition: color 0.2s;
}

.nav-solid .nav-menu a { color: var(--ink-soft); }
.nav-menu a:hover { color: #faf6f0; }
.nav-solid .nav-menu a:hover { color: var(--ink); }

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.theme-toggle {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(250, 246, 240, 0.3);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
  color: rgba(250, 246, 240, 0.85);
}

.nav-solid .theme-toggle {
  border-color: var(--line-strong);
  color: var(--ink-soft);
}

.theme-toggle:hover {
  border-color: rgba(250, 246, 240, 0.6);
  color: #faf6f0;
}

.nav-solid .theme-toggle:hover {
  border-color: var(--ink);
  color: var(--ink);
}

.theme-toggle svg { width: 16px; height: 16px; }
.theme-toggle .icon-moon { display: none; }
[data-theme="dark"] .theme-toggle .icon-sun { display: none; }
[data-theme="dark"] .theme-toggle .icon-moon { display: block; }

.nav-hamburger {
  display: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(250, 246, 240, 0.3);
  border-radius: var(--radius);
  background: transparent;
  cursor: pointer;
  color: rgba(250, 246, 240, 0.85);
  transition: border-color 0.2s, color 0.2s;
}

.nav-solid .nav-hamburger {
  border-color: var(--line-strong);
  color: var(--ink-soft);
}

.nav-hamburger svg { width: 18px; height: 18px; }

.nav-mobile-panel {
  display: none;
  position: absolute;
  top: 62px;
  left: 0;
  right: 0;
  background: var(--cream);
  border-bottom: 1px solid var(--line);
  padding: 1rem 1.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.nav-mobile-panel.open { display: block; }

.nav-mobile-panel a {
  display: block;
  padding: 0.6rem 0;
  color: var(--ink);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 600;
  border-bottom: 1px solid var(--line);
}

.nav-mobile-panel a:last-child { border-bottom: none; }
.nav-mobile-panel a:hover { color: var(--clay); }

/* ─── FOOTER SOCIALS (used in footer only now) ───── */

.footer-socials {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 0.75rem;
}
.footer-socials a {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(250, 246, 240, 0.15);
  color: rgba(250, 246, 240, 0.5);
  transition: color 0.15s, border-color 0.15s;
}
.footer-socials a:hover {
  color: #faf6f0;
  border-color: rgba(250, 246, 240, 0.4);
}
.footer-socials svg { width: 16px; height: 16px; }
```

- [ ] **Step 2: Update the mobile media queries**

Replace the media query at line ~400 that hides `.nav-menu` and `.nav-socials`:

```css
@media (max-width: 480px) {
  .story-grid { grid-template-columns: 1fr; }
  .nav-menu { display: none; }
  .nav-hamburger { display: grid; }
}
```

- [ ] **Step 3: Replace the nav HTML**

Replace lines 929-954 (the `<nav>` element) with:

```html
<nav class="site-nav" aria-label="Main navigation">
  <div class="nav-inner">
    <a href="/" class="nav-brand">
      <img src="public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="nav-logo">
      <span class="nav-brand-name">Majestic Travels</span>
    </a>
    <ul class="nav-menu" role="list">
      <li><a href="#stories">Stories</a></li>
      <li><a href="#destinations">Destinations</a></li>
      <li><a href="#about">About</a></li>
    </ul>
    <div class="nav-actions">
      <button class="theme-toggle" aria-label="Toggle dark mode" onclick="toggleTheme()">
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      </button>
      <button class="nav-hamburger" aria-label="Menu" aria-expanded="false" onclick="document.querySelector('.nav-mobile-panel').classList.toggle('open');this.setAttribute('aria-expanded',this.getAttribute('aria-expanded')==='false'?'true':'false')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
    <div class="nav-mobile-panel">
      <a href="#stories">Stories</a>
      <a href="#destinations">Destinations</a>
      <a href="#about">About</a>
    </div>
  </div>
</nav>
```

- [ ] **Step 4: Add IntersectionObserver JS**

Add this at the top of the `<script>` block (inside the existing IIFE, before `var searchInput`):

```javascript
// Nav solid state on scroll
var hero = document.querySelector('.site-hero');
var nav = document.querySelector('.site-nav');
if (hero && nav) {
  var observer = new IntersectionObserver(function(entries) {
    nav.classList.toggle('nav-solid', !entries[0].isIntersecting);
  }, { threshold: 0 });
  observer.observe(hero);
}
```

- [ ] **Step 5: Verify navbar**

Open homepage. Nav should be transparent/blurred over hero. Scroll down → transitions to solid. Theme toggle works. Resize to ≤480px → hamburger visible, menu hidden, click hamburger → panel slides open.

- [ ] **Step 6: Commit**

```bash
git add majestic-travels-blog.html
git commit -m "feat: redesign navbar — frosted glass, dark mode toggle, mobile hamburger"
```

---

### Task 3: Destinations + NYC + Filtering

**Goal:** Add NYC as 6th destination card, change grid to 3×2, wire up destination cards to filter stories by scrolling to the stories section and applying a destination filter.

**Files:**
- Modify: `majestic-travels-blog.html:789-801` (destinations grid CSS — change to 3-column)
- Modify: `majestic-travels-blog.html:986-1007` (destinations HTML — add NYC card, add `data-destination` attrs)
- Modify: `majestic-travels-blog.html:1016-1021` (add destination filter indicator HTML)
- Modify: `majestic-travels-blog.html:1151-1189` (filter JS — add destination filtering logic)
- Modify: `scripts/build-blog.js:173-188` (cardHtml — add `data-destinations` attribute)

**Acceptance Criteria:**
- [ ] NYC card appears as 6th destination in a 3×2 grid
- [ ] Each destination card has `data-destination` attribute
- [ ] Clicking a destination card scrolls to stories and filters by destination
- [ ] Active destination filter pill with ✕ clear button appears above story grid
- [ ] Destination filter combines with topic pills and search
- [ ] URL updates with `?destination=x` query param
- [ ] Page load respects URL param to pre-apply filter
- [ ] Each story card has `data-destinations` attribute (output by build script)
- [ ] ≤480px: destinations become horizontal scroll strip

**Verify:** Run `node scripts/build-blog.js`, then open homepage. Click NYC card → scrolls to stories, shows only NYC stories with "New York City ✕" pill. Click "Guides" pill → further filters to NYC guides only. Click ✕ → clears destination filter. Add `?destination=new-york` to URL → auto-applies filter on load.

**Steps:**

- [ ] **Step 1: Update destinations grid CSS**

Replace the destinations CSS (lines ~789-844) with:

```css
/* ─── DESTINATIONS ───────────────────────────────────────────── */

.destinations-section {
  background: var(--cream);
  padding: 4rem 1.5rem;
}

.destinations-inner {
  max-width: var(--max);
  margin: 0 auto;
}

.destinations-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

@media (max-width: 768px) {
  .destinations-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .destinations-grid {
    grid-template-columns: none;
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.5rem;
  }
  .dest-card {
    flex: 0 0 140px;
    aspect-ratio: 3 / 4;
    scroll-snap-align: start;
  }
}

.dest-card {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--radius);
  background-image: var(--dest-img);
  background-size: cover;
  background-position: center;
  text-decoration: none;
  display: block;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.dest-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(24, 32, 28, 0.72) 0%, transparent 55%);
}

.dest-card:hover {
  transform: scale(1.03);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.dest-card:focus-visible {
  outline: 3px solid var(--sandstone);
  outline-offset: 3px;
}

.dest-card.dest-active {
  outline: 3px solid var(--sandstone);
  outline-offset: -3px;
}

.dest-name {
  position: absolute;
  bottom: 0.75rem;
  left: 0.75rem;
  right: 0.75rem;
  z-index: 1;
  color: #fff;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  font-variation-settings: "SOFT" 64, "WONK" 1;
  line-height: 1.2;
}

/* ─── DESTINATION FILTER INDICATOR ──────────── */

.dest-filter-indicator {
  display: none;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.dest-filter-indicator.active { display: flex; }

.dest-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  background: var(--sandstone);
  color: #fff;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
}

.dest-filter-clear {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0 0 0 0.25rem;
  opacity: 0.8;
}

.dest-filter-clear:hover { opacity: 1; }

.dest-filter-count {
  font-size: 0.82rem;
  color: var(--ink-soft);
}
```

- [ ] **Step 2: Update destinations HTML — add NYC card and data attributes**

Replace the destinations section HTML (lines ~986-1007) with:

```html
<section class="destinations-section" id="destinations" aria-label="Destinations">
  <div class="destinations-inner">
    <h2 class="section-heading">Destinations</h2>
    <div class="destinations-grid">
      <a class="dest-card" href="#stories" data-destination="dubai" style="--dest-img: url('public/site/abu-dhabi-night.jpg')">
        <span class="dest-name">Dubai & Abu Dhabi</span>
      </a>
      <a class="dest-card" href="#stories" data-destination="fuerteventura" style="--dest-img: url('public/site/fuerteventura-atlantic.jpg')">
        <span class="dest-name">Fuerteventura</span>
      </a>
      <a class="dest-card" href="#stories" data-destination="ljubljana" style="--dest-img: url('public/site/ljubljana-lake.jpg')">
        <span class="dest-name">Ljubljana</span>
      </a>
      <a class="dest-card" href="#stories" data-destination="marrakech" style="--dest-img: url('public/site/marrakech-palm-reflection.jpg')">
        <span class="dest-name">Marrakech</span>
      </a>
      <a class="dest-card" href="#stories" data-destination="vancouver" style="--dest-img: url('public/site/vancouver-cove.jpg')">
        <span class="dest-name">Vancouver</span>
      </a>
      <a class="dest-card" href="#stories" data-destination="new-york" style="--dest-img: linear-gradient(135deg, #4a5a6a, #2a3a4a)">
        <span class="dest-name">New York City</span>
      </a>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add destination filter indicator to stories section**

Insert this right after the `<div class="topic-pills" ...>...</div>` closing tag (after line ~1021), inside `.posts-controls`:

```html
<div class="dest-filter-indicator" id="destFilterIndicator">
  <span class="dest-filter-pill">
    <span id="destFilterName"></span>
    <button class="dest-filter-clear" id="destFilterClear" aria-label="Clear destination filter">&times;</button>
  </span>
  <span class="dest-filter-count" id="destFilterCount"></span>
</div>
```

- [ ] **Step 4: Update the filter JavaScript**

Replace the entire `<script>` block at the bottom (lines 1151-1189) with:

```html
<script>
window.toggleTheme = function() {
  var html = document.documentElement;
  var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = next === 'dark' ? '#1a1917' : '#2c2a26';
};

(function () {
  // Nav solid state on scroll
  var hero = document.querySelector('.site-hero');
  var nav = document.querySelector('.site-nav');
  if (hero && nav) {
    var navObserver = new IntersectionObserver(function(entries) {
      nav.classList.toggle('nav-solid', !entries[0].isIntersecting);
    }, { threshold: 0 });
    navObserver.observe(hero);
  }

  // Filtering
  var searchInput = document.getElementById("story-search");
  var pills = document.querySelectorAll(".pill");
  var grid = document.getElementById("storyGrid");
  var emptyState = document.getElementById("emptyState");
  var activeFilter = "all";
  var activeDest = "";

  var destIndicator = document.getElementById("destFilterIndicator");
  var destNameEl = document.getElementById("destFilterName");
  var destCountEl = document.getElementById("destFilterCount");
  var destCards = document.querySelectorAll(".dest-card[data-destination]");

  var DEST_LABELS = {
    "dubai": "Dubai & Abu Dhabi",
    "fuerteventura": "Fuerteventura",
    "ljubljana": "Ljubljana",
    "marrakech": "Marrakech",
    "vancouver": "Vancouver",
    "new-york": "New York City"
  };

  function getCards() {
    return grid.querySelectorAll(".story-card");
  }

  function filterCards() {
    var query = searchInput.value.toLowerCase().trim();
    var cards = getCards();
    var visible = 0;
    var total = cards.length;
    cards.forEach(function (card) {
      var matchesSearch = !query || card.dataset.search.toLowerCase().includes(query);
      var cardCategories = card.dataset.category ? card.dataset.category.split(" ") : [];
      var matchesTopic = activeFilter === "all" || cardCategories.includes(activeFilter);
      var matchesDest = !activeDest || (card.dataset.destinations && card.dataset.destinations.split(" ").indexOf(activeDest) !== -1);
      var show = matchesSearch && matchesTopic && matchesDest;
      card.hidden = !show;
      if (show) visible++;
    });
    emptyState.hidden = visible > 0;
    if (!activeDest) {
      emptyState.textContent = "No posts match your search.";
    } else if (visible === 0) {
      emptyState.textContent = "No stories from " + (DEST_LABELS[activeDest] || activeDest) + " yet — check back soon.";
    }

    // Update indicator
    if (activeDest) {
      destIndicator.classList.add("active");
      destNameEl.textContent = DEST_LABELS[activeDest] || activeDest;
      destCountEl.textContent = "Showing " + visible + " of " + total + " stories";
    } else {
      destIndicator.classList.remove("active");
    }

    // Highlight active dest card
    destCards.forEach(function(dc) {
      dc.classList.toggle("dest-active", dc.dataset.destination === activeDest);
    });
  }

  function setDestFilter(dest) {
    if (activeDest === dest) {
      activeDest = "";
      updateUrl("");
    } else {
      activeDest = dest;
      updateUrl(dest);
    }
    filterCards();
  }

  function updateUrl(dest) {
    var url = new URL(window.location);
    if (dest) {
      url.searchParams.set("destination", dest);
    } else {
      url.searchParams.delete("destination");
    }
    history.replaceState(null, "", url);
  }

  // Destination card clicks
  destCards.forEach(function(card) {
    card.addEventListener("click", function(e) {
      e.preventDefault();
      setDestFilter(card.dataset.destination);
      document.getElementById("stories").scrollIntoView({ behavior: "smooth" });
    });
  });

  // Clear destination filter
  var clearBtn = document.getElementById("destFilterClear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function() {
      activeDest = "";
      updateUrl("");
      filterCards();
    });
  }

  // Topic pills
  searchInput.addEventListener("input", filterCards);
  pills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      pills.forEach(function (p) { p.classList.remove("active"); });
      pill.classList.add("active");
      activeFilter = pill.dataset.filter;
      filterCards();
    });
  });

  // Apply URL params on load
  var params = new URLSearchParams(window.location.search);
  var destParam = params.get("destination");
  if (destParam && DEST_LABELS[destParam]) {
    activeDest = destParam;
    filterCards();
  }
})();
</script>
```

- [ ] **Step 5: Update build script — add `data-destinations` to story cards**

In `scripts/build-blog.js`, update the `cardHtml` function (lines 173-188). Add a destination mapping and output `data-destinations`:

Add this constant above the `cardHtml` function (around line 172):

```javascript
const DESTINATION_TAGS = {
  "dubai": ["Dubai", "Abu Dhabi"],
  "fuerteventura": ["Fuerteventura"],
  "ljubljana": ["Ljubljana"],
  "marrakech": ["Marrakech"],
  "vancouver": ["Vancouver"],
  "new-york": ["New York"]
};

function getDestinations(tags) {
  const dests = [];
  for (const [dest, keywords] of Object.entries(DESTINATION_TAGS)) {
    if (tags.some((tag) => keywords.some((kw) => tag.toLowerCase().includes(kw.toLowerCase())))) {
      dests.push(dest);
    }
  }
  return dests.join(" ");
}
```

Then update the `cardHtml` function to include `data-destinations`:

Replace the return statement in `cardHtml` (the template literal starting at line 178) — add `data-destinations` after `data-search`:

```javascript
function cardHtml(post) {
  const categorySlugs = [post.category, ...post.tags].map(slugify).join(" ");
  const search = [post.title, post.excerpt, post.category, post.tags.join(" "), post.keywords].join(" ");
  const meta = [post.categoryLabel, post.readTime].filter(Boolean).join(" · ");
  const destinations = getDestinations(post.tags);

  return `          <a class="story-card" href="${escapeHtml(post.url)}" data-category="${escapeHtml(categorySlugs)}" data-search="${escapeHtml(search)}" data-destinations="${escapeHtml(destinations)}">
            <div class="story-media">
              <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" loading="lazy" decoding="async">
            </div>
            <div class="story-body">
              <p class="story-meta">${escapeHtml(meta)}</p>
              <h3 class="story-title">${escapeHtml(post.title)}</h3>
              <p class="story-excerpt">${escapeHtml(post.excerpt)}</p>
            </div>
          </a>`;
}
```

- [ ] **Step 6: Rebuild and verify**

```bash
node scripts/build-blog.js
```

Open homepage. Verify NYC card is visible in 3×2 grid. Click it → scrolls to stories, shows NYC-tagged posts only. Click ✕ → clears filter. Check `?destination=new-york` URL loads with filter applied. Resize to mobile → destinations become horizontal scroll strip.

- [ ] **Step 7: Commit**

```bash
git add majestic-travels-blog.html scripts/build-blog.js
git commit -m "feat: add NYC destination, click-to-filter stories, URL param support"
```

---

### Task 4: Klaviyo Integration

**Goal:** Add a dedicated email signup section above the footer and wire both it and the footer form to Klaviyo using the client-side JS API (public key `VQW5sn`).

**Files:**
- Modify: `majestic-travels-blog.html` (add Klaviyo `<script>` tag, add dedicated section HTML/CSS, add form handler JS)
- Modify: `majestic-travels-blog.html:1108-1109` (insert new section between About and Footer)

**Acceptance Criteria:**
- [ ] Klaviyo client JS loaded async via CDN with company_id=VQW5sn
- [ ] Dedicated "Get exclusive itineraries" section rendered between About and Footer
- [ ] Footer newsletter form also wired to Klaviyo
- [ ] On submit: email sent to Klaviyo, inline success message ("You're in!")
- [ ] Loading state on submit (button disabled, shows "...")
- [ ] Error state if submission fails
- [ ] Both forms work in light and dark mode
- [ ] No page reload on submit

**Verify:** Open homepage, scroll to dedicated section. Enter email, click Subscribe → should show "You're in!" (or an error if Klaviyo rejects). Same for footer form. Check browser Network tab for Klaviyo API call.

**Steps:**

- [ ] **Step 1: Add Klaviyo script tag**

Add this in the `<head>`, after the Google Fonts `<link>` (after line 32):

```html
<script async src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=VQW5sn"></script>
```

- [ ] **Step 2: Add the dedicated newsletter section CSS**

Add this to the `<style>` block, after the `.about-cta:focus-visible` rule (after line ~905):

```css
/* ─── NEWSLETTER CTA SECTION ─────────────────────────────────── */

.newsletter-section {
  background: var(--cream-deep);
  padding: 5rem 1.5rem;
  text-align: center;
}

.newsletter-section-inner {
  max-width: 520px;
  margin: 0 auto;
}

.newsletter-section h2 {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 600;
  font-variation-settings: "SOFT" 64, "WONK" 1;
  color: var(--ink);
  margin-bottom: 0.75rem;
  line-height: 1.2;
}

.newsletter-section p {
  font-family: var(--font-body);
  font-size: 1.05rem;
  color: var(--ink-soft);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.newsletter-section .newsletter-form {
  max-width: 400px;
  margin: 0 auto;
}

.newsletter-section .newsletter-input {
  flex: 1;
  padding: 0.65rem 1rem;
  border: 1.5px solid var(--line-strong);
  background: var(--white);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.95rem;
  border-radius: var(--radius);
  outline: none;
}

.newsletter-section .newsletter-input:focus {
  border-color: var(--sandstone);
}

.newsletter-section .newsletter-input::placeholder {
  color: var(--ink-soft);
  opacity: 0.5;
}

.newsletter-section .newsletter-btn {
  padding: 0.65rem 1.25rem;
  background: var(--sandstone);
  color: #fff;
  border: none;
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: 700;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
}

.newsletter-section .newsletter-btn:hover {
  background: var(--clay);
}

.newsletter-section .newsletter-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.newsletter-note {
  font-size: 0.8rem;
  color: var(--ink-soft);
  margin-top: 0.75rem;
  opacity: 0.6;
}

.newsletter-success {
  font-family: var(--font-body);
  font-size: 1.05rem;
  color: var(--sandstone);
  font-weight: 700;
}

.newsletter-error {
  font-size: 0.85rem;
  color: var(--clay);
  margin-top: 0.5rem;
}
```

- [ ] **Step 3: Add the dedicated newsletter section HTML**

Insert this between the `<span id="newsletter">` anchor (line 1108) and the `<!-- FOOTER -->` comment (line 1110):

```html
<!-- NEWSLETTER CTA -->
<section class="newsletter-section" aria-label="Newsletter signup">
  <div class="newsletter-section-inner">
    <h2>Get exclusive itineraries & travel stories</h2>
    <p>Real destinations, honest tips — delivered to your inbox. No spam, ever.</p>
    <form class="newsletter-form" id="ctaNewsletterForm">
      <input type="email" placeholder="your@email.com" class="newsletter-input" aria-label="Email address" required>
      <button type="submit" class="newsletter-btn">Subscribe</button>
    </form>
    <p class="newsletter-note">Unsubscribe anytime</p>
  </div>
</section>
```

- [ ] **Step 4: Add Klaviyo form handler JS**

Add this inside the IIFE in the `<script>` block, after the URL param logic:

```javascript
// Klaviyo newsletter forms — uses Klaviyo's _learnq identify method
function handleNewsletterSubmit(form) {
  form.addEventListener("submit", function(e) {
    e.preventDefault();
    var input = form.querySelector("input[type='email']");
    var btn = form.querySelector("button[type='submit']");
    var email = input.value.trim();
    if (!email) return;

    var originalText = btn.textContent;
    btn.textContent = "...";
    btn.disabled = true;
    input.disabled = true;

    var prevError = form.parentNode.querySelector(".newsletter-error");
    if (prevError) prevError.remove();

    try {
      var _learnq = window._learnq || [];
      _learnq.push(["identify", { "$email": email }]);
      _learnq.push(["track", "Newsletter Signup", { source: "website" }]);
      window._learnq = _learnq;
      form.innerHTML = '<p class="newsletter-success">You\'re in! Check your inbox.</p>';
    } catch (err) {
      btn.textContent = originalText;
      btn.disabled = false;
      input.disabled = false;
      var errEl = document.createElement("p");
      errEl.className = "newsletter-error";
      errEl.textContent = "Something went wrong — try again.";
      form.parentNode.insertBefore(errEl, form.nextSibling);
    }
  });
}
```

- [ ] **Step 5: Add `id` to the footer newsletter form**

Update the existing footer form (currently `action="#"`) to have an id and remove the action:

Change `<form class="newsletter-form" action="#" method="post">` to `<form class="newsletter-form" id="footerNewsletterForm">` (this will be done in Task 5 when rewriting the footer, but if implementing separately, update it now).

- [ ] **Step 6: Verify**

Open homepage, scroll to the dedicated section above footer. Enter an email, click Subscribe → should show "You're in!" message. Check browser console for Klaviyo `identify` call. Same for footer form.

- [ ] **Step 7: Commit**

```bash
git add majestic-travels-blog.html
git commit -m "feat: add Klaviyo email integration with dedicated signup section"
```

---

### Task 5: Footer Redesign

**Goal:** Rewrite the footer as a centered, stacked layout with larger logo, inline link row, centered socials, and the newsletter form — always dark in both themes.

**Files:**
- Modify: `majestic-travels-blog.html:489-627` (footer CSS)
- Modify: `majestic-travels-blog.html:1111-1149` (footer HTML)

**Acceptance Criteria:**
- [ ] Footer uses centered, single-column stacked layout
- [ ] Logo is ~48px, centered
- [ ] Links are inline with `·` separators
- [ ] Social icons are centered below links
- [ ] Newsletter form is centered between tagline and links
- [ ] Footer stays dark in both light and dark mode (uses `--footer-bg`)
- [ ] Text is always light (cream tones)
- [ ] Duplicate social links removed (no separate icon + text versions)

**Verify:** Open homepage, scroll to footer. Layout should be centered stack: logo → name → tagline → newsletter → links → socials → copyright. Toggle dark mode → footer should stay dark (slightly darker in dark mode). Resize to mobile → should still look good (already single-column).

**Steps:**

- [ ] **Step 1: Replace footer CSS**

Replace the footer CSS section (from `/* ─── FOOTER ───` through `.footer-copy { ... }` — lines ~489-627) with:

```css
/* ─── FOOTER ──────────────────────────────────────────────────── */

.site-footer {
  background: var(--footer-bg);
  color: #faf6f0;
  padding: 3.5rem 1.5rem 2rem;
}

.footer-inner {
  max-width: var(--max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
}

.footer-logo {
  height: 48px;
  width: auto;
  filter: brightness(0) invert(1);
}

.footer-name {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  font-variation-settings: "SOFT" 70, "WONK" 1;
}

.footer-tagline {
  font-size: 0.875rem;
  opacity: 0.6;
  margin: 0;
}

.footer-newsletter {
  margin: 0.75rem 0;
}

.newsletter-label {
  font-size: 0.85rem;
  opacity: 0.6;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}
.newsletter-label svg {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}

.newsletter-form {
  display: flex;
  gap: 0.5rem;
  max-width: 360px;
  margin: 0 auto;
}

.newsletter-input {
  flex: 1;
  padding: 0.55rem 0.9rem;
  border: 1px solid rgba(250, 246, 240, 0.2);
  background: rgba(250, 246, 240, 0.07);
  color: #faf6f0;
  font-family: var(--font-body);
  font-size: 0.9rem;
  border-radius: var(--radius);
  outline: none;
}

.newsletter-input::placeholder {
  color: rgba(250, 246, 240, 0.38);
}

.newsletter-input:focus {
  border-color: rgba(250, 246, 240, 0.45);
}

.newsletter-btn {
  padding: 0.55rem 1.1rem;
  background: var(--sandstone);
  color: #fff;
  border: none;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
}

.newsletter-btn:hover {
  background: var(--clay);
}

.newsletter-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem 0.75rem;
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}

.footer-links li:not(:last-child)::after {
  content: "·";
  margin-left: 0.75rem;
  opacity: 0.4;
}

.footer-links a {
  opacity: 0.6;
  text-decoration: none;
  font-size: 0.9rem;
  transition: opacity 0.15s;
}

.footer-links a:hover { opacity: 1; }

.footer-copy {
  font-size: 0.78rem;
  opacity: 0.3;
  margin-top: 0.75rem;
}

@media (max-width: 480px) {
  .site-footer { padding: 2.5rem 1.5rem 1.5rem; }
}
```

- [ ] **Step 2: Replace footer HTML**

Replace the entire footer (lines ~1111-1149) with:

```html
<footer class="site-footer">
  <div class="footer-inner">
    <img src="public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="footer-logo">
    <span class="footer-name">Majestic Travels</span>
    <p class="footer-tagline">Solo travel. Real places. No filters.</p>
    <div class="footer-newsletter">
      <p class="newsletter-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg> Stay in the loop</p>
      <form class="newsletter-form" id="footerNewsletterForm">
        <input type="email" placeholder="your@email.com" class="newsletter-input" aria-label="Email address" required>
        <button type="submit" class="newsletter-btn">Subscribe</button>
      </form>
    </div>
    <ul class="footer-links">
      <li><a href="#stories">Stories</a></li>
      <li><a href="#destinations">Destinations</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="rss.xml">RSS</a></li>
    </ul>
    <div class="footer-socials">
      <a href="https://www.instagram.com/your_majestic_travels" target="_blank" rel="noopener" aria-label="Instagram">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
      </a>
      <a href="https://www.tiktok.com/@your_majestic_travels" target="_blank" rel="noopener" aria-label="TikTok">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.2 8.2 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z"/></svg>
      </a>
      <a href="https://ko-fi.com/majestictravels" target="_blank" rel="noopener" aria-label="Ko-fi">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/></svg>
      </a>
      <a href="https://majestictravels.gumroad.com/" target="_blank" rel="noopener" aria-label="Gumroad">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm4.656 16.104c-1.326 1.326-3.156 2.04-5.076 2.04-1.848 0-3.636-.684-5.016-1.944l1.14-1.14c1.08 1.008 2.46 1.56 3.876 1.56 1.488 0 2.904-.564 3.948-1.608s1.608-2.46 1.608-3.948-.564-2.904-1.608-3.948-2.46-1.608-3.948-1.608c-2.868 0-5.28 2.16-5.52 5.016h3.504L5.58 15.504 1.596 11.52h3.024c.252-4.08 3.636-7.32 7.8-7.32 2.148 0 4.068.828 5.544 2.304a7.785 7.785 0 012.304 5.544c-.012 2.076-.828 3.96-2.304 5.436l-.348-.384.036.048.004-.044z"/></svg>
      </a>
    </div>
    <p class="footer-copy">&copy; 2026 Majestic Travels</p>
  </div>
</footer>
```

- [ ] **Step 3: Verify**

Open homepage. Footer should be centered stack: logo (48px) → name → tagline → newsletter form → link row with dots → social circles → copyright. Toggle dark mode → footer darkens slightly but stays dark. Footer newsletter form should work with Klaviyo (wired in Task 4).

- [ ] **Step 4: Commit**

```bash
git add majestic-travels-blog.html
git commit -m "feat: redesign footer — centered stacked layout, always dark"
```

---

### Task 6: Sync Build Script for Article Pages

**Goal:** Mirror all homepage changes (dark mode, nav, footer, Klaviyo) into the `articleHtml()` function in `build-blog.js` so generated article pages match the homepage.

**Files:**
- Modify: `scripts/build-blog.js:190-443` (the `articleHtml` function)

**Acceptance Criteria:**
- [ ] Article pages include theme-detection inline script in `<head>`
- [ ] Article pages include all dark-mode CSS variable overrides
- [ ] Article pages use the new nav HTML (solid state only — no transparent/glass, no IntersectionObserver)
- [ ] Article pages include dark-mode toggle button in nav
- [ ] Article pages use the new centered footer HTML
- [ ] Article pages include Klaviyo script tag and newsletter form handlers
- [ ] Article pages include dedicated newsletter section above footer
- [ ] Nav links point to `../majestic-travels-blog.html#stories`, `../majestic-travels-blog.html#destinations`, `../majestic-travels-blog.html#about`
- [ ] Mobile hamburger menu works on article pages

**Verify:** Run `node scripts/build-blog.js`. Open any generated article (e.g. `blog/nyc-december-holiday-magic.html`). Verify: dark mode toggle works, nav is solid (not transparent), footer is centered stacked, newsletter form submits to Klaviyo. Test on mobile width: hamburger works.

**Steps:**

- [ ] **Step 1: Add theme-detection script to article `<head>`**

In the `articleHtml` function, add the inline theme script right after the `<style>` tag and before `</head>`:

After line 255 (`<style>${css}`), before `</head>`, insert:

```javascript
  <script>
  (function(){var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t);document.querySelector('meta[name="theme-color"]').content=t==='dark'?'#1a1917':'#2c2a26'})();
  </script>
```

Also add `<meta name="theme-color" content="#2c2a26">` to the article `<head>` if not already present.

- [ ] **Step 2: Replace the nav HTML in articleHtml**

Replace the nav block (lines ~309-334 in articleHtml) with the new nav. Article pages use `nav-solid` class by default (no hero to be transparent over):

```html
  <nav class="site-nav nav-solid" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="../majestic-travels-blog.html" class="nav-brand">
        <img src="../public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="nav-logo">
        <span class="nav-brand-name">Majestic Travels</span>
      </a>
      <ul class="nav-menu" role="list">
        <li><a href="../majestic-travels-blog.html#stories">Stories</a></li>
        <li><a href="../majestic-travels-blog.html#destinations">Destinations</a></li>
        <li><a href="../majestic-travels-blog.html#about">About</a></li>
      </ul>
      <div class="nav-actions">
        <button class="theme-toggle" aria-label="Toggle dark mode" onclick="toggleTheme()">
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
        </button>
        <button class="nav-hamburger" aria-label="Menu" aria-expanded="false" onclick="document.querySelector('.nav-mobile-panel').classList.toggle('open');this.setAttribute('aria-expanded',this.getAttribute('aria-expanded')==='false'?'true':'false')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
      <div class="nav-mobile-panel">
        <a href="../majestic-travels-blog.html#stories">Stories</a>
        <a href="../majestic-travels-blog.html#destinations">Destinations</a>
        <a href="../majestic-travels-blog.html#about">About</a>
      </div>
    </div>
  </nav>
```

- [ ] **Step 3: Replace the footer HTML in articleHtml**

Replace the footer block (lines ~395-433) with the new centered footer. Use `../` prefix for asset paths. Include the dedicated newsletter section above the footer:

```html
  <section class="newsletter-section" aria-label="Newsletter signup">
    <div class="newsletter-section-inner">
      <h2>Get exclusive itineraries & travel stories</h2>
      <p>Real destinations, honest tips — delivered to your inbox. No spam, ever.</p>
      <form class="newsletter-form" id="ctaNewsletterForm">
        <input type="email" placeholder="your@email.com" class="newsletter-input" aria-label="Email address" required>
        <button type="submit" class="newsletter-btn">Subscribe</button>
      </form>
      <p class="newsletter-note">Unsubscribe anytime</p>
    </div>
  </section>
  <footer class="site-footer">
    <div class="footer-inner">
      <img src="../public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="footer-logo">
      <span class="footer-name">Majestic Travels</span>
      <p class="footer-tagline">Solo travel. Real places. No filters.</p>
      <div class="footer-newsletter">
        <p class="newsletter-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg> Stay in the loop</p>
        <form class="newsletter-form" id="footerNewsletterForm">
          <input type="email" placeholder="your@email.com" class="newsletter-input" aria-label="Email address" required>
          <button type="submit" class="newsletter-btn">Subscribe</button>
        </form>
      </div>
      <ul class="footer-links">
        <li><a href="../majestic-travels-blog.html#stories">Stories</a></li>
        <li><a href="../majestic-travels-blog.html#destinations">Destinations</a></li>
        <li><a href="../majestic-travels-blog.html#about">About</a></li>
        <li><a href="../rss.xml">RSS</a></li>
      </ul>
      <div class="footer-socials">
        <!-- Same 4 social icons as homepage, identical SVGs -->
        <a href="https://www.instagram.com/your_majestic_travels" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg></a>
        <a href="https://www.tiktok.com/@your_majestic_travels" target="_blank" rel="noopener" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.2 8.2 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z"/></svg></a>
        <a href="https://ko-fi.com/majestictravels" target="_blank" rel="noopener" aria-label="Ko-fi"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/></svg></a>
        <a href="https://majestictravels.gumroad.com/" target="_blank" rel="noopener" aria-label="Gumroad"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm4.656 16.104c-1.326 1.326-3.156 2.04-5.076 2.04-1.848 0-3.636-.684-5.016-1.944l1.14-1.14c1.08 1.008 2.46 1.56 3.876 1.56 1.488 0 2.904-.564 3.948-1.608s1.608-2.46 1.608-3.948-.564-2.904-1.608-3.948-2.46-1.608-3.948-1.608c-2.868 0-5.28 2.16-5.52 5.016h3.504L5.58 15.504 1.596 11.52h3.024c.252-4.08 3.636-7.32 7.8-7.32 2.148 0 4.068.828 5.544 2.304a7.785 7.785 0 012.304 5.544c-.012 2.076-.828 3.96-2.304 5.436l-.348-.384.036.048.004-.044z"/></svg></a>
      </div>
      <p class="footer-copy">&copy; 2026 Majestic Travels</p>
    </div>
  </footer>
```

- [ ] **Step 4: Add article page script block**

Replace the existing script block at the bottom of articleHtml (lines ~434-441) with one that includes `toggleTheme` and the Klaviyo handler:

```html
  <script async src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=VQW5sn"></script>
  <script>
    window.toggleTheme = function() {
      var html = document.documentElement;
      var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = next === 'dark' ? '#1a1917' : '#2c2a26';
    };
    (function() {
      function handleNewsletterSubmit(form) {
        form.addEventListener("submit", function(e) {
          e.preventDefault();
          var input = form.querySelector("input[type='email']");
          var btn = form.querySelector("button[type='submit']");
          var email = input.value.trim();
          if (!email) return;
          var originalText = btn.textContent;
          btn.textContent = "...";
          btn.disabled = true;
          input.disabled = true;
          var prevError = form.parentNode.querySelector(".newsletter-error");
          if (prevError) prevError.remove();
          try {
            var _learnq = window._learnq || [];
            _learnq.push(["identify", { "$email": email }]);
            _learnq.push(["track", "Newsletter Signup", { source: "website" }]);
            window._learnq = _learnq;
            form.innerHTML = '<p class="newsletter-success">You\\'re in! Check your inbox.</p>';
          } catch (err) {
            btn.textContent = originalText;
            btn.disabled = false;
            input.disabled = false;
            var errEl = document.createElement("p");
            errEl.className = "newsletter-error";
            errEl.textContent = "Something went wrong — try again.";
            form.parentNode.insertBefore(errEl, form.nextSibling);
          }
        });
      }
      var ctaForm = document.getElementById("ctaNewsletterForm");
      if (ctaForm) handleNewsletterSubmit(ctaForm);
      var footerForm = document.getElementById("footerNewsletterForm");
      if (footerForm) handleNewsletterSubmit(footerForm);
      document.querySelectorAll("img").forEach(function(image) {
        var markBroken = function() { image.classList.add("is-broken"); };
        image.addEventListener("error", markBroken, { once: true });
        if (image.complete && image.naturalWidth === 0) markBroken();
      });
    })();
  </script>
```

- [ ] **Step 5: Rebuild and verify**

```bash
node scripts/build-blog.js
```

Open `blog/nyc-december-holiday-magic.html`. Verify: dark mode toggle works, nav is solid with correct links, footer is centered stacked, newsletter forms appear and submit to Klaviyo. Mobile hamburger works.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-blog.js
git commit -m "feat: sync article page template with homepage redesign"
```

---

### Task 7: Final Verification & Cleanup

**Goal:** Run the full build, verify all features work together end-to-end, fix any integration issues.

**Files:**
- Potentially fix: `majestic-travels-blog.html`, `scripts/build-blog.js`

**Acceptance Criteria:**
- [ ] `node scripts/build-blog.js` completes without errors
- [ ] Homepage: all 5 features work together (dark mode, nav, destinations, Klaviyo, footer)
- [ ] Article pages: dark mode, nav, footer, Klaviyo all work
- [ ] Mobile responsive: hamburger menu, destination scroll strip, footer all work at 480px
- [ ] No console errors in browser
- [ ] Theme persists across page navigations (homepage → article → back)
- [ ] Destination filter URL param works

**Verify:** Run `node scripts/build-blog.js`. Open homepage in browser. Test the full flow: toggle dark mode → click NYC destination → stories filter → click an article → verify dark mode persisted → verify article footer/nav match → go back → verify filter state.

**Steps:**

- [ ] **Step 1: Run build**

```bash
node scripts/build-blog.js
```

Expected: `Built 6 posts.` and no errors.

- [ ] **Step 2: Full E2E browser test**

Open `majestic-travels-blog.html`. Walk through:
1. Toggle dark mode on → verify all sections look correct
2. Scroll → nav transitions to solid
3. Click NYC destination → scrolls to stories, filters applied
4. Click "Guides" pill → further filters
5. Click ✕ → clears destination
6. Scroll to dedicated newsletter section → enter email → subscribe
7. Scroll to footer → verify centered layout, newsletter form
8. Click a story card → opens article page
9. On article page: verify dark mode persisted, nav is solid, footer is centered, newsletter forms present
10. Toggle dark mode on article page → verify
11. Resize to 480px → verify hamburger, destination scroll strip, stacked footer

- [ ] **Step 3: Fix any issues found**

Address any integration bugs or visual glitches.

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add majestic-travels-blog.html scripts/build-blog.js
git commit -m "fix: integration fixes from final verification"
```

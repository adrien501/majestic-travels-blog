# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul majestic-travels.com homepage with a unified teal brand identity, clean hero using existing PNG assets, compact 3-col posts grid with live search and topic filters, and a simple footer with newsletter — without touching article pages.

**Architecture:** The homepage lives in `majestic-travels-blog.html` (HTML + embedded `<style>` + `<script>`). The build script `scripts/build-blog.js` injects post cards into a `<div class="story-grid" id="storyGrid">` anchor in that file. Approach: (1) update the card template in the build script, (2) append new CSS to the existing style block (overriding body background, adding new section styles), (3) replace the body HTML with the new structure while preserving the story-grid anchor strings the build script depends on.

**Tech Stack:** Vanilla HTML/CSS/JS, Node.js build scripts, no dependencies added.

---

### Task 0: Update card template in build-blog.js

**Goal:** Replace the current `cardHtml()` output with a clean linked card: image, category+readtime, title, excerpt.

**Files:**
- Modify: `scripts/build-blog.js` (lines 173–198, the `cardHtml` function)

**Acceptance Criteria:**
- [ ] `cardHtml()` returns an `<a>` element (not `<article>`) that wraps the whole card
- [ ] Card has `.story-card` class and `data-category` + `data-search` attributes preserved
- [ ] Card contains: image (16:9 container), `.story-meta` (category · readtime), `.story-title` (h3), `.story-excerpt` (excerpt)
- [ ] No entry code, no `<details>`, no `.story-footer`, no `.story-date` span
- [ ] `npm run build:blog` runs without errors after the change

**Verify:** `cd "C:\Users\Adrien\Desktop\Majestic Travels" && npm run build:blog` → output: `Built 6 posts.`

**Steps:**

- [ ] **Step 1: Replace the cardHtml function body**

In `scripts/build-blog.js`, find and replace the entire `cardHtml` function (lines 173–198) with:

```javascript
function cardHtml(post) {
  const categorySlugs = [post.category, ...post.tags].map(slugify).join(" ");
  const search = [post.title, post.excerpt, post.category, post.tags.join(" "), post.keywords].join(" ");
  const meta = [post.categoryLabel, post.readTime].filter(Boolean).join(" · ");

  return `          <a class="story-card" href="${escapeHtml(post.url)}" data-category="${escapeHtml(categorySlugs)}" data-search="${escapeHtml(search)}">
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

- [ ] **Step 2: Verify build runs**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
npm run build:blog
```

Expected output:
```
Built 6 posts.
Updated majestic-travels-blog.html, blog/*.html, sitemap.xml, robots.txt, and rss.xml.
```

- [ ] **Step 3: Commit**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
git add scripts/build-blog.js
git commit -m "refactor: simplify story card markup for redesign"
```

---

### Task 1: Add new homepage CSS to the style block

**Goal:** Override the busy background pattern, add design token `--ocean`, and add all CSS for the new nav, hero, posts section, cards, and footer.

**Files:**
- Modify: `majestic-travels-blog.html` (append CSS before `</style>`)

**Acceptance Criteria:**
- [ ] `--ocean: #0e6674` and `--ocean-dark: #0a4f5e` added to `:root`
- [ ] `body` background is plain `var(--paper)` (the gradient/dot-grid pattern is gone)
- [ ] `body::before` (the rotated side text) is hidden
- [ ] All new section classes exist: `.site-nav`, `.site-hero`, `.posts-section`, `.story-grid` (3-col), `.story-card`, `.pill`, `.site-footer`
- [ ] Article page styles are untouched (they rely on the same `<style>` block)

**Verify:** Open `majestic-travels-blog.html` in a browser — page background should be plain warm paper, no dot grid, no stripe.

**Steps:**

- [ ] **Step 1: Add `--ocean` tokens to `:root`**

In `majestic-travels-blog.html`, find:
```css
      --volcanic: #2b2925;
```
Replace with:
```css
      --volcanic: #2b2925;
      --ocean: #0e6674;
      --ocean-dark: #0a4f5e;
```

- [ ] **Step 2: Override body background and hide the side stripe**

Find the closing `</style>` tag and insert the following block immediately before it:

```css
    /* ─── HOMEPAGE REDESIGN OVERRIDES ─────────────────────────────── */

    body {
      background: var(--paper);
    }

    body::before {
      display: none;
    }

    /* ─── NAV ─────────────────────────────────────────────────────── */

    .site-nav {
      background: var(--ocean);
      position: sticky;
      top: 0;
      z-index: 100;
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
      color: var(--paper);
    }

    .nav-logo {
      height: 30px;
      width: auto;
      filter: brightness(0) invert(1);
    }

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
      color: rgba(246, 236, 220, 0.85);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .nav-menu a:hover {
      color: var(--paper);
      text-decoration: underline;
    }

    /* ─── HERO ────────────────────────────────────────────────────── */

    .site-hero {
      background: var(--ocean);
      padding: 4rem 1.5rem 5rem;
      text-align: center;
    }

    .hero-inner {
      max-width: 560px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
    }

    .hero-logomark {
      height: 80px;
      width: auto;
      filter: brightness(0) invert(1);
    }

    .hero-wordmark {
      max-width: 360px;
      width: 100%;
      height: auto;
      filter: brightness(0) invert(1);
    }

    .hero-tagline {
      color: rgba(246, 236, 220, 0.82);
      font-family: var(--font-body);
      font-size: 1.1rem;
      font-weight: 400;
      margin: 0;
    }

    .hero-cta {
      display: inline-block;
      margin-top: 0.25rem;
      padding: 0.6rem 1.75rem;
      border: 2px solid var(--paper);
      color: var(--paper);
      text-decoration: none;
      font-family: var(--font-body);
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: 2px;
      transition: background 0.18s, color 0.18s;
    }

    .hero-cta:hover {
      background: var(--paper);
      color: var(--ocean);
    }

    /* ─── POSTS SECTION ───────────────────────────────────────────── */

    .posts-section {
      background: var(--paper);
      padding: 4rem 1.5rem 5rem;
    }

    .posts-inner {
      max-width: var(--max);
      margin: 0 auto;
    }

    .posts-heading {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 600;
      font-variation-settings: "SOFT" 64, "WONK" 1;
      color: var(--ink);
      display: inline-block;
      margin-bottom: 2rem;
      padding-bottom: 0.4rem;
      border-bottom: 3px solid var(--ocean);
    }

    .posts-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2.5rem;
    }

    .search-input {
      width: 100%;
      max-width: 400px;
      padding: 0.6rem 1rem;
      border: 1.5px solid var(--line-strong);
      border-radius: var(--radius);
      font-family: var(--font-body);
      font-size: 0.95rem;
      background: var(--white);
      color: var(--ink);
      outline: none;
    }

    .search-input:focus {
      border-color: var(--ocean);
    }

    .topic-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .pill {
      padding: 0.35rem 1rem;
      border: 1.5px solid var(--ocean);
      border-radius: 999px;
      background: transparent;
      color: var(--ocean);
      font-family: var(--font-body);
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .pill.active,
    .pill:hover {
      background: var(--ocean);
      color: var(--paper);
    }

    /* ─── STORY GRID + CARDS ──────────────────────────────────────── */

    .story-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }

    @media (max-width: 768px) {
      .story-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 480px) {
      .story-grid { grid-template-columns: 1fr; }
      .nav-menu { display: none; }
    }

    .story-card {
      background: var(--white);
      border-radius: var(--radius);
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.2s, transform 0.2s;
    }

    .story-card:hover {
      box-shadow: 0 8px 28px rgba(24, 32, 28, 0.12);
      transform: translateY(-2px);
    }

    .story-card .story-media {
      position: relative;
      aspect-ratio: 16 / 9;
      overflow: hidden;
    }

    .story-card .story-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .story-card .story-body {
      padding: 1.25rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .story-card .story-meta {
      font-family: var(--font-body);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ocean);
    }

    .story-card .story-title {
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 600;
      font-variation-settings: "SOFT" 64, "WONK" 1;
      color: var(--ink);
      line-height: 1.25;
      transition: color 0.15s;
      margin: 0;
    }

    .story-card:hover .story-title {
      color: var(--ocean);
    }

    .story-card .story-excerpt {
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: var(--ink-soft);
      line-height: 1.55;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
    }

    .empty {
      text-align: center;
      padding: 3rem 0;
      color: var(--ink-soft);
      font-family: var(--font-body);
      font-size: 1rem;
    }

    /* ─── FOOTER ──────────────────────────────────────────────────── */

    .site-footer {
      background: var(--ink);
      color: var(--paper);
      padding: 3rem 1.5rem 2rem;
    }

    .footer-inner {
      max-width: var(--max);
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 2rem;
      align-items: start;
    }

    @media (max-width: 600px) {
      .footer-inner { grid-template-columns: 1fr; }
    }

    .footer-brand {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .footer-logo {
      height: 34px;
      width: auto;
      filter: brightness(0) invert(1);
      margin-bottom: 0.25rem;
    }

    .footer-name {
      font-family: var(--font-display);
      font-size: 1.1rem;
      font-weight: 600;
      font-variation-settings: "SOFT" 70, "WONK" 1;
      color: var(--paper);
    }

    .footer-tagline {
      font-size: 0.875rem;
      color: rgba(246, 236, 220, 0.6);
      margin: 0;
    }

    .footer-nav {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .footer-nav a {
      color: rgba(246, 236, 220, 0.7);
      text-decoration: none;
      font-size: 0.9rem;
    }

    .footer-nav a:hover {
      color: var(--paper);
      text-decoration: underline;
    }

    .footer-newsletter {
      grid-column: 1 / -1;
      border-top: 1px solid rgba(246, 236, 220, 0.12);
      padding-top: 1.5rem;
      margin-top: 0.5rem;
    }

    .newsletter-label {
      font-size: 0.9rem;
      color: rgba(246, 236, 220, 0.7);
      margin-bottom: 0.75rem;
    }

    .newsletter-form {
      display: flex;
      gap: 0.5rem;
      max-width: 380px;
    }

    .newsletter-input {
      flex: 1;
      padding: 0.55rem 0.9rem;
      border: 1px solid rgba(246, 236, 220, 0.2);
      background: rgba(246, 236, 220, 0.07);
      color: var(--paper);
      font-family: var(--font-body);
      font-size: 0.9rem;
      border-radius: var(--radius);
      outline: none;
    }

    .newsletter-input::placeholder {
      color: rgba(246, 236, 220, 0.38);
    }

    .newsletter-input:focus {
      border-color: rgba(246, 236, 220, 0.45);
    }

    .newsletter-btn {
      padding: 0.55rem 1.1rem;
      background: var(--ocean);
      color: var(--paper);
      border: none;
      font-family: var(--font-body);
      font-size: 0.9rem;
      font-weight: 700;
      border-radius: var(--radius);
      cursor: pointer;
      transition: background 0.15s;
    }

    .newsletter-btn:hover {
      background: var(--ocean-dark);
    }

    .footer-copy {
      grid-column: 1 / -1;
      font-size: 0.8rem;
      color: rgba(246, 236, 220, 0.35);
      padding-top: 1.5rem;
      margin-top: 0.5rem;
      border-top: 1px solid rgba(246, 236, 220, 0.08);
    }
```

- [ ] **Step 3: Verify visually**

Open `majestic-travels-blog.html` in a browser. Background should be plain paper, no dot grid, no stripe text on the left side.

---

### Task 2: Replace homepage body HTML

**Goal:** Remove all old homepage sections and replace with the new nav + hero + posts (with story-grid anchor) + footer. Add the search/filter script.

**Files:**
- Modify: `majestic-travels-blog.html` (the `<body>` content, preserve `<head>` and `<style>`)

**Acceptance Criteria:**
- [ ] `<body>` contains exactly: `.site-nav`, `.site-hero`, `.posts-section`, `.site-footer`, and a `<script>` block
- [ ] `<div class="story-grid" id="storyGrid">` is present (exact string — build script anchor)
- [ ] `<p class="empty"` follows with exactly 8 spaces of indentation and a blank line after `</div>` (build script anchor)
- [ ] Brand PNGs referenced correctly: `public/logo_cleanedup_centered_transparant-01.png`, `public/plain_name_crop.png`
- [ ] Search and topic filter JS works: typing filters cards, clicking pills filters by category, both work together
- [ ] `npm run build:blog` still injects cards correctly into the story-grid after the HTML change
- [ ] `npm run prepare:publish` passes with no errors

**Verify:** `cd "C:\Users\Adrien\Desktop\Majestic Travels" && npm run prepare:publish` → `Built 6 posts. ... Blog check passed.`

**Steps:**

- [ ] **Step 1: Replace the entire `<body>` content**

In `majestic-travels-blog.html`, find the opening `<body>` tag and replace everything from `<body>` to `</body>` (inclusive) with:

```html
<body>
  <a class="skip-link" href="#stories">Skip to stories</a>

  <!-- NAV -->
  <nav class="site-nav" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="/" class="nav-brand">
        <img src="public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="nav-logo">
        <span class="nav-brand-name">Majestic Travels</span>
      </a>
      <ul class="nav-menu" role="list">
        <li><a href="#stories">Stories</a></li>
        <li><a href="/rss.xml">RSS</a></li>
      </ul>
    </div>
  </nav>

  <!-- HERO -->
  <header class="site-hero">
    <div class="hero-inner">
      <img src="public/logo_cleanedup_centered_transparant-01.png" alt="" class="hero-logomark" aria-hidden="true">
      <img src="public/plain_name_crop.png" alt="Majestic Travels" class="hero-wordmark">
      <p class="hero-tagline">Solo travel. Real places. No filters.</p>
      <a href="#stories" class="hero-cta">Read the stories ↓</a>
    </div>
  </header>

  <!-- POSTS -->
  <section class="posts-section" id="stories">
    <div class="posts-inner">
      <h2 class="posts-heading">Stories</h2>
      <div class="posts-controls">
        <input type="search" id="searchInput" placeholder="Search posts…" class="search-input" aria-label="Search posts">
        <div class="topic-pills" role="group" aria-label="Filter by topic">
          <button class="pill active" data-filter="all">All</button>
          <button class="pill" data-filter="essay">Essays</button>
          <button class="pill" data-filter="guide">Guides</button>
          <button class="pill" data-filter="field-notes">Field Notes</button>
        </div>
      </div>
        <div class="story-grid" id="storyGrid">
        </div>

        <p class="empty" id="emptyState" hidden>No posts match your search.</p>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <img src="public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="footer-logo">
        <span class="footer-name">Majestic Travels</span>
        <p class="footer-tagline">Solo travel. Real places. No filters.</p>
      </div>
      <nav class="footer-nav" aria-label="Footer navigation">
        <a href="#stories">Stories</a>
        <a href="/rss.xml">RSS</a>
      </nav>
      <div class="footer-newsletter">
        <p class="newsletter-label">✉ Stay in the loop</p>
        <form class="newsletter-form" action="#" method="post">
          <input type="email" placeholder="your@email.com" class="newsletter-input" aria-label="Email address">
          <button type="submit" class="newsletter-btn">Subscribe</button>
        </form>
      </div>
      <p class="footer-copy">© 2026 Majestic Travels</p>
    </div>
  </footer>

  <script>
    (function () {
      var searchInput = document.getElementById("searchInput");
      var pills = document.querySelectorAll(".pill");
      var grid = document.getElementById("storyGrid");
      var emptyState = document.getElementById("emptyState");
      var activeFilter = "all";

      function getCards() {
        return grid.querySelectorAll(".story-card");
      }

      function filterCards() {
        var query = searchInput.value.toLowerCase().trim();
        var cards = getCards();
        var visible = 0;
        cards.forEach(function (card) {
          var matchesSearch = !query || card.dataset.search.toLowerCase().includes(query);
          var cardCategories = card.dataset.category ? card.dataset.category.split(" ") : [];
          var matchesTopic = activeFilter === "all" || cardCategories.includes(activeFilter);
          var show = matchesSearch && matchesTopic;
          card.hidden = !show;
          if (show) visible++;
        });
        emptyState.hidden = visible > 0;
      }

      searchInput.addEventListener("input", filterCards);

      pills.forEach(function (pill) {
        pill.addEventListener("click", function () {
          pills.forEach(function (p) { p.classList.remove("active"); });
          pill.classList.add("active");
          activeFilter = pill.dataset.filter;
          filterCards();
        });
      });
    })();
  </script>
</body>
```

> **Critical:** The `<div class="story-grid" id="storyGrid">` and the `</div>` + blank line + `<p class="empty"` pattern must remain exactly as shown above — the build script relies on these as anchors to inject post cards.

- [ ] **Step 2: Run the full build to verify the anchor strings are intact**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
npm run prepare:publish
```

Expected:
```
Built 6 posts.
Updated majestic-travels-blog.html, blog/*.html, sitemap.xml, robots.txt, and rss.xml.
Blog check passed: 6 posts, 7 HTML pages, sitemap, robots, and RSS are ready.
Prepared dist for upload.
Files: 21
```

If `build-blog.js` throws `"Could not find the homepage story grid"`, the anchor strings are off — re-check the indentation of `<div class="story-grid"` and the blank line before `<p class="empty"`.

- [ ] **Step 3: Open dist/index.html in a browser and verify**

- Teal nav and hero visible, brand PNGs showing
- 6 post cards in a 3-column grid
- Search input filters cards as you type
- Topic pills filter by category
- Footer with newsletter form visible

- [ ] **Step 4: Commit**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
git add majestic-travels-blog.html
git commit -m "feat: homepage redesign — teal brand, hero PNGs, 3-col grid, search + filter"
```

---

### Task 3: Push and verify live site

**Goal:** Push to GitHub, confirm Cloudflare Pages deploys successfully, verify the live site.

**Files:** None (git operation only)

**Acceptance Criteria:**
- [ ] `git push` succeeds
- [ ] Cloudflare Pages build log shows success (no errors)
- [ ] `https://majestic-travels.com` loads the new homepage

**Verify:** Visit `https://majestic-travels.com` — teal hero, brand PNGs, post grid visible.

**Steps:**

- [ ] **Step 1: Push to GitHub**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
git push
```

- [ ] **Step 2: Monitor Cloudflare Pages build**

Go to `https://dash.cloudflare.com` → Pages → `majestic-travels-blog` → watch the latest deployment. Build takes ~30–60 seconds.

- [ ] **Step 3: Verify live site**

Visit `https://majestic-travels.com` and confirm:
- Teal nav + hero with brand PNGs
- 6 post cards in 3-column grid
- Search and topic pills work
- Click through to one article — layout should be unchanged

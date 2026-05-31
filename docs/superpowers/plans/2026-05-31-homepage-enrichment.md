# Homepage Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four visual improvements to the homepage: photo background in the hero, auto-injected featured post card, destinations strip with 5 photo cards, and a short about section.

**Architecture:** All changes are in `majestic-travels-blog.html` (CSS appended to existing `<style>` block, HTML sections inserted into `<body>`) and `scripts/build-blog.js` (new `updateFeatured()` function). The build script already injects post cards into a `<div id="storyGrid">` anchor — the same pattern is used for the featured post via a new `<div id="featuredPost">` anchor.

**Tech Stack:** Vanilla HTML/CSS, Node.js build scripts. No new dependencies.

---

### Task 0: Hero photo background

**Goal:** Replace the solid teal hero with a full-bleed travel photo behind a teal semi-transparent overlay, height bumped to 60vh.

**Files:**
- Modify: `majestic-travels-blog.html` (`.site-hero` CSS rule, currently around line 1903)

**Acceptance Criteria:**
- [ ] `.site-hero` has `background-image` using `marrakech-palm-reflection.jpg` with a teal gradient overlay
- [ ] Hero is at least `60vh` tall
- [ ] Brand PNGs and tagline remain vertically centred
- [ ] `npm run prepare:publish` passes with no errors

**Verify:** `cd "C:\Users\Adrien\Desktop\Majestic Travels" && npm run prepare:publish` → `Built 6 posts. Blog check passed.`

**Steps:**

- [ ] **Step 1: Replace the `.site-hero` CSS rule**

In `majestic-travels-blog.html`, find:
```css
    .site-hero {
      background: var(--ocean);
      padding: 4rem 1.5rem 5rem;
      text-align: center;
    }
```

Replace with:
```css
    .site-hero {
      background:
        linear-gradient(rgba(14, 102, 116, 0.75), rgba(14, 102, 116, 0.75)),
        url('public/site/marrakech-palm-reflection.jpg') center / cover no-repeat;
      min-height: 60vh;
      padding: 4rem 1.5rem 5rem;
      text-align: center;
      display: flex;
      align-items: center;
    }
```

- [ ] **Step 2: Verify build passes**

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

- [ ] **Step 3: Commit**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
git add majestic-travels-blog.html
git commit -m "feat: hero photo background with teal overlay"
```

---

### Task 1: Featured post section

**Goal:** Auto-inject the most recent post as a large lead card between the hero and the stories grid, via a new `updateFeatured()` function in the build script.

**Files:**
- Modify: `majestic-travels-blog.html` (insert anchor div + CSS for featured section)
- Modify: `scripts/build-blog.js` (add `updateFeatured()`, call in `main()`)

**Acceptance Criteria:**
- [ ] `<div id="featuredPost"></div>` anchor present in HTML between `</header>` and `<section class="posts-section">`
- [ ] `updateFeatured()` in build-blog.js replaces the anchor with the featured card HTML
- [ ] Featured card shows: `★ Featured` label, category · readtime meta, title, excerpt, `Read story →` link
- [ ] `npm run build:blog` injects the card; `npm run prepare:publish` passes

**Verify:** `cd "C:\Users\Adrien\Desktop\Majestic Travels" && npm run prepare:publish` → `Built 6 posts. Blog check passed.`

**Steps:**

- [ ] **Step 1: Add the featured post anchor to the HTML**

In `majestic-travels-blog.html`, find:
```html
  <!-- POSTS -->
  <section class="posts-section" id="stories">
```

Insert this line immediately before it:
```html
  <!-- FEATURED POST (injected by build-blog.js) -->
  <div id="featuredPost"></div>

```

- [ ] **Step 2: Add featured post CSS**

Find the closing `</style>` tag in `majestic-travels-blog.html` and insert the following block immediately before it:

```css
    /* ─── FEATURED POST ──────────────────────────────────────────── */

    .featured-section {
      background: var(--paper);
      padding: 3rem 1.5rem 0;
    }

    .featured-inner {
      max-width: var(--max);
      margin: 0 auto;
    }

    .featured-card {
      display: flex;
      gap: 2.5rem;
      background: var(--white);
      border-radius: var(--radius);
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 4px 24px rgba(24, 32, 28, 0.08);
      transition: box-shadow 0.2s, transform 0.2s;
    }

    .featured-card:hover {
      box-shadow: 0 8px 36px rgba(24, 32, 28, 0.13);
      transform: translateY(-2px);
    }

    .featured-media {
      flex: 0 0 55%;
      min-height: 320px;
      overflow: hidden;
    }

    .featured-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .featured-body {
      flex: 1;
      padding: 2rem 2rem 2rem 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.75rem;
    }

    .featured-label {
      font-family: var(--font-body);
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--ocean);
    }

    .featured-meta {
      font-family: var(--font-body);
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-soft);
      margin: 0;
    }

    .featured-title {
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 600;
      font-variation-settings: "SOFT" 64, "WONK" 1;
      color: var(--ink);
      line-height: 1.15;
      margin: 0;
      transition: color 0.15s;
    }

    .featured-card:hover .featured-title {
      color: var(--ocean);
    }

    .featured-excerpt {
      font-family: var(--font-body);
      font-size: 1rem;
      color: var(--ink-soft);
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
    }

    .featured-cta {
      font-family: var(--font-body);
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--ocean);
      margin-top: 0.5rem;
    }

    @media (max-width: 600px) {
      .featured-card {
        flex-direction: column;
        gap: 0;
      }

      .featured-media {
        flex: none;
        min-height: 220px;
      }

      .featured-body {
        padding: 1.25rem;
      }

      .featured-title {
        font-size: 1.4rem;
      }
    }
```

- [ ] **Step 3: Add `updateFeatured()` to build-blog.js**

In `scripts/build-blog.js`, find the `updateHome` function and add the following new function immediately after it (after the closing `}` of `updateHome`):

```javascript
function updateFeatured(home, posts) {
  const ANCHOR = '<div id="featuredPost"></div>';
  const pos = home.indexOf(ANCHOR);
  if (pos === -1) return home; // anchor missing — skip silently

  const post = posts[0]; // most recent post (sorted descending by date)
  const meta = [post.categoryLabel, post.readTime].filter(Boolean).join(" · ");

  const html = `<section class="featured-section">
    <div class="featured-inner">
      <a class="featured-card" href="${escapeHtml(post.url)}">
        <div class="featured-media">
          <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" loading="eager" decoding="async">
        </div>
        <div class="featured-body">
          <span class="featured-label">★ Featured</span>
          <p class="featured-meta">${escapeHtml(meta)}</p>
          <h2 class="featured-title">${escapeHtml(post.title)}</h2>
          <p class="featured-excerpt">${escapeHtml(post.excerpt)}</p>
          <span class="featured-cta">Read story →</span>
        </div>
      </a>
    </div>
  </section>`;

  return home.slice(0, pos) + html + home.slice(pos + ANCHOR.length);
}
```

- [ ] **Step 4: Call `updateFeatured()` in `main()`**

In `scripts/build-blog.js`, find:
```javascript
  write(HOME_FILE, updateHome(home, posts));
```

Replace with:
```javascript
  write(HOME_FILE, updateFeatured(updateHome(home, posts), posts));
```

- [ ] **Step 5: Verify build**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
npm run prepare:publish
```

Expected: `Built 6 posts. Blog check passed. Files: 21`

Open `dist/index.html` in a browser. A large featured card should appear between the hero and the Stories section showing the most recent post (Fuerteventura solo travel).

- [ ] **Step 6: Commit**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
git add majestic-travels-blog.html scripts/build-blog.js
git commit -m "feat: auto-injected featured post section"
```

---

### Task 2: Destinations strip

**Goal:** Add a static section with 5 destination photo cards between the posts section and the footer.

**Files:**
- Modify: `majestic-travels-blog.html` (insert HTML section + CSS)

**Acceptance Criteria:**
- [ ] Destinations section present with 5 cards: Dubai & Abu Dhabi, Fuerteventura, Ljubljana, Marrakech, Vancouver
- [ ] Each card is a 1:1 square with destination name overlaid on a dark gradient
- [ ] Hover zooms the photo slightly
- [ ] `<span id="destinations">` stub removed, replaced by `<section id="destinations">`
- [ ] `npm run prepare:publish` passes

**Verify:** `cd "C:\Users\Adrien\Desktop\Majestic Travels" && npm run prepare:publish` → `Built 6 posts. Blog check passed.`

**Steps:**

- [ ] **Step 1: Replace the destinations stub with the full section**

In `majestic-travels-blog.html`, find:
```html
  <!-- Anchor stubs for article back-links -->
  <span id="destinations" aria-hidden="true"></span>
  <span id="about" aria-hidden="true"></span>
  <span id="newsletter" aria-hidden="true"></span>
```

Replace with:
```html
  <!-- DESTINATIONS -->
  <section class="destinations-section" id="destinations">
    <div class="destinations-inner">
      <h2 class="section-heading">Destinations</h2>
      <div class="destinations-grid">
        <a class="dest-card" href="#stories" style="--dest-img: url('public/site/abu-dhabi-night.jpg')">
          <span class="dest-name">Dubai &amp; Abu Dhabi</span>
        </a>
        <a class="dest-card" href="#stories" style="--dest-img: url('public/site/fuerteventura-atlantic.jpg')">
          <span class="dest-name">Fuerteventura</span>
        </a>
        <a class="dest-card" href="#stories" style="--dest-img: url('public/site/ljubljana-lake.jpg')">
          <span class="dest-name">Ljubljana</span>
        </a>
        <a class="dest-card" href="#stories" style="--dest-img: url('public/site/marrakech-palm-reflection.jpg')">
          <span class="dest-name">Marrakech</span>
        </a>
        <a class="dest-card" href="#stories" style="--dest-img: url('public/site/vancouver-cove.jpg')">
          <span class="dest-name">Vancouver</span>
        </a>
      </div>
    </div>
  </section>

  <!-- ABOUT placeholder (next task) -->
  <span id="about" aria-hidden="true"></span>
  <span id="newsletter" aria-hidden="true"></span>
```

- [ ] **Step 2: Add destinations CSS**

Find the closing `</style>` tag and insert immediately before it:

```css
    /* ─── DESTINATIONS ───────────────────────────────────────────── */

    .destinations-section {
      background: var(--paper);
      padding: 4rem 1.5rem;
    }

    .destinations-inner {
      max-width: var(--max);
      margin: 0 auto;
    }

    .section-heading {
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

    .destinations-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .destinations-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .dest-card {
      position: relative;
      aspect-ratio: 1 / 1;
      overflow: hidden;
      border-radius: var(--radius);
      background-image: var(--dest-img);
      background-size: cover;
      background-position: center;
      text-decoration: none;
      display: block;
      transition: transform 0.3s ease;
    }

    .dest-card::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(24, 32, 28, 0.72) 0%, transparent 55%);
    }

    .dest-card:hover {
      transform: scale(1.03);
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
```

- [ ] **Step 3: Verify build and visual**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
npm run prepare:publish
```

Expected: `Built 6 posts. Blog check passed. Files: 21`

Open `dist/index.html` — 5 destination photo cards should appear below the stories grid.

- [ ] **Step 4: Commit**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
git add majestic-travels-blog.html
git commit -m "feat: destinations strip with 5 photo cards"
```

---

### Task 3: About section

**Goal:** Add a short personal section between the destinations strip and the footer.

**Files:**
- Modify: `majestic-travels-blog.html` (insert HTML section + CSS)

**Acceptance Criteria:**
- [ ] About section present with circular photo placeholder, bio text, and CTA link
- [ ] `<span id="about">` stub removed, replaced by `<section id="about">`
- [ ] Desktop: photo left + text right; mobile: stacked column
- [ ] `npm run prepare:publish` passes

**Verify:** `cd "C:\Users\Adrien\Desktop\Majestic Travels" && npm run prepare:publish` → `Built 6 posts. Blog check passed.`

**Steps:**

- [ ] **Step 1: Replace the about stub with the full section**

In `majestic-travels-blog.html`, find:
```html
  <!-- ABOUT placeholder (next task) -->
  <span id="about" aria-hidden="true"></span>
  <span id="newsletter" aria-hidden="true"></span>
```

Replace with:
```html
  <!-- ABOUT -->
  <section class="about-section" id="about">
    <div class="about-inner">
      <img src="public/site/brand-logo.png" alt="Adrien" class="about-photo">
      <div class="about-text">
        <h2 class="section-heading">About</h2>
        <p>Hi, I'm Adrien. I travel solo, slowly, and with too much curiosity. Majestic Travels is where I write about the places that change you — not the itinerary, but the feeling.</p>
        <a href="#stories" class="about-cta">Read the stories ↓</a>
      </div>
    </div>
  </section>

  <span id="newsletter" aria-hidden="true"></span>
```

- [ ] **Step 2: Add about CSS**

Find the closing `</style>` tag and insert immediately before it:

```css
    /* ─── ABOUT ──────────────────────────────────────────────────── */

    .about-section {
      background: var(--paper-deep);
      padding: 4rem 1.5rem;
    }

    .about-inner {
      max-width: var(--narrow);
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 2.5rem;
    }

    .about-photo {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 3px solid var(--ocean);
    }

    .about-text {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .about-text .section-heading {
      margin-bottom: 0;
    }

    .about-text p {
      font-family: var(--font-body);
      font-size: 1.05rem;
      color: var(--ink-soft);
      line-height: 1.7;
      margin: 0;
    }

    .about-cta {
      display: inline-block;
      font-family: var(--font-body);
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--ocean);
      text-decoration: none;
    }

    .about-cta:hover {
      text-decoration: underline;
    }

    @media (max-width: 600px) {
      .about-inner {
        flex-direction: column;
        text-align: center;
        align-items: center;
      }
    }
```

- [ ] **Step 3: Verify build**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
npm run prepare:publish
```

Expected: `Built 6 posts. Blog check passed. Files: 21`

Open `dist/index.html` — the about section should appear between destinations and the footer with a circular photo and bio text.

- [ ] **Step 4: Commit**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
git add majestic-travels-blog.html
git commit -m "feat: about section with photo and bio"
```

---

### Task 4: Push and verify live

**Goal:** Push all commits to GitHub, confirm Cloudflare deploys, verify the full enriched homepage on majestic-travels.com.

**Files:** None (git operation only)

**Acceptance Criteria:**
- [ ] `git push` succeeds
- [ ] Cloudflare Pages build succeeds
- [ ] `majestic-travels.com` shows: photo hero → featured post → stories grid → destinations → about → footer

**Verify:** Visit `https://majestic-travels.com`

**Steps:**

- [ ] **Step 1: Push**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
git push
```

- [ ] **Step 2: Confirm Cloudflare build**

Go to `https://dash.cloudflare.com` → Pages → `majestic-travels-blog` → latest deployment → wait for green.

- [ ] **Step 3: Verify live**

Visit `https://majestic-travels.com` and scroll through:
- Hero shows `marrakech-palm-reflection.jpg` through teal overlay
- Featured card below hero with the most recent post
- Stories section with search and filters
- 5 destination photo cards
- About section with circular photo
- Footer with newsletter

# Article Page Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align article pages visually with the homepage by replacing the old nav, switching article accent colours from rust to teal, and adding the homepage footer.

**Architecture:** All article pages are generated from `scripts/build-blog.js` via the `articleHtml()` function. The function embeds a shared CSS block (extracted from `majestic-travels-blog.html`) followed by article-specific CSS, then renders the full HTML. Changing `articleHtml()` and running `npm run build:blog` regenerates all 6 posts automatically.

**Tech Stack:** Node.js build script, vanilla HTML/CSS, no new dependencies.

---

### Task 0: Update articleHtml() — nav, accents, footer

**Goal:** Replace the old topbar nav with `.site-nav`, switch 8 article CSS colour references from rust/passport to ocean teal, and add the homepage footer — all inside `articleHtml()` in `build-blog.js`.

**Files:**
- Modify: `scripts/build-blog.js` (the `articleHtml` function, lines 256–394)

**Acceptance Criteria:**
- [ ] Article pages render the teal `.site-nav` (same markup as homepage, `../` paths)
- [ ] Kicker label, meta pills, entry-code label, dossier label, breadcrumb, body links, drop-cap, blockquote label, article-nav label are all `var(--ocean)` not rust/passport
- [ ] Footer appears on all article pages (logo, name, tagline, Stories + RSS nav, newsletter form)
- [ ] `npm run prepare:publish` → `Built 6 posts. Blog check passed.`

**Verify:** `cd "C:\Users\Adrien\Desktop\Majestic Travels" && npm run prepare:publish` → `Built 6 posts. Blog check passed.`

**Steps:**

---

- [ ] **Step 1: Replace the article-specific CSS block**

In `scripts/build-blog.js`, find this exact block (starts at the `<style>` tag line and ends at `</style>`):

```
  <style>${css}
    .article-page { padding: 62px 0 96px; }
    .article-shell { width: min(calc(100% - 44px), 1120px); margin: 0 auto; }
    .article-topbar .nav { grid-template-columns: auto 1fr auto; }
    .article-home-link { min-height: 44px; padding: 0 12px; font-size: 0.78rem; }
    .article-breadcrumb { display: inline-flex; align-items: center; min-height: 44px; width: fit-content; margin-bottom: 34px; color: var(--passport); font-weight: 900; text-transform: uppercase; font-size: 0.78rem; letter-spacing: 0.1em; text-decoration-thickness: 2px; text-underline-offset: 5px; }
```

Replace only the first 4 article-specific rules and the breadcrumb colour. The `.article-topbar` and `.article-home-link` rules are dead (nav no longer uses those classes) — remove them. Change breadcrumb from `--passport` to `--ocean`:

```
  <style>${css}
    .article-page { padding: 62px 0 96px; }
    .article-shell { width: min(calc(100% - 44px), 1120px); margin: 0 auto; }
    .article-breadcrumb { display: inline-flex; align-items: center; min-height: 44px; width: fit-content; margin-bottom: 34px; color: var(--ocean); font-weight: 900; text-transform: uppercase; font-size: 0.78rem; letter-spacing: 0.1em; text-decoration-thickness: 2px; text-underline-offset: 5px; }
```

---

- [ ] **Step 2: Update the 7 remaining rust/passport accent references**

In the same CSS block, make these targeted replacements (each is one line). Use the exact surrounding text to locate each line:

**2a** — entry-code label: find `color: var(--rust); font-size: 0.74rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }` (in `.article-entry-code span`) → change to `color: var(--ocean);`

**2b** — meta-line: find `.article-meta-line { display: flex; flex-wrap: wrap; gap: 10px; color: var(--rust);` → change `var(--rust)` to `var(--ocean)`

**2c** — dossier label: find `.dossier-label { color: var(--rust);` → change `var(--rust)` to `var(--ocean)`

**2d** — drop-cap: find `.article-body > p:first-child::first-letter { float: left; font-family: var(--font-display); color: var(--rust);` → change `var(--rust)` to `var(--ocean)`

**2e** — body links: find `.article-body a { color: var(--passport);` → change `var(--passport)` to `var(--ocean)`

**2f** — blockquote label: find `.article-body blockquote::before { content: "Field note"; display: block; margin-bottom: 10px; color: var(--rust);` → change `var(--rust)` to `var(--ocean)`

**2g** — article-nav card labels: find `.article-nav-card span { color: var(--rust);` → change `var(--rust)` to `var(--ocean)`

After these edits, grep the template literal for remaining `var(--rust)` and `var(--passport)` references to confirm none were missed:
```powershell
Select-String -Path "C:\Users\Adrien\Desktop\Majestic Travels\scripts\build-blog.js" -Pattern "var\(--rust\)|var\(--passport\)"
```
The only remaining matches should be in the CSS custom property definitions (`:root`), ledger item left-border colours, and button/secondary styles — not in the accent label rules.

---

- [ ] **Step 3: Replace the nav HTML**

Find this entire nav block in the template literal (lines 309–325):

```javascript
  <header class="topbar article-topbar">
    <nav class="nav wrap" aria-label="Main navigation">
      <a class="brand" href="../majestic-travels-blog.html" aria-label="Majestic Travels home">
        <img class="brand-logo" src="../public/site/brand-logo.png" alt="" aria-hidden="true">
        <span>Majestic Travels</span>
      </a>
      <ul class="nav-links" aria-label="Sections">
        <li><a href="../majestic-travels-blog.html#stories">Stories</a></li>
        <li><a href="../majestic-travels-blog.html#destinations">Destinations</a></li>
        <li><a href="../majestic-travels-blog.html#about">About</a></li>
        <li><a href="../majestic-travels-blog.html#newsletter">Newsletter</a></li>
      </ul>
      <div class="nav-actions">
        <a class="button secondary article-home-link" href="../majestic-travels-blog.html#stories">Stories</a>
      </div>
    </nav>
  </header>
```

Replace with:

```javascript
  <nav class="site-nav" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="../majestic-travels-blog.html" class="nav-brand">
        <img src="../public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="nav-logo">
        <span class="nav-brand-name">Majestic Travels</span>
      </a>
      <ul class="nav-menu" role="list">
        <li><a href="../majestic-travels-blog.html#stories">Stories</a></li>
        <li><a href="../rss.xml">RSS</a></li>
      </ul>
    </div>
  </nav>
```

---

- [ ] **Step 4: Add the footer**

Find the closing tags at the end of the template literal:

```javascript
    </article>
  </main>
  <script>
    document.querySelectorAll("img").forEach((image) => {
```

Insert the footer between `</main>` and `<script>`:

```javascript
    </article>
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <img src="../public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="footer-logo">
        <span class="footer-name">Majestic Travels</span>
        <p class="footer-tagline">Solo travel. Real places. No filters.</p>
      </div>
      <nav class="footer-nav" aria-label="Footer navigation">
        <a href="../majestic-travels-blog.html#stories">Stories</a>
        <a href="../rss.xml">RSS</a>
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
    document.querySelectorAll("img").forEach((image) => {
```

---

- [ ] **Step 5: Verify build**

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
Files: 24
```

Then open `dist/blog/fuerteventura-solo-travel.html` in a browser and confirm:
- Teal sticky nav at the top (matches homepage style)
- Kicker label in teal, not rust
- Meta pills in teal
- Article body links in teal
- Dark footer at the bottom with newsletter

---

- [ ] **Step 6: Commit**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
git add scripts/build-blog.js
git commit -m "feat: align article pages with homepage nav, teal accents, footer"
```

---

### Task 1: Push and verify live

**Goal:** Push to GitHub, confirm Cloudflare deploys, verify the updated article pages on majestic-travels.com.

**Files:** None (git operation only)

**Acceptance Criteria:**
- [ ] `git push` succeeds
- [ ] Cloudflare Pages build succeeds
- [ ] Any article page on majestic-travels.com shows the teal nav and footer

**Verify:** Visit `https://majestic-travels.com/blog/fuerteventura-solo-travel.html`

**Steps:**

- [ ] **Step 1: Push**

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
git push
```

- [ ] **Step 2: Confirm Cloudflare build**

Go to `https://dash.cloudflare.com` → Pages → `majestic-travels-blog` → latest deployment → wait for green.

- [ ] **Step 3: Verify live**

Visit `https://majestic-travels.com/blog/fuerteventura-solo-travel.html` and confirm:
- Teal `.site-nav` at top (logo + Majestic Travels + Stories + RSS)
- Article content unchanged (entry-code card, cover photo, dossier sidebar, field notes texture)
- Teal accents on labels
- Dark footer with newsletter at the bottom

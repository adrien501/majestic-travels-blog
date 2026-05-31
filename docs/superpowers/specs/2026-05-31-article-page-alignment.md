# Article Page Alignment — Majestic Travels

## Context

The homepage was redesigned with a clean teal brand direction (teal nav, paper background, `--ocean` accent). Article pages were built separately with a richer "field notes" aesthetic that uses `--rust` as its primary accent and a different nav/footer structure. This spec aligns the article pages visually with the homepage without changing their structure or personality.

## What Does NOT Change

- Article page HTML structure (hero layout, entry-code card, cover photo, dossier sidebar, body text, article nav cards)
- Field notes watermark (`FIELD NOTES / ROUTES / AFTERNOON LIGHT` on `body::before`)
- Dot-grid / map texture on the body background
- Drop cap on first paragraph
- "FIELD PHOTO" label and rotated stamp aesthetic on the cover image
- Rotated blockquotes with "Field note" label
- Fraunces + Source Sans 3 typography
- All colour tokens (`--rust`, `--marigold`, `--coral`, etc.) remain defined — they just stop being the primary accent

## Changes

### 1. Nav — replace `.topbar` with `.site-nav`

**Current:** Articles use `<header class="topbar article-topbar">` with a 3-column `.nav` grid, icon buttons, and a tricolour stripe (`--route-red` / `--atlantic` / `--marigold`). This nav is different from the homepage.

**New:** Replace with the homepage `.site-nav` markup exactly, adjusting paths to `../` since articles live in `blog/`:

```html
<nav class="site-nav" aria-label="Main navigation">
  <div class="nav-inner">
    <a href="../majestic-travels-blog.html" class="nav-brand">
      <img src="../public/logo_cleanedup_centered_transparant-01.png"
           alt="Majestic Travels logo" class="nav-logo">
      <span class="nav-brand-name">Majestic Travels</span>
    </a>
    <ul class="nav-menu" role="list">
      <li><a href="../majestic-travels-blog.html#stories">Stories</a></li>
      <li><a href="../rss.xml">RSS</a></li>
    </ul>
  </div>
</nav>
```

Nav links match the homepage exactly (Stories + RSS). No extra links.

The `.site-nav` CSS is already in the shared style block extracted from the homepage, so no new CSS is needed.

### 2. Accent colour — rust → ocean on article-specific elements

The article-specific CSS (appended after the shared block in `articleHtml()`) currently uses `--rust` as the primary accent on:

| Selector | Property | Current | New |
|---|---|---|---|
| `.kicker` | `color` | `--rust` | `--ocean` |
| `.article-meta-line` | `color` | `--rust` | `--ocean` |
| `.article-entry-code span` | `color` | `--rust` | `--ocean` |
| `.dossier-label` | `color` | `--rust` | `--ocean` |
| `.article-nav-card span` | `color` | `--rust` | `--ocean` |
| `.article-body a` | `color` | `--passport` | `--ocean` |
| `.article-body blockquote::before` | `color` | `--rust` | `--ocean` |
| `.article-breadcrumb` | `color` | `--passport` | `--ocean` |

`--rust` and `--marigold` remain defined as tokens for secondary decorative uses (ledger item left-border colours, button hover states). They just stop being the article's primary label/accent colour.

### 3. Footer — add homepage footer to article pages

Article pages currently end with `<div class="article-actions">` buttons and no footer. Add the same footer used on the homepage, with `../` path adjustments:

```html
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <img src="../public/logo_cleanedup_centered_transparant-01.png"
           alt="Majestic Travels logo" class="footer-logo">
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
```

The `.site-footer` CSS is already in the shared block. Paths use `../` since articles live in `blog/`.

## Files Modified

- `scripts/build-blog.js` — update `articleHtml()`: replace nav markup, update article-specific accent CSS, add footer HTML
- `blog/*.html` — regenerated automatically by `npm run build:blog`

## What is NOT Changed

- `majestic-travels-blog.html` — untouched
- `scripts/prepare-publish.js` — untouched
- Any post Markdown files — untouched

## Build & Verify

```powershell
npm run prepare:publish
# Expected: Built 6 posts. Blog check passed.
```

Open `blog/fuerteventura-solo-travel.html` in a browser and confirm:
- [ ] Teal sticky nav appears (same as homepage)
- [ ] Teal accent on kicker label, meta pills, dossier labels
- [ ] Footer appears below article actions
- [ ] Field notes watermark, texture background, drop cap still visible
- [ ] Nav links work: Stories, Destinations, About, RSS all resolve correctly
- [ ] All 6 article pages regenerated

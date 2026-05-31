# Homepage Redesign — Majestic Travels

## Context

The existing homepage was too busy: 8 competing accent colors with no unified brand identity, an oversized stories section with too much empty space, and a background dot-grid pattern that felt unfinished. The goal is a full homepage overhaul — clean, branded, simple — while leaving article pages untouched.

## Brand Direction

- **Signature color:** `#0e6674` (deep ocean teal) — used for nav, hero background, active pills, hover states, buttons, links
- **Background:** `#f6ecdc` (warm paper) — main page background
- **Text:** `#18201c` (dark ink)
- **Footer background:** `#18201c`
- **Fonts:** Fraunces (display/titles) + Source Sans 3 (body) — unchanged
- **No category accent colors** — all replaced by teal

## Page Structure

```
NAV       teal bg, logo mark left, links right
HERO      teal bg (continuous with nav), brand assets centered
POSTS     paper bg, search + topic filters + 3-col card grid
FOOTER    dark ink bg, wordmark + links + newsletter
```

Nav and hero share the teal background so they read as one unified header band.

## Nav

- Background: teal (`#0e6674`)
- Left: `logo_cleanedup_centered_transparant-01.png` (~32px) + "Majestic Travels" text in Fraunces, cream
- Right: links in Source Sans 3, cream, hover underline in cream
- No colored stripe — the teal band is the identity

## Hero

- Background: teal, height ~40vh
- Centered stack (vertical):
  1. `public/logo_cleanedup_centered_transparant-01.png` (~80px tall) — CSS `filter: brightness(0) invert(1)` for cream on teal
  2. `public/plain_name_crop.png` — big brand name image, same filter
  3. Tagline: *"Solo travel. Real places. No filters."* — Source Sans 3, cream, 1.1rem
  4. CTA: "Read the stories ↓" — outlined cream button, scrolls to posts section
- No hero image, no cards, no rotating elements

## Posts Section

- Background: paper (`#f6ecdc`)
- Section heading: "Stories" — Fraunces, left-aligned, teal underline
- **Search bar**: text input, filters cards live as you type (client-side JS)
- **Topic pills**: All · Essays · Guides · Field Notes — teal fill when active, outline when inactive; works in combination with search
- **Card grid**: 3 columns (tablet ≤768px → 2 col, mobile ≤480px → 1 col)
- Each card:
  - 16:9 image
  - Category + read time (small caps, teal, muted)
  - Title (Fraunces, 1.3rem, ink)
  - Excerpt (Source Sans 3, muted ink, 2 lines clamped)
  - Hover: slight lift (`box-shadow`), title color → teal
  - No rotations, no dashed borders, no sidebar

## Footer

- Background: dark ink (`#18201c`)
- Top: logo mark + "Majestic Travels" wordmark, cream
- Tagline below wordmark
- Nav links: Stories · About · RSS
- Newsletter: label + email input + Subscribe button (teal)
- Bottom: © 2026 Majestic Travels

## What Is NOT Changed

- Article page HTML and CSS — untouched
- Build system scripts — untouched
- Markdown post files — untouched
- `prepare-publish.js` output — untouched

## Files Modified

- `majestic-travels-blog.html` — full homepage rewrite (HTML + inline `<style>`)
- `scripts/build-blog.js` — homepage template references may need updating if script reads/injects post cards

## Verification

- [ ] Homepage loads at `majestic-travels.com` with teal hero and brand PNGs visible
- [ ] Nav and hero read as one teal band
- [ ] Search bar filters cards live without page reload
- [ ] Topic pills filter by category, work in combination with search
- [ ] Cards display in 3-col → 2-col → 1-col at breakpoints
- [ ] Card hover lifts and title goes teal
- [ ] Footer newsletter form present and styled
- [ ] Article pages unchanged — click through to a post and verify layout intact
- [ ] `npm run prepare:publish` passes without errors

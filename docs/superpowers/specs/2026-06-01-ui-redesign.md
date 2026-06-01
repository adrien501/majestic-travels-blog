# Majestic Travels UI Redesign — Sand & Stone

## Summary

Complete visual overhaul of majestic-travels.com: replace the teal-heavy color palette with a warm, neutral "Sand & Stone" scheme, fix layout bugs caused by dead CSS, compact the hero and featured post, add social media links, and make the site production-ready.

## Palette — Sand & Stone

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Dark base | Charcoal | `#2c2a26` | Nav, footer, headings |
| Body text | Ink | `#2c2a26` | Paragraphs, labels |
| Soft text | Ink Soft | `#5a5650` | Excerpts, meta |
| Background | Soft Cream | `#faf6f0` | Page body |
| Deep background | Cream Deep | `#f0e9df` | Alt sections |
| Card surface | White | `#ffffff` | Cards, inputs |
| Primary accent | Sandstone | `#c08c5a` | Section underlines, featured label, subscribe button, nav social icons |
| Secondary accent | Clay | `#9e5b3c` | Links, CTAs, pill filters, hover states |
| Tertiary accent | Faded Sage | `#7a8b72` | Supporting accent, category badges |
| Border | Line | `rgba(44,42,38,0.12)` | Card borders, dividers |
| Border strong | Line Strong | `rgba(44,42,38,0.22)` | Input borders, active dividers |

Replace all `--ocean`, `--ocean-dark`, `--atlantic`, `--teal` references with the above.

## Layout Changes

### Nav bar
- Background: charcoal (`#2c2a26`), not teal
- Add social icon buttons (Instagram, TikTok, Ko-fi, Gumroad) as compact SVG icons next to Stories/RSS links
- Icons use `rgba(250,246,240,0.6)` default, full cream on hover

### Hero
- Shrink from `min-height: 60vh` to `min-height: 35vh`
- Change overlay from teal `rgba(14,102,116,0.75)` to warm dark `rgba(44,42,38,0.55)`
- Keep existing background image (marrakech-palm-reflection.jpg)
- CTA border and hover: cream tones instead of teal

### Featured post
- Already a horizontal card layout — constrain max-height to ~240px
- The featured image side gets `max-height` constraint so it doesn't blow up to full viewport
- Label color: sandstone instead of ocean
- CTA color: clay instead of ocean

### Destinations grid
- Section heading underline: sandstone instead of ocean/teal
- Cards keep existing structure — no layout changes needed

### Stories section
- **Fix the blank-space bug**: The old CSS defines `.story-grid { grid-template-columns: repeat(6, 1fr) }` and `.story-card:first-child { grid-column: span 4 }` etc. The new override changes to `repeat(3, 1fr)` but the old span rules still apply. Remove all old CSS to fix this.
- Clean 3-column grid, no span tricks
- Story card images: consistent `aspect-ratio: 16/10`, `object-fit: cover`
- Pill filters: clay border/text, clay fill when active (not teal/ocean)
- Search input focus: clay border instead of ocean
- Section heading underline: sandstone

### About section
- Heading underline: sandstone
- CTA link: clay instead of ocean
- Photo border: sandstone instead of ocean

### Footer
- Keep charcoal/dark background (already correct tone)
- Newsletter subscribe button: sandstone background instead of ocean
- Newsletter input focus border: sandstone
- Add social links section with icon buttons: Instagram, TikTok, Ko-fi, Gumroad
- Footer nav: add Instagram, TikTok, Ko-fi, Gumroad as text links alongside Stories/RSS

## Social Links

URLs:
- Instagram: `https://www.instagram.com/your_majestic_travels`
- TikTok: `https://www.tiktok.com/@your_majestic_travels`
- Ko-fi: `https://ko-fi.com/majestictravels`
- Gumroad: `https://majestictravels.gumroad.com/`

Placement:
1. **Nav bar**: Compact SVG icon buttons, right side next to Stories/RSS
2. **Footer**: Icon buttons in brand section + text links in footer nav column

All social links open in `target="_blank" rel="noopener"`.

## CSS Cleanup — Dead Code Removal

Remove all unused CSS from the original homepage design that is NOT referenced by any current HTML element. This includes styles for:

- `.topbar`, `.nav` (old nav), `.brand`, `.brand-logo`, `.nav-links`, `.nav-actions`, `.icon-button`, `.menu-button`, `.mobile-panel`
- `.masthead`, `.hero-grid`, `.hero-copy`, `.kicker`, `.hero-ledger`, `.ledger-item`, `.hero-note`, `.hero-visual`, `.route-slip`, `.photo-caption`, `.lead-story`, `.lead-card`
- `.section`, `.section-head`, `.desk-grid`, `.desk-item`
- `.postcard-strip`, `.postcard`
- `.archive-board`, `.archive-note`, `.archive-status`, `.route-buttons`, `.route-button`
- `.filter-panel`, `.controls`, `.search-box` (old search)
- `.destination-grid`, `.destination-feature`, `.destination-copy`, `.destination-list`, `.destination-link`
- `.about-grid`, `.portrait`, `.about-copy`, `.principles`
- `.newsletter` (old section), `.newsletter-grid`
- Old `.footer-grid`, `.footer-wordmark`, `.footer-links`
- `.to-top`, `.button`, `.button.secondary`
- Old `h1` sizing rules that conflict
- Old media queries for these removed components

The old `<body>` styles (background patterns, `::before` pseudo-element) are already overridden — remove the originals.

Keep: CSS custom properties (`:root`), base resets, `.sr-only`, `.skip-link`, `::selection`, `@media (prefers-reduced-motion)`.

## Blog Article Pages

Apply the same changes to the blog post template (generated by `build-blog.js`):
- Nav: charcoal background, social icons, same structure as homepage
- Footer: same as homepage (social links, sandstone accents)
- All teal/ocean accent colors → sandstone/clay/sage equivalents
- "Back to reading room" link: clay color

## Bug Fixes

1. **Blank space in stories grid** — caused by old 6-column grid + span rules conflicting with 3-column override. Fixed by removing old CSS entirely.
2. **Story card gradient placeholders** — old `.story-media` has teal/sage gradient backgrounds visible when images are loading or broken. Replace with neutral cream/sand gradient.
3. **Featured card oversized** — constrain max-height so it doesn't dominate the viewport.

## Out of Scope

- Newsletter backend (form still posts to `#`)
- Mobile hamburger menu redesign (keep existing behavior)
- New blog posts or content changes
- Image optimization/compression
- Splitting guides into a separate section (revisit at 12-15+ posts)

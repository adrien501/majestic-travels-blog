# Majestic Travels Owner Manual

This is the practical guide for changing the site yourself without breaking the build. It explains what each important file does, where durable edits belong, how to add posts and photos, how to tweak templates, and how to reuse this setup for a new blog from scratch.

## The Core Rule

The source of truth for blog posts is `posts/*.md`.

Do not hand-edit `blog/*.html` for article content. Those files are generated from Markdown. If you edit generated HTML directly, the next build can overwrite your work.

The normal loop is:

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"
npm run build
git status
git add <files you changed>
git commit -m "Clear commit message"
git push origin main
```

`npm run build` runs the full publish pipeline:

1. Builds article HTML and the homepage from Markdown.
2. Checks links, images, metadata, RSS, sitemap, and HTML basics.
3. Creates the deployable `dist/` folder.

## Folder Map

```text
posts/
  The real blog post source files. Edit these for article text, metadata, tags, and inline photos.

blog/
  Generated article HTML. Do not edit article content here.

majestic-travels-blog.html
  Homepage template plus generated story cards. You can edit layout, CSS, navigation, footer, and static sections here, but do not hand-edit the generated story card block.

public/site/
  Brand assets and general site images.

public/pics/
  Destination and article photos.

scripts/build-blog.js
  The static blog generator. Edit this when you want to change article templates, card markup, supported Markdown syntax, RSS, sitemap, or metadata output.

scripts/check-blog.js
  The validator. Edit this when you want stricter or different build checks.

scripts/prepare-publish.js
  Creates `dist/` for Cloudflare Pages. Edit this if you change which folders/assets should deploy.

dist/
  Built output. Ignored by Git. Regenerated every build.
```

## Daily Commands

```powershell
npm run writer
```

Starts the local writing UI at `http://127.0.0.1:8792/`.

```powershell
npm run new:post -- "Post Title"
```

Creates a new Markdown draft in `posts/`.

```powershell
npm run build:blog
```

Regenerates homepage cards, article pages, RSS, sitemap, and robots file from `posts/*.md`.

```powershell
npm run check:blog
```

Validates the generated site without creating `dist/`.

```powershell
npm run build
```

Full build, validation, and `dist/` packaging. Use this before committing or pushing.

## Adding A New Blog Post

Create the draft:

```powershell
npm run new:post -- "A Weekend In Lisbon"
```

Open the new file in `posts/`. Every post starts with frontmatter:

```md
---
title: "A Weekend In Lisbon"
date: "2026-06-03"
category: "Guide"
tags: "Guide, Lisbon, Weekend, Portugal"
readTime: "7 min"
excerpt: "A short homepage-friendly summary."
brief: "A private note about what this post is meant to do."
image: "public/pics/lisbon/weekend-cover.jpg"
imageAlt: "Lisbon street with yellow tram at sunset"
keywords: "lisbon weekend guide portugal itinerary"
---
```

Then write the article below the second `---`.

After writing:

```powershell
npm run build
git status
```

If the build passes, commit the Markdown post, generated HTML, homepage changes, RSS/sitemap changes, and any local photos used by the post.

## Frontmatter Fields

`title`
The visible article title and SEO title.

`date`
Publish date in `YYYY-MM-DD`. Posts are sorted newest first.

`category`
The visible category label, for example `City Guide`, `Personal Journey`, or `Hotel Review`.

`tags`
Comma-separated tags used for filtering and search. To make a post appear in the major filters, include one of these tags:

```text
Essay
Guide
Field Notes
```

Example:

```md
tags: "Essay, New York, Summer"
```

`readTime`
Visible reading time on cards and articles.

`excerpt`
Homepage card summary and meta description. Keep it clear and not too long.

`brief`
Internal editorial promise. It may appear in some generated article sidebars.

`image`
Cover image path or remote URL.

`imageAlt`
Accessible description for the cover image.

`keywords`
Extra search words used by the homepage search/filter data.

## Supported Markdown

The generator supports this intentionally small Markdown set:

```md
## Heading
### Smaller heading

Normal paragraph text.

- Bullet item
- Another bullet item

> Pull quote

**bold**
*italic*
[Link text](https://example.com)

![Image alt text](public/pics/path/photo.jpg)
![Image alt text](public/pics/path/photo.jpg "Visible caption text")
```

For images, use the optional quoted title when you want a caption different from the alt text.

## Adding Photos

Recommended structure:

```text
public/pics/destination/post-slug/photo-name.jpg
```

Example:

```text
public/pics/NYC/new-york-city-summer/brooklyn_promenade.jpg
```

Use relative paths from the project root inside Markdown:

```md
![Brooklyn Heights Promenade with Manhattan skyline view](public/pics/NYC/new-york-city-summer/brooklyn_promenade.jpg "Brooklyn Heights Promenade.")
```

Important:

- Local photos must be committed to Git if Cloudflare needs to deploy them.
- `.dng` raw files are skipped from `dist/`.
- `dist/` is ignored and should not be committed.
- Do not leave referenced photos untracked. The local site may work, but deployment will miss them.

## What To Edit For Common Changes

Change article text:
Edit `posts/the-post-slug.md`.

Change article cover image:
Edit `image` and `imageAlt` in the post frontmatter.

Change homepage card category/filter behavior:
Edit `category` and `tags` in post frontmatter, then run `npm run build`.

Change the article page layout:
Edit `articleHtml()` in `scripts/build-blog.js`.

Change the story card markup:
Edit `cardHtml()` in `scripts/build-blog.js`.

Change homepage layout, colors, hero, about section, footer, newsletter section, or navigation:
Edit `majestic-travels-blog.html`.

Change generated RSS/sitemap/robots:
Edit `writeLaunchFiles()` in `scripts/build-blog.js`.

Change what gets deployed:
Edit `scripts/prepare-publish.js`.

Change validation rules:
Edit `scripts/check-blog.js`.

## Generated Files You Should Usually Commit

After a post/content change, commit:

```text
posts/*.md
blog/*.html
majestic-travels-blog.html
sitemap.xml
rss.xml
robots.txt
public/pics/... referenced photos
```

Do not commit:

```text
dist/
node_modules/
*.log
local scratch folders
raw camera exports you are not using
```

## Before You Push

Run:

```powershell
npm run build
git status
git diff --stat
```

Look for:

- No missing image errors.
- No broken local links.
- No accidental changes to unrelated files.
- No untracked photos that are referenced by posts.
- No edits only inside `blog/*.html` without matching `posts/*.md` changes.

Then:

```powershell
git add <intended files>
git commit -m "Describe the change"
git push origin main
```

Cloudflare Pages watches `main`, runs `npm run prepare:publish`, and deploys `dist/`.

## If The Site Looks Stale

Check these in order:

1. Did you edit `posts/*.md`, or only generated `blog/*.html`?
2. Did you run `npm run build`?
3. Did you commit the generated files?
4. Did you commit local photos used by the post?
5. Did you push to `origin/main`?
6. Did Cloudflare Pages finish the deployment?

If local `dist/` looks old, run:

```powershell
npm run build
```

`dist/` is regenerated from the current source.

## If A Build Fails

Run the full build locally:

```powershell
npm run build
```

Common failures:

- Missing frontmatter field in a post.
- Local image path points to a file that does not exist.
- Local link points to a missing page or missing anchor.
- An inline script has a syntax error.
- Post count does not match generated article count.

Fix the source file, rebuild, then commit.

## How To Tweak The Design Safely

For visual changes, start in `majestic-travels-blog.html`. Most CSS lives inside the `<style>` block there. Article pages reuse that CSS because `scripts/build-blog.js` extracts the homepage CSS and injects it into generated article pages.

That means:

- Changing shared CSS in `majestic-travels-blog.html` affects homepage and articles after rebuild.
- Changing article-only CSS should happen in `articleHtml()` inside `scripts/build-blog.js`.
- Changing homepage-only sections can happen directly in `majestic-travels-blog.html`.

After design changes:

```powershell
npm run build
```

Then inspect both:

```text
majestic-travels-blog.html
blog/some-article.html
```

## How To Make A New Blog From Scratch Using This System

1. Copy the reusable project pieces:

```text
package.json
package-lock.json
scripts/
majestic-travels-blog.html
public/site/
posts/
BLOGGING.md
SETUP.md
LAUNCH.md
MAJESTIC_TRAVELS_OWNER_MANUAL.md
```

2. Replace the brand assets in `public/site/` and root `public/*.png`.

3. Edit static branding in `majestic-travels-blog.html`:

```text
site name
navigation labels
about copy
newsletter copy
footer links
social links
theme colors
logo paths
```

4. Remove old posts from `posts/` and create new ones:

```powershell
npm run new:post -- "My First Post"
```

5. Put photos under:

```text
public/pics/new-destination/post-slug/
```

6. Update deployment URL if needed:

```powershell
$env:SITE_URL="https://your-domain.com"
npm run build
```

7. Configure Cloudflare Pages:

```text
Build command: npm run prepare:publish
Output directory: dist
Branch: main
```

8. Push to GitHub and let Cloudflare deploy.

## Best Practices

- Keep post text in Markdown, not generated HTML.
- Keep local photo filenames simple when possible: lowercase, hyphens, no special characters.
- Use descriptive alt text. Captions can be more conversational.
- Run `npm run build` before every push.
- Check `git status` before committing.
- Commit focused changes with clear messages.
- Do not put private API keys in this static site.
- Treat `scripts/build-blog.js` as the template engine.
- Treat `posts/*.md` as the CMS.
- Treat `dist/` as disposable output.

## Quick Rescue Checklist

If things get messy again:

```powershell
git status --short --branch
npm run build
git status --short --branch
```

Then ask:

- Are the real edits in `posts/*.md`?
- Are generated files updated?
- Are referenced photos tracked?
- Are unrelated local files ignored?
- Is `main` aligned with `origin/main`?

The healthy final state is:

```text
## main...origin/main
```

with no modified, deleted, or untracked project files below it.

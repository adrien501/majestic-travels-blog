# Majestic Travels Blogging Workflow

Write posts in `posts/` as Markdown files. The builder turns those files into the homepage story cards, article pages in `blog/`, `sitemap.xml`, `robots.txt`, and `rss.xml`.

## Create A New Post

The easiest option is the local writer desk:

```bash
npm run writer
```

Open `http://127.0.0.1:8792/`. The desk saves drafts into `posts/`, edits existing Markdown posts from the archive, rebuilds the public blog, and runs the blog checker from one browser page.

For a command-line draft, run:

```bash
npm run new:post -- "Your Post Title"
```

You can also prefill common metadata:

```bash
npm run new:post -- "Paris In The Rain" --category "Guide" --tags "Paris, Slow travel" --readTime "6 min"
```

Then open the new file in `posts/`, edit the frontmatter, and write the article below it.

```md
---
title: "Your Post Title"
date: "2026-05-21"
category: "Essay"
tags: "Solo travel, Paris"
readTime: "6 min"
excerpt: "One short sentence that appears on the homepage card."
brief: "The story promise shown inside the card details."
image: "https://images.unsplash.com/your-image"
imageAlt: "Describe the image for readers who cannot see it"
keywords: "search words for filtering"
---
```

## Build And Check

After writing or editing a post, run:

```bash
npm run build:blog
npm run check:blog
```

`build:blog` regenerates the public site files. `check:blog` catches missing metadata, broken local links, malformed inline scripts, missing image alt text, and mismatched RSS or sitemap output.

To make a clean upload folder, run:

```bash
npm run prepare:publish
```

Upload the contents of `dist/`. Do not upload the whole backup folder.

## Markdown Supported

- `## Heading`
- `### Smaller heading`
- normal paragraphs
- `- bullet lists`
- `> pull quotes`
- `**bold**`, `*italic*`, and `[links](https://example.com)`

## What Not To Edit

Do not hand-edit `blog/*.html` or the generated story cards in `majestic-travels-blog.html`. Those are rebuilt from `posts/*.md`, so your durable edits belong in the Markdown posts or `scripts/build-blog.js`.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");

function slugify(value = "") {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function todayIso() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function yamlString(value = "") {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function parseArgs(args) {
  const options = {};
  const titleParts = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[index + 1];
      options[key] = next && !next.startsWith("--") ? next : "true";
      if (next && !next.startsWith("--")) index += 1;
    } else {
      titleParts.push(arg);
    }
  }

  return { title: titleParts.join(" ").trim(), options };
}

function uniquePostPath(slug) {
  let candidate = slug;
  let count = 2;

  while (fs.existsSync(path.join(POSTS_DIR, `${candidate}.md`))) {
    candidate = `${slug}-${count}`;
    count += 1;
  }

  return path.join(POSTS_DIR, `${candidate}.md`);
}

function usage() {
  console.log(`Create a Majestic Travels blog draft.

Usage:
  npm run new:post -- "Your Post Title"
  npm run new:post -- "Paris in the Rain" --category "Guide" --tags "Paris, Slow travel" --readTime "6 min"

Optional flags:
  --date YYYY-MM-DD
  --category "Essay"
  --tags "Solo travel, Fuerteventura"
  --readTime "5 min"
  --excerpt "One homepage-card sentence."
  --brief "One private-ish story brief."
  --image "https://images.unsplash.com/..."
  --imageAlt "Describe the image"
  --keywords "search words for filtering"
`);
}

function main() {
  const { title, options } = parseArgs(process.argv.slice(2));
  if (!title) {
    usage();
    process.exitCode = 1;
    return;
  }

  const slug = slugify(title);
  if (!slug) {
    throw new Error("Could not create a useful slug from that title.");
  }

  const date = options.date || todayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("--date must use YYYY-MM-DD format.");
  }

  fs.mkdirSync(POSTS_DIR, { recursive: true });
  const filePath = uniquePostPath(slug);
  const body = `---
title: ${yamlString(title)}
date: ${yamlString(date)}
category: ${yamlString(options.category || "Field note")}
tags: ${yamlString(options.tags || "Slow travel")}
readTime: ${yamlString(options.readTime || "5 min")}
excerpt: ${yamlString(options.excerpt || "A fresh Majestic Travels field note from the road.")}
brief: ${yamlString(options.brief || "What happened, what it changed, and what a reader can borrow for their own trip.")}
image: ${yamlString(options.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=85")}
imageAlt: ${yamlString(options.imageAlt || "Travel scene connected to the story")}
keywords: ${yamlString(options.keywords || `${title}, travel blog, slow travel`)}
---

Start with the specific moment: the street, the weather, the sound, the small decision that made this trip feel real.

## What Happened

Write the story in plain language. Keep the human part close: what surprised you, what felt awkward, what became beautiful only later.

## What I Would Tell A Friend

Turn the experience into useful advice without making it sound like a sales page.

## Practical Notes

- Where:
- When:
- Good for:
- Skip if:
- Bring:

> Save one honest sentence here that feels like it came from the notebook, not the brochure.
`;

  fs.writeFileSync(filePath, body, "utf8");

  console.log(`Created ${path.relative(ROOT, filePath)}`);
  console.log("Next: edit the Markdown, then run npm run build:blog and npm run check:blog.");
}

main();

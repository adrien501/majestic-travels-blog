const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HOME_FILE = path.join(ROOT, "majestic-travels-blog.html");
const BLOG_DIR = path.join(ROOT, "blog");
const POSTS_DIR = path.join(ROOT, "posts");
const SITEMAP_FILE = path.join(ROOT, "sitemap.xml");
const HTML_SITEMAP_FILE = path.join(ROOT, "sitemap.html");
const ROBOTS_FILE = path.join(ROOT, "robots.txt");
const RSS_FILE = path.join(ROOT, "rss.xml");
const SITE_URL = (process.env.SITE_URL || "https://majestic-travels.com").replace(/\/+$/, "");

const failures = [];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/") || path.basename(filePath);
}

function fail(message) {
  failures.push(message);
}

function countMatches(value, pattern) {
  return (value.match(pattern) || []).length;
}

function htmlFiles() {
  const files = [HOME_FILE];
  if (fs.existsSync(HTML_SITEMAP_FILE)) files.push(HTML_SITEMAP_FILE);
  if (fs.existsSync(BLOG_DIR)) {
    files.push(
      ...fs.readdirSync(BLOG_DIR)
        .filter((file) => file.endsWith(".html"))
        .sort()
        .map((file) => path.join(BLOG_DIR, file))
    );
  }
  return files;
}

function postFiles() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR).filter((file) => file.endsWith(".md")).sort();
}

function getIds(html) {
  return new Set(
    Array.from(html.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi), (match) => match[2])
  );
}

function stripHash(value) {
  const hashIndex = value.indexOf("#");
  if (hashIndex === -1) return { target: value, hash: "" };
  return { target: value.slice(0, hashIndex), hash: value.slice(hashIndex + 1) };
}

function isExternalHref(href) {
  return /^(https?:|mailto:|tel:|data:|javascript:)/i.test(href);
}

function checkScripts(filePath, html) {
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1] || "";
    const body = (match[2] || "").trim();
    if (!body || /\bsrc\s*=/i.test(attrs)) continue;

    if (/type\s*=\s*(["'])application\/ld\+json\1/i.test(attrs)) {
      try {
        JSON.parse(body);
      } catch (error) {
        fail(`${rel(filePath)} has invalid JSON-LD: ${error.message}`);
      }
      continue;
    }

    try {
      new Function(body);
    } catch (error) {
      fail(`${rel(filePath)} has invalid inline JavaScript: ${error.message}`);
    }
  }
}

function checkImages(filePath, html) {
  const sourceDir = path.dirname(filePath);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const alt = tag.match(/\balt\s*=\s*(["'])(.*?)\1/i);
    const isDecorative = /\baria-hidden\s*=\s*(["'])true\1/i.test(tag) || /\brole\s*=\s*(["'])presentation\1/i.test(tag);
    if ((!alt || !alt[2].trim()) && !isDecorative) {
      fail(`${rel(filePath)} has an image without useful alt text.`);
    }

    const src = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (!src) {
      fail(`${rel(filePath)} has an image without a src.`);
      continue;
    }

    const value = src[2].trim();
    if (!value || /^(https?:|data:)/i.test(value)) continue;

    const resolved = path.resolve(sourceDir, decodeURIComponent(stripHash(value).target));
    if (!fs.existsSync(resolved)) {
      fail(`${rel(filePath)} references missing local image: ${value}`);
    }
  }
}

function checkLinks(filePath, html, cache) {
  const sourceDir = path.dirname(filePath);

  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)) {
    const href = match[2].trim();
    if (!href || isExternalHref(href)) continue;

    const { target, hash } = stripHash(href);
    const resolved = target
      ? path.resolve(sourceDir, decodeURIComponent(target))
      : filePath;

    if (!fs.existsSync(resolved)) {
      fail(`${rel(filePath)} links to missing local file: ${href}`);
      continue;
    }

    if (hash && path.extname(resolved).toLowerCase() === ".html") {
      const targetHtml = cache.get(resolved) || read(resolved);
      cache.set(resolved, targetHtml);
      const ids = getIds(targetHtml);
      if (!ids.has(decodeURIComponent(hash))) {
        fail(`${rel(filePath)} links to missing anchor #${hash} in ${rel(resolved)}`);
      }
    }
  }
}

function checkHtmlPage(filePath, cache) {
  const html = cache.get(filePath) || read(filePath);
  cache.set(filePath, html);

  const h1Count = countMatches(html, /<h1\b/gi);
  if (h1Count !== 1) {
    fail(`${rel(filePath)} should have exactly one h1, found ${h1Count}.`);
  }

  if (!/<meta\s+name=["']description["']\s+content=["'][^"']{40,}["']/i.test(html)) {
    fail(`${rel(filePath)} is missing a substantial meta description.`);
  }

  checkScripts(filePath, html);
  checkImages(filePath, html);
  checkLinks(filePath, html, cache);
}

function checkPosts(posts) {
  const requiredFields = ["title", "date", "category", "excerpt", "image", "imageAlt"];

  for (const fileName of posts) {
    const filePath = path.join(POSTS_DIR, fileName);
    const source = read(filePath);
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) {
      fail(`${rel(filePath)} is missing frontmatter.`);
      continue;
    }

    for (const field of requiredFields) {
      const pattern = new RegExp(`^${field}:\\s*["']?.+`, "m");
      if (!pattern.test(frontmatter[1])) {
        fail(`${rel(filePath)} is missing frontmatter field: ${field}`);
      }
    }

    const date = frontmatter[1].match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m);
    if (!date) {
      fail(`${rel(filePath)} needs date in YYYY-MM-DD format.`);
    }
  }
}

function checkLaunchFiles(postCount, articleCount) {
  if (postCount !== articleCount) {
    fail(`posts/*.md count (${postCount}) does not match blog/*.html count (${articleCount}). Run npm run build:blog.`);
  }

  if (!fs.existsSync(SITEMAP_FILE)) {
    fail("sitemap.xml is missing.");
  } else {
    const sitemap = read(SITEMAP_FILE);
    const urlCount = countMatches(sitemap, /<url>/g);
    if (urlCount !== postCount + 2) {
      fail(`sitemap.xml should contain ${postCount + 2} URLs, found ${urlCount}.`);
    }
  }

  if (!fs.existsSync(HTML_SITEMAP_FILE)) {
    fail("sitemap.html is missing.");
  }

  if (!fs.existsSync(ROBOTS_FILE)) {
    fail("robots.txt is missing.");
  } else if (!read(ROBOTS_FILE).includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) {
    fail("robots.txt should point to the public sitemap.");
  }

  if (!fs.existsSync(RSS_FILE)) {
    fail("rss.xml is missing.");
  } else {
    const rss = read(RSS_FILE);
    const itemCount = countMatches(rss, /<item>/g);
    if (!/<rss\b/i.test(rss) || !/<channel>/i.test(rss)) {
      fail("rss.xml is missing the rss/channel wrapper.");
    }
    if (itemCount !== postCount) {
      fail(`rss.xml should contain ${postCount} items, found ${itemCount}.`);
    }
  }
}

function checkHomepage(home, postCount) {
  const cardCount = countMatches(home, /class="story-card"/g);
  if (cardCount !== postCount) {
    fail(`Homepage should show ${postCount} story cards, found ${cardCount}. Run npm run build:blog.`);
  }

  if (!/for=["']story-search["']/i.test(home) || !/id=["']story-search["']/i.test(home)) {
    fail("Homepage story search input is missing its accessible label.");
  }

  if (!/<link\s+rel=["']alternate["'][^>]+application\/rss\+xml/i.test(home)) {
    fail("Homepage is missing RSS discovery metadata.");
  }
}

function main() {
  const posts = postFiles();
  const pages = htmlFiles();
  const cache = new Map();

  if (!posts.length) fail("No posts/*.md files found.");
  if (!fs.existsSync(HOME_FILE)) fail("majestic-travels-blog.html is missing.");

  pages.forEach((filePath) => checkHtmlPage(filePath, cache));
  checkPosts(posts);
  checkLaunchFiles(posts.length, pages.length - 2);

  if (fs.existsSync(HOME_FILE)) {
    checkHomepage(cache.get(HOME_FILE) || read(HOME_FILE), posts.length);
  }

  if (failures.length) {
    console.error(`Blog check failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Blog check passed: ${posts.length} posts, ${pages.length} HTML pages, sitemap, robots, and RSS are ready.`);
}

main();

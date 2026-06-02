const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HOME_FILE = path.join(ROOT, "majestic-travels-blog.html");
const POSTS_DIR = path.join(ROOT, "posts");
const BLOG_DIR = path.join(ROOT, "blog");
const SITEMAP_FILE = path.join(ROOT, "sitemap.xml");
const ROBOTS_FILE = path.join(ROOT, "robots.txt");
const RSS_FILE = path.join(ROOT, "rss.xml");
const SITE_URL = (process.env.SITE_URL || "https://majestic-travels.com").replace(/\/+$/, "");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseFrontmatter(source, fileName) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error(`${fileName} is missing frontmatter. Start it with ---`);
  }

  const meta = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) return;
    const key = pair[1].trim();
    const value = pair[2].trim().replace(/^["']|["']$/g, "");
    meta[key] = value;
  });

  const body = source.slice(match[0].length).trim();
  return { meta, body };
}

function splitList(value = "") {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inlineMarkdown(value = "") {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      html.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(2))}</h2>`);
      return;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      return;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return html.join("\n");
}

function dateLabel(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function absoluteUrl(urlPath = "") {
  if (/^https?:\/\//i.test(urlPath)) return urlPath;
  return `${SITE_URL}/${urlPath.replace(/^\/+/, "")}`;
}

function relativeFromBlog(urlPath = "") {
  if (/^(https?:|data:|mailto:|tel:)/i.test(urlPath)) return urlPath;
  return `../${urlPath.replace(/^\/+/, "")}`;
}

function jsonLd(data) {
  return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
}

function rssDate(dateValue) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return new Date().toUTCString();
  return date.toUTCString();
}

function getHomeParts(home) {
  const styleMatch = home.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) throw new Error("Could not find homepage CSS.");
  return { css: styleMatch[1] };
}

const DESTINATION_TAGS = {
  "dubai": ["Dubai", "Abu Dhabi"],
  "fuerteventura": ["Fuerteventura"],
  "ljubljana": ["Ljubljana"],
  "marrakech": ["Marrakech"],
  "vancouver": ["Vancouver"],
  "new-york": ["New York"]
};

function getDestinations(tags) {
  const dests = [];
  for (const [dest, keywords] of Object.entries(DESTINATION_TAGS)) {
    if (tags.some((tag) => keywords.some((kw) => tag.toLowerCase().includes(kw.toLowerCase())))) {
      dests.push(dest);
    }
  }
  return dests.join(" ");
}

function cardHtml(post) {
  const categorySlugs = [post.category, ...post.tags].map(slugify).join(" ");
  const search = [post.title, post.excerpt, post.category, post.tags.join(" "), post.keywords].join(" ");
  const meta = [post.categoryLabel, post.readTime].filter(Boolean).join(" · ");
  const destinations = getDestinations(post.tags);

  return `          <a class="story-card" href="${escapeHtml(post.url)}" data-category="${escapeHtml(categorySlugs)}" data-search="${escapeHtml(search)}" data-destinations="${escapeHtml(destinations)}">
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

function articleHtml(post, css, context = {}) {
  const posts = context.posts || [];
  const index = context.index || 0;
  const entryCode = `Entry ${String(index + 1).padStart(2, "0")}`;
  const articleUrl = absoluteUrl(`blog/${post.slug}.html`);
  const imageUrl = absoluteUrl(post.image);
  const articleImage = relativeFromBlog(post.image);
  const newerPost = posts[index - 1];
  const olderPost = posts[index + 1];
  const allTags = [...post.tags, post.categoryLabel].filter(Boolean);
  const tagMeta = post.tags.map((tag) => `  <meta property="article:tag" content="${escapeHtml(tag)}">`).join("\n");
  const relatedLink = (label, targetPost, fallbackHref, fallbackTitle) => {
    if (!targetPost) {
      return `<a class="article-nav-card" href="${escapeHtml(fallbackHref)}">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(fallbackTitle)}</strong>
        </a>`;
    }

    return `<a class="article-nav-card" href="${escapeHtml(`${targetPost.slug}.html`)}">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(targetPost.title)}</strong>
        </a>`;
  };
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: [imageUrl],
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: "Adrien" },
    publisher: { "@type": "Organization", name: "Majestic Travels" },
    articleSection: post.categoryLabel,
    keywords: allTags.join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(post.title)} | Majestic Travels</title>
  <meta name="description" content="${escapeHtml(post.excerpt)}">
  <link rel="canonical" href="${escapeHtml(articleUrl)}">
  <link rel="alternate" type="application/rss+xml" title="Majestic Travels RSS" href="${SITE_URL}/rss.xml">
  <link rel="icon" type="image/png" href="../public/site/brand-logo.png">
  <link rel="apple-touch-icon" href="../public/site/brand-logo.png">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(post.excerpt)}">
  <meta property="og:url" content="${escapeHtml(articleUrl)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="article:published_time" content="${escapeHtml(post.date)}">
  <meta property="article:section" content="${escapeHtml(post.categoryLabel)}">
${tagMeta}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(post.excerpt)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..800,50..100,0..1&family=Source+Sans+3:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script type="application/ld+json">${jsonLd(schema)}</script>
  <style>${css}
    .article-page { padding: 62px 0 96px; }
    .article-shell { width: min(calc(100% - 44px), 1120px); margin: 0 auto; }
    .kicker { color: var(--clay); box-shadow: 3px 3px 0 rgba(158, 91, 60, 0.12); }
    .kicker::before { color: var(--clay); }
    .article-breadcrumb { display: inline-flex; align-items: center; min-height: 44px; width: fit-content; margin-bottom: 34px; color: var(--clay); font-weight: 900; text-transform: uppercase; font-size: 0.78rem; letter-spacing: 0.1em; text-decoration-thickness: 2px; text-underline-offset: 5px; }
    .article-hero { display: grid; grid-template-columns: minmax(0, 0.78fr) minmax(230px, 0.22fr); gap: 34px; align-items: end; margin-bottom: 34px; }
    .article-hero-main { display: grid; gap: 20px; }
    .article-hero h1 { max-width: 13ch; font-size: 5.15rem; line-height: 0.96; letter-spacing: 0; }
    .article-hero p { max-width: 62ch; color: var(--ink-soft); font-size: 1.18rem; line-height: 1.55; }
    .article-entry-code { border: 1.5px dashed var(--line-strong); background: rgba(255, 248, 236, 0.68); padding: 18px; display: grid; gap: 10px; transform: rotate(1.2deg); box-shadow: 6px 6px 0 rgba(24, 32, 28, 0.08); }
    .article-entry-code span { color: var(--sandstone); font-size: 0.74rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
    .article-entry-code strong { font-family: var(--font-display); font-size: 2.05rem; line-height: 1; }
    .article-entry-code p { font-size: 0.96rem; line-height: 1.42; }
    .article-meta-line { display: flex; flex-wrap: wrap; gap: 10px; color: var(--sandstone); font-weight: 900; text-transform: uppercase; font-size: 0.82rem; }
    .article-meta-line span { border: 1px solid color-mix(in srgb, currentColor 34%, transparent); border-radius: 999px; padding: 3px 9px; background: rgba(255, 248, 236, 0.68); }
    .article-cover { position: relative; min-height: 470px; border: 12px solid var(--white); border-radius: 2px; overflow: hidden; background: repeating-linear-gradient(135deg, rgba(255, 248, 236, 0.12) 0 1px, transparent 1px 18px), linear-gradient(135deg, var(--sage-deep), var(--ink)); box-shadow: var(--shadow); }
    .article-cover::before { content: "FIELD PHOTO"; position: absolute; top: 18px; right: 18px; z-index: 2; border: 1.5px solid rgba(255, 248, 236, 0.72); color: rgba(255, 248, 236, 0.88); padding: 6px 10px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; transform: rotate(3deg); }
    .article-cover img { width: 100%; height: 100%; min-height: 470px; object-fit: cover; }
    .article-cover img.is-broken { opacity: 0; }
    .article-cover figcaption { position: absolute; left: 18px; bottom: 18px; max-width: min(520px, calc(100% - 36px)); background: rgba(24, 32, 28, 0.82); color: rgba(255, 250, 242, 0.94); border: 1px solid rgba(255, 250, 242, 0.18); padding: 8px 10px; font-size: 0.84rem; font-weight: 700; }
    .article-layout { display: grid; grid-template-columns: minmax(190px, 0.28fr) minmax(0, 0.72fr); gap: 42px; align-items: start; margin-top: 46px; }
    .article-dossier { position: sticky; top: 104px; border: 1.5px dashed var(--line-strong); background: rgba(255, 248, 236, 0.62); padding: 18px; display: grid; gap: 16px; }
    .dossier-label { color: var(--sandstone); font-size: 0.72rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
    .article-dossier p { color: var(--ink-soft); font-size: 0.98rem; }
    .article-dossier dl { display: grid; gap: 10px; }
    .article-dossier div { border-top: 1px solid var(--line); padding-top: 10px; }
    .article-dossier dt { color: var(--ink-soft); font-size: 0.74rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
    .article-dossier dd { margin: 3px 0 0; font-weight: 800; }
    .article-body { max-width: 68ch; font-size: 1.13rem; line-height: 1.78; color: var(--ink-soft); }
    .article-body > * + * { margin-top: 1.18em; }
    .article-body > p:first-child::first-letter { float: left; font-family: var(--font-display); color: var(--clay); font-size: 4.8rem; line-height: 0.86; padding: 8px 10px 0 0; font-weight: 800; }
    .article-body h2, .article-body h3 { color: var(--ink); margin-top: 1.85em; line-height: 1.08; }
    .article-body h2 { font-size: 2.55rem; }
    .article-body h3 { font-size: 1.72rem; }
    .article-body a { color: var(--clay); font-weight: 800; text-decoration-thickness: 2px; text-underline-offset: 4px; }
    .article-body blockquote { border: 1.5px solid var(--line-strong); background: color-mix(in srgb, var(--paper-deep) 62%, var(--white)); box-shadow: 6px 6px 0 rgba(24, 32, 28, 0.08); padding: 22px; color: var(--ink); font-family: var(--font-display); font-size: 1.62rem; line-height: 1.34; transform: rotate(-1deg); }
    .article-body blockquote::before { content: "Field note"; display: block; margin-bottom: 10px; color: var(--sandstone); font-family: var(--font-body); font-size: 0.72rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
    .article-body ul { padding-left: 1.2em; }
    .article-body li + li { margin-top: 0.5em; }
    .article-signoff { margin-top: 42px; border-top: 1px solid var(--line); padding-top: 18px; color: var(--ink-soft); font-weight: 800; }
    .article-nav { margin-top: 54px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .article-nav-card { min-height: 126px; border: 1.5px solid var(--line); border-radius: 3px; background: rgba(255, 248, 236, 0.72); padding: 18px; display: grid; align-content: space-between; text-decoration: none; transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
    .article-nav-card span { color: var(--sandstone); font-size: 0.74rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
    .article-nav-card strong { color: var(--ink); font-family: var(--font-display); font-size: 1.45rem; line-height: 1.1; }
    .article-nav-card:hover, .article-nav-card:focus-visible { border-color: var(--line-strong); box-shadow: 6px 6px 0 rgba(24, 32, 28, 0.1); transform: translateY(-2px); }
    .article-actions { margin-top: 22px; display: flex; gap: 12px; flex-wrap: wrap; }
    @media (max-width: 980px) { .article-hero, .article-layout { grid-template-columns: 1fr; } .article-hero h1 { font-size: 4.2rem; } .article-entry-code, .article-dossier { position: static; transform: none; } .article-dossier dl { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 660px) { .article-page { padding-top: 44px; } .article-shell { width: min(calc(100% - 28px), 1120px); } .article-hero h1 { font-size: 3.05rem; } .article-cover, .article-cover img { min-height: 285px; } .article-cover figcaption { position: static; max-width: none; background: var(--ink); } .article-dossier dl, .article-nav { grid-template-columns: 1fr; } .article-body { font-size: 1.04rem; } .article-body > p:first-child::first-letter { font-size: 3.7rem; } .article-body h2 { font-size: 2rem; } .article-body blockquote { font-size: 1.35rem; transform: none; } }
  </style>
</head>
<body id="top">
  <a class="skip-link" href="#article">Skip to article</a>
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
      <div class="nav-socials">
        <a href="https://www.instagram.com/your_majestic_travels" target="_blank" rel="noopener" aria-label="Instagram">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
        </a>
        <a href="https://www.tiktok.com/@your_majestic_travels" target="_blank" rel="noopener" aria-label="TikTok">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.2 8.2 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z"/></svg>
        </a>
        <a href="https://ko-fi.com/majestictravels" target="_blank" rel="noopener" aria-label="Ko-fi">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/></svg>
        </a>
        <a href="https://majestictravels.gumroad.com/" target="_blank" rel="noopener" aria-label="Gumroad">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm4.656 16.104c-1.326 1.326-3.156 2.04-5.076 2.04-1.848 0-3.636-.684-5.016-1.944l1.14-1.14c1.08 1.008 2.46 1.56 3.876 1.56 1.488 0 2.904-.564 3.948-1.608s1.608-2.46 1.608-3.948-.564-2.904-1.608-3.948-2.46-1.608-3.948-1.608c-2.868 0-5.28 2.16-5.52 5.016h3.504L5.58 15.504 1.596 11.52h3.024c.252-4.08 3.636-7.32 7.8-7.32 2.148 0 4.068.828 5.544 2.304a7.785 7.785 0 012.304 5.544c-.012 2.076-.828 3.96-2.304 5.436l-.348-.384.036.048.004-.044z"/></svg>
        </a>
      </div>
    </div>
  </nav>
  <main class="article-page" id="article">
    <article class="article-shell">
      <a class="article-breadcrumb" href="../majestic-travels-blog.html#stories">Back to reading room</a>
      <header class="article-hero">
        <div class="article-hero-main">
          <span class="kicker">${escapeHtml(post.categoryLabel)}</span>
          <h1>${escapeHtml(post.title)}</h1>
          <p>${escapeHtml(post.excerpt)}</p>
          <div class="article-meta-line">
            <span>${escapeHtml(dateLabel(post.date))}</span>
            <span>${escapeHtml(post.readTime)}</span>
            ${post.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>
        <aside class="article-entry-code" aria-label="Entry summary">
          <span>${escapeHtml(entryCode)}</span>
          <strong>${escapeHtml(post.categoryLabel)}</strong>
          <p>${escapeHtml(post.brief || "A fresh notebook entry from Majestic Travels.")}</p>
        </aside>
      </header>
      <figure class="article-cover">
        <img src="${escapeHtml(articleImage)}" alt="${escapeHtml(post.imageAlt)}" fetchpriority="high" decoding="async">
        <figcaption>Field photo: ${escapeHtml(post.imageAlt)}</figcaption>
      </figure>
      <div class="article-layout">
        <aside class="article-dossier" aria-label="Article details">
          <span class="dossier-label">Notebook brief</span>
          <p>${escapeHtml(post.brief || post.excerpt)}</p>
          <dl>
            <div>
              <dt>Filed under</dt>
              <dd>${escapeHtml(post.categoryLabel)}</dd>
            </div>
            <div>
              <dt>Reading time</dt>
              <dd>${escapeHtml(post.readTime)}</dd>
            </div>
            <div>
              <dt>Tags</dt>
              <dd>${escapeHtml(post.tags.join(", ") || "Travel")}</dd>
            </div>
          </dl>
        </aside>
        <div>
          <div class="article-body">
${markdownToHtml(post.body)}
          </div>
          <p class="article-signoff">Saved in the Majestic Travels notebook on ${escapeHtml(dateLabel(post.date))}.</p>
        </div>
      </div>
      <nav class="article-nav" aria-label="Article navigation">
        ${relatedLink("Newer entry", newerPost, "../majestic-travels-blog.html#stories", "Return to the reading room")}
        ${relatedLink("Older entry", olderPost, "../majestic-travels-blog.html#newsletter", "Get new posts by email")}
      </nav>
      <div class="article-actions">
        <a class="button" href="../majestic-travels-blog.html#stories">Back to stories</a>
        <a class="button secondary" href="../majestic-travels-blog.html#newsletter">Get new posts</a>
      </div>
    </article>
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <img src="../public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="footer-logo">
        <span class="footer-name">Majestic Travels</span>
        <p class="footer-tagline">Solo travel. Real places. No filters.</p>
        <div class="footer-socials">
          <a href="https://www.instagram.com/your_majestic_travels" target="_blank" rel="noopener" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
          </a>
          <a href="https://www.tiktok.com/@your_majestic_travels" target="_blank" rel="noopener" aria-label="TikTok">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.2 8.2 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z"/></svg>
          </a>
          <a href="https://ko-fi.com/majestictravels" target="_blank" rel="noopener" aria-label="Ko-fi">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/></svg>
          </a>
          <a href="https://majestictravels.gumroad.com/" target="_blank" rel="noopener" aria-label="Gumroad">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm4.656 16.104c-1.326 1.326-3.156 2.04-5.076 2.04-1.848 0-3.636-.684-5.016-1.944l1.14-1.14c1.08 1.008 2.46 1.56 3.876 1.56 1.488 0 2.904-.564 3.948-1.608s1.608-2.46 1.608-3.948-.564-2.904-1.608-3.948-2.46-1.608-3.948-1.608c-2.868 0-5.28 2.16-5.52 5.016h3.504L5.58 15.504 1.596 11.52h3.024c.252-4.08 3.636-7.32 7.8-7.32 2.148 0 4.068.828 5.544 2.304a7.785 7.785 0 012.304 5.544c-.012 2.076-.828 3.96-2.304 5.436l-.348-.384.036.048.004-.044z"/></svg>
          </a>
        </div>
      </div>
      <nav class="footer-nav" aria-label="Footer navigation">
        <a href="../majestic-travels-blog.html#stories">Stories</a>
        <a href="../rss.xml">RSS</a>
        <a href="https://www.instagram.com/your_majestic_travels" target="_blank" rel="noopener">Instagram</a>
        <a href="https://www.tiktok.com/@your_majestic_travels" target="_blank" rel="noopener">TikTok</a>
        <a href="https://ko-fi.com/majestictravels" target="_blank" rel="noopener">Ko-fi</a>
        <a href="https://majestictravels.gumroad.com/" target="_blank" rel="noopener">Gumroad</a>
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
      const markBroken = () => image.classList.add("is-broken");
      image.addEventListener("error", markBroken, { once: true });
      if (image.complete && image.naturalWidth === 0) markBroken();
    });
  </script>
</body>
</html>`;
}

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = slugify(path.basename(file, ".md"));
      const { meta, body } = parseFrontmatter(read(path.join(POSTS_DIR, file)), file);
      const category = slugify(meta.category || "Essay");
      return {
        slug,
        title: meta.title || slug,
        date: meta.date || "2026-01-01",
        category,
        categoryLabel: meta.category || "Essay",
        tags: splitList(meta.tags),
        readTime: meta.readTime || "5 min",
        excerpt: meta.excerpt || "",
        brief: meta.brief || "",
        image: meta.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=85",
        imageAlt: meta.imageAlt || meta.title || "Travel photograph",
        keywords: meta.keywords || "",
        body,
        url: `blog/${slug}.html`
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function updateHome(home, posts) {
  const start = home.indexOf('<div class="story-grid" id="storyGrid">');
  const end = home.indexOf('\n        </div>\n\n        <p class="empty"', start);
  if (start === -1 || end === -1) {
    throw new Error("Could not find the homepage story grid.");
  }

  const generatedGrid = `<div class="story-grid" id="storyGrid">
          <!-- Generated by scripts/build-blog.js from posts/*.md. Edit Markdown posts, not these cards. -->
${posts.map(cardHtml).join("\n\n")}
        </div>`;

  return home.slice(0, start) + generatedGrid + home.slice(end + "\n        </div>".length);
}

function updateFeatured(home, posts) {
  const post = posts[0]; // most recent post (sorted descending by date)
  const meta = [post.categoryLabel, post.readTime].filter(Boolean).join(" · ");

  const html = `<section class="featured-section" aria-label="Featured post">
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

  // First try: replace the anchor div (fresh template or after git checkout)
  const ANCHOR = '<div id="featuredPost"></div>';
  const anchorPos = home.indexOf(ANCHOR);
  if (anchorPos !== -1) {
    return home.slice(0, anchorPos) + html + home.slice(anchorPos + ANCHOR.length);
  }

  // Second try: replace an already-rendered featured section (re-build after first run)
  const SECTION_START = '<section class="featured-section" aria-label="Featured post">';
  const SECTION_END = '</section>';
  const startPos = home.indexOf(SECTION_START);
  if (startPos !== -1) {
    const endPos = home.indexOf(SECTION_END, startPos);
    if (endPos !== -1) {
      return home.slice(0, startPos) + html + home.slice(endPos + SECTION_END.length);
    }
  }

  return home; // Neither found — skip silently
}

function writeLaunchFiles(posts) {
  const urls = [
    { loc: `${SITE_URL}/`, changefreq: "weekly", priority: "1.0" },
    ...posts.map((post) => ({
      loc: absoluteUrl(`blog/${post.slug}.html`),
      lastmod: post.date,
      changefreq: "monthly",
      priority: "0.8"
    }))
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((item) => `  <url>
    <loc>${escapeHtml(item.loc)}</loc>${item.lastmod ? `\n    <lastmod>${escapeHtml(item.lastmod)}</lastmod>` : ""}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Majestic Travels</title>
    <link>${SITE_URL}/</link>
    <description>Slow travel stories, solo guides, and field notes by Adrien.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${posts.map((post) => `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${escapeHtml(absoluteUrl(`blog/${post.slug}.html`))}</link>
      <guid isPermaLink="true">${escapeHtml(absoluteUrl(`blog/${post.slug}.html`))}</guid>
      <pubDate>${rssDate(post.date)}</pubDate>
      <category>${escapeHtml(post.categoryLabel)}</category>
      <description>${escapeHtml(post.excerpt)}</description>
    </item>`).join("\n")}
  </channel>
</rss>
`;

  write(SITEMAP_FILE, sitemap);
  write(ROBOTS_FILE, robots);
  write(RSS_FILE, rss);
}

function main() {
  const home = read(HOME_FILE).replace(/\r\n/g, "\n");
  const posts = loadPosts();
  if (!posts.length) throw new Error("No Markdown posts found in posts/.");

  const { css } = getHomeParts(home);
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  posts.forEach((post, index) => {
    write(path.join(BLOG_DIR, `${post.slug}.html`), articleHtml(post, css, { index, posts }));
  });
  write(HOME_FILE, updateFeatured(updateHome(home, posts), posts));
  writeLaunchFiles(posts);

  console.log(`Built ${posts.length} posts.`);
  console.log(`Updated ${path.basename(HOME_FILE)}, blog/*.html, sitemap.xml, robots.txt, and rss.xml.`);
}

main();

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HOME_FILE = path.join(ROOT, "majestic-travels-blog.html");
const POSTS_DIR = path.join(ROOT, "posts");
const BLOG_DIR = path.join(ROOT, "blog");
const SITEMAP_FILE = path.join(ROOT, "sitemap.xml");
const HTML_SITEMAP_FILE = path.join(ROOT, "sitemap.html");
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
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, text, url) {
      if (/^https?:\/\//i.test(url)) {
        return '<a href="' + url + '" target="_blank" rel="noopener">' + text + '</a>';
      }
      return '<a href="' + url + '">' + text + '</a>';
    });
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

    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\((.*?)(?:\s+["']([^"']+)["'])?\)$/);
    if (imgMatch) {
      flushParagraph();
      flushList();
      const alt = escapeHtml(imgMatch[1]);
      const src = relativeFromBlog(imgMatch[2]);
      const caption = escapeHtml(imgMatch[3] || imgMatch[1]);
      html.push(`<figure class="article-photo"><img src="${src}" alt="${alt}" loading="lazy" decoding="async"><figcaption>${caption}</figcaption></figure>`);
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function sitemapLastmod(dateValue, buildDate = todayIsoDate()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue || "")) return buildDate;
  return dateValue > buildDate ? buildDate : dateValue;
}

function sitemapUrl(urlPath = "") {
  return encodeURI(absoluteUrl(urlPath)).replace(/%25([0-9A-Fa-f]{2})/g, "%$1");
}

function destinationGroups(posts) {
  const groups = new Map();
  posts.forEach((post) => {
    const destinations = getDestinations(post.tags).split(/\s+/).filter(Boolean);
    destinations.forEach((destination) => {
      if (!groups.has(destination)) groups.set(destination, []);
      groups.get(destination).push(post);
    });
  });
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function siteSchema(posts) {
  const homeUrl = `${SITE_URL}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${homeUrl}#organization`,
        name: "Majestic Travels",
        url: homeUrl,
        logo: absoluteUrl("public/site/brand-logo.png"),
        sameAs: [
          "https://www.instagram.com/your_majestic_travels",
          "https://www.tiktok.com/@your_majestic_travels",
          "https://ko-fi.com/majestictravels",
          "https://majestictravels.gumroad.com/"
        ]
      },
      {
        "@type": "Person",
        "@id": `${homeUrl}#adrien`,
        name: "Adrien",
        url: homeUrl,
        image: absoluteUrl("public/site/profile-pic.jpg"),
        worksFor: { "@id": `${homeUrl}#organization` }
      },
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        name: "Majestic Travels",
        url: homeUrl,
        publisher: { "@id": `${homeUrl}#organization` },
        author: { "@id": `${homeUrl}#adrien` },
        inLanguage: "en"
      },
      {
        "@type": "Blog",
        "@id": `${homeUrl}#blog`,
        name: "Majestic Travels",
        url: homeUrl,
        description: "An editorial travel blog about slow travel, solo adventures, city guides, and honest field notes.",
        publisher: { "@id": `${homeUrl}#organization` },
        author: { "@id": `${homeUrl}#adrien` },
        blogPost: posts.map((post) => ({
          "@type": "BlogPosting",
          "@id": `${absoluteUrl(`blog/${post.slug}.html`)}#blogposting`,
          headline: post.title,
          datePublished: post.date,
          url: absoluteUrl(`blog/${post.slug}.html`),
          author: { "@id": `${homeUrl}#adrien` }
        }))
      },
      {
        "@type": "ItemList",
        "@id": `${homeUrl}#latest-posts`,
        name: "Latest Majestic Travels stories",
        itemListElement: posts.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(`blog/${post.slug}.html`),
          name: post.title
        }))
      }
    ]
  };
}

function getHomeParts(home) {
  const styleMatch = home.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) throw new Error("Could not find homepage CSS.");
  return { css: styleMatch[1] };
}

function htmlAttrValue(html, attrName) {
  const match = html.match(new RegExp(`${attrName}="([^"]*)"`));
  return match ? match[1] : "";
}

const DEFAULT_KLAVIYO_PUBLIC_KEY = "VQW5sn";

function klaviyoPublicKeyFromHome(home) {
  const scriptMatch = home.match(/klaviyo\.js\?company_id=([^"&]+)/i);
  return scriptMatch ? decodeURIComponent(scriptMatch[1]) : "";
}

function getKlaviyoConfig(home) {
  return {
    publicKey: process.env.KLAVIYO_PUBLIC_API_KEY || htmlAttrValue(home, "data-klaviyo-public-key") || klaviyoPublicKeyFromHome(home) || DEFAULT_KLAVIYO_PUBLIC_KEY,
    listId: process.env.KLAVIYO_LIST_ID || htmlAttrValue(home, "data-klaviyo-list-id")
  };
}

function updateKlaviyoConfig(home, config) {
  const publicKey = escapeHtml(config.publicKey || "");
  const listId = escapeHtml(config.listId || "");

  return home
    .replace(/klaviyo\.js\?company_id=[^"]*/g, `klaviyo.js?company_id=${encodeURIComponent(config.publicKey || "")}`)
    .replace(/data-klaviyo-public-key="[^"]*"/g, `data-klaviyo-public-key="${publicKey}"`)
    .replace(/data-klaviyo-list-id="[^"]*"/g, `data-klaviyo-list-id="${listId}"`)
    .replace(/(<input type="hidden" name="g" value=")[^"]*(")/g, `$1${listId}$2`);
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
  const klaviyo = context.klaviyo || {};
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
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${articleUrl}#blogposting`,
        headline: post.title,
        description: post.excerpt,
        image: [imageUrl],
        datePublished: post.date,
        dateModified: sitemapLastmod(post.date),
        author: { "@type": "Person", "@id": `${SITE_URL}/#adrien`, name: "Adrien" },
        publisher: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: "Majestic Travels",
          logo: { "@type": "ImageObject", url: absoluteUrl("public/site/brand-logo.png") }
        },
        articleSection: post.categoryLabel,
        keywords: allTags.join(", "),
        mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${articleUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Stories", item: `${SITE_URL}/#stories` },
          { "@type": "ListItem", position: 3, name: post.title, item: articleUrl }
        ]
      }
    ]
  };
  const affiliateCallout = post.affiliate === false ? "" : `          <aside class="affiliate-callout" aria-label="Travel connectivity tip">
            <span>Before you land</span>
            <p>Need data abroad? Use referral code <strong>ADRIEN9940</strong> when signing up with <a href="https://www.airalo.com/" target="_blank" rel="noopener">Airalo</a> to get a discount on your first eSIM. Download it before you leave home, activate it when you land, and you are ready to explore from the moment you arrive.</p>
          </aside>
`;
  const commentsEmbed = `      <section class="article-comments" aria-label="Reader comments" data-comments data-post-slug="${escapeHtml(post.slug)}">
        <div class="article-comments-header">
          <span class="article-comments-label">Field notes</span>
          <h2>Leave a note from the road</h2>
          <p>Tips, questions, tiny corrections, or your own version of the trip. Notes are checked before they appear.</p>
        </div>
        <div class="article-comments-board">
          <div class="comment-list" data-comment-list aria-live="polite">
            <p class="comment-empty">Checking the guestbook...</p>
          </div>
          <form class="comment-form" data-comment-form>
            <div class="comment-form-stamp" aria-hidden="true">Postcard reply</div>
            <div class="comment-fields">
              <label>
                <span>Name</span>
                <input type="text" name="name" autocomplete="name" maxlength="80" required>
              </label>
              <label>
                <span>Email <em>optional</em></span>
                <input type="email" name="email" autocomplete="email" maxlength="180">
              </label>
            </div>
            <label>
              <span>Note</span>
              <textarea name="body" rows="5" maxlength="1200" required></textarea>
            </label>
            <label class="comment-honeypot" aria-hidden="true" tabindex="-1">
              <span>Website</span>
              <input type="text" name="website" autocomplete="off" tabindex="-1">
            </label>
            <div class="comment-form-footer">
              <p class="comment-form-status" data-comment-status role="status"></p>
              <button class="button" type="submit">Send note</button>
            </div>
          </form>
        </div>
      </section>
`;

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
  <meta name="theme-color" content="#2c2a26">
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
    .article-photo { margin: 2em 0; }
    .article-photo img { width: 100%; height: auto; border-radius: var(--radius); }
    .article-photo figcaption { margin-top: 8px; color: var(--ink-soft); font-size: 0.84rem; font-style: italic; }
    .article-body ul { padding-left: 1.2em; }
    .article-body li + li { margin-top: 0.5em; }
    .article-signoff { margin-top: 42px; border-top: 1px solid var(--line); padding-top: 18px; color: var(--ink-soft); font-weight: 800; }
    .article-nav { margin-top: 54px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .article-nav-card { min-height: 126px; border: 1.5px solid var(--line); border-radius: 3px; background: rgba(255, 248, 236, 0.72); padding: 18px; display: grid; align-content: space-between; text-decoration: none; transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
    .article-nav-card span { color: var(--sandstone); font-size: 0.74rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
    .article-nav-card strong { color: var(--ink); font-family: var(--font-display); font-size: 1.45rem; line-height: 1.1; }
    .article-nav-card:hover, .article-nav-card:focus-visible { border-color: var(--line-strong); box-shadow: 6px 6px 0 rgba(24, 32, 28, 0.1); transform: translateY(-2px); }
    .article-actions { margin-top: 22px; display: flex; gap: 12px; flex-wrap: wrap; }
    .article-comments { margin-top: 62px; border-top: 1.5px dashed var(--line-strong); padding-top: 32px; display: grid; gap: 22px; }
    .article-comments-header { max-width: 68ch; display: grid; gap: 9px; }
    .article-comments-label { color: var(--sandstone); font-size: 0.74rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
    .article-comments h2 { margin: 0; color: var(--ink); font-family: var(--font-display); font-size: 2.35rem; line-height: 1.04; letter-spacing: 0; }
    .article-comments-header p { color: var(--ink-soft); font-size: 1.02rem; line-height: 1.58; }
    .article-comments-board { width: min(100%, 760px); display: grid; gap: 18px; }
    .comment-list { display: grid; gap: 12px; }
    .comment-empty { border: 1.5px dashed var(--line-strong); background: rgba(255, 248, 236, 0.48); color: var(--ink-soft); padding: 16px 18px; font-weight: 700; }
    .comment-card { position: relative; border: 1.5px solid var(--line); background: rgba(255, 248, 236, 0.72); padding: 18px; box-shadow: 5px 5px 0 rgba(24, 32, 28, 0.06); }
    .comment-card::before { content: ""; position: absolute; inset: 8px 8px auto auto; width: 42px; height: 32px; border: 1.5px dashed color-mix(in srgb, var(--sandstone) 70%, transparent); opacity: 0.5; }
    .comment-card header { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: baseline; margin-bottom: 8px; padding-right: 52px; }
    .comment-card strong { color: var(--ink); font-weight: 900; }
    .comment-card time { color: var(--sandstone); font-size: 0.78rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
    .comment-card p { white-space: pre-line; color: var(--ink-soft); line-height: 1.62; }
    .comment-form { position: relative; border: 1.5px solid var(--line-strong); background: linear-gradient(135deg, rgba(255, 248, 236, 0.95), rgba(230, 203, 163, 0.3)); box-shadow: 8px 8px 0 rgba(24, 32, 28, 0.08); padding: 22px; display: grid; gap: 16px; }
    .comment-form-stamp { justify-self: start; border: 1.5px dashed var(--sandstone); color: var(--clay); padding: 5px 8px; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; transform: rotate(1.5deg); }
    .comment-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .comment-form label { display: grid; gap: 7px; color: var(--ink); font-weight: 900; }
    .comment-form label span { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .comment-form label em { color: var(--ink-soft); font-style: normal; font-weight: 700; letter-spacing: 0; text-transform: none; }
    .comment-form input, .comment-form textarea { width: 100%; border: 1.5px solid var(--line-strong); border-radius: 2px; background: var(--white); color: var(--ink); padding: 10px 12px; font: inherit; outline: none; transition: border-color 160ms ease, box-shadow 160ms ease; }
    .comment-form textarea { resize: vertical; min-height: 132px; }
    .comment-form input:focus, .comment-form textarea:focus { border-color: var(--sandstone); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sandstone) 18%, transparent); }
    .comment-honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
    .comment-form-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .comment-form-status { min-height: 1.4em; color: var(--ink-soft); font-weight: 800; }
    .comment-form-status.is-error { color: var(--clay); }
    .comment-form-status.is-success { color: var(--sage); }
    @media (max-width: 980px) { .article-hero, .article-layout { grid-template-columns: 1fr; } .article-hero h1 { font-size: 4.2rem; } .article-entry-code, .article-dossier { position: static; transform: none; } .article-dossier dl { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 660px) { .article-page { padding-top: 44px; } .article-shell { width: min(calc(100% - 28px), 1120px); } .article-hero h1 { font-size: 3.05rem; } .article-cover, .article-cover img { min-height: 285px; } .article-cover figcaption { position: static; max-width: none; background: var(--ink); } .article-dossier dl, .article-nav { grid-template-columns: 1fr; } .article-body { font-size: 1.04rem; } .article-body > p:first-child::first-letter { font-size: 3.7rem; } .article-body h2 { font-size: 2rem; } .article-body blockquote { font-size: 1.35rem; transform: none; } .article-comments { margin-top: 42px; padding-top: 24px; } .article-comments h2 { font-size: 1.78rem; } .comment-fields { grid-template-columns: 1fr; } .comment-form { padding: 18px; box-shadow: 5px 5px 0 rgba(24, 32, 28, 0.08); } .comment-form-footer { align-items: stretch; } .comment-form-footer .button { width: 100%; justify-content: center; } }
    [data-theme="dark"] .article-entry-code { background: var(--cream-deep); box-shadow: none; }
    [data-theme="dark"] .article-entry-code strong { color: var(--ink); }
    [data-theme="dark"] .article-entry-code p { color: var(--ink-soft); }
    [data-theme="dark"] .article-meta-line span { background: rgba(250, 246, 240, 0.08); }
    [data-theme="dark"] .article-dossier { background: var(--cream-deep); }
    [data-theme="dark"] .article-nav-card { background: var(--cream-deep); }
    [data-theme="dark"] .article-nav-card:hover, [data-theme="dark"] .article-nav-card:focus-visible { box-shadow: 6px 6px 0 rgba(0,0,0,0.3); }
    [data-theme="dark"] .article-body blockquote { background: var(--cream-deep); box-shadow: none; }
    [data-theme="dark"] .comment-empty, [data-theme="dark"] .comment-card, [data-theme="dark"] .comment-form { background: var(--cream-deep); box-shadow: none; }
  </style>
  <script>
  (function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='dark'?'#1a1917':'#2c2a26'})();
  </script>
</head>
<body id="top">
  <a class="skip-link" href="#article">Skip to article</a>
  <nav class="site-nav nav-solid" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="../majestic-travels-blog.html" class="nav-brand">
        <img src="../public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="nav-logo">
        <span class="nav-brand-name">Majestic Travels</span>
      </a>
      <ul class="nav-menu" role="list">
        <li><a href="../majestic-travels-blog.html#stories">Stories</a></li>
        <li><a href="../majestic-travels-blog.html#destinations">Destinations</a></li>
        <li><a href="../majestic-travels-blog.html#about">About</a></li>
      </ul>
      <div class="nav-socials">
        <a href="https://www.instagram.com/your_majestic_travels" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg></a>
        <a href="https://www.tiktok.com/@your_majestic_travels" target="_blank" rel="noopener" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.2 8.2 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z"/></svg></a>
        <a href="https://ko-fi.com/majestictravels" target="_blank" rel="noopener" aria-label="Ko-fi"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/></svg></a>
        <a href="https://majestictravels.gumroad.com/" target="_blank" rel="noopener" aria-label="Gumroad"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm4.656 16.104c-1.326 1.326-3.156 2.04-5.076 2.04-1.848 0-3.636-.684-5.016-1.944l1.14-1.14c1.08 1.008 2.46 1.56 3.876 1.56 1.488 0 2.904-.564 3.948-1.608s1.608-2.46 1.608-3.948-.564-2.904-1.608-3.948-2.46-1.608-3.948-1.608c-2.868 0-5.28 2.16-5.52 5.016h3.504L5.58 15.504 1.596 11.52h3.024c.252-4.08 3.636-7.32 7.8-7.32 2.148 0 4.068.828 5.544 2.304a7.785 7.785 0 012.304 5.544c-.012 2.076-.828 3.96-2.304 5.436l-.348-.384.036.048.004-.044z"/></svg></a>
        <a href="mailto:info@majestic-travels.com" aria-label="Email Majestic Travels"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6L12 13 2 6"/></svg></a>
      </div>
      <div class="nav-actions">
        <button class="theme-toggle" aria-label="Toggle dark mode" onclick="toggleTheme()">
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
        </button>
        <button class="nav-hamburger" aria-label="Menu" aria-expanded="false" onclick="document.querySelector('.nav-mobile-panel').classList.toggle('open');this.setAttribute('aria-expanded',this.getAttribute('aria-expanded')==='false'?'true':'false')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
      <div class="nav-mobile-panel">
        <a href="../majestic-travels-blog.html#stories">Stories</a>
        <a href="../majestic-travels-blog.html#destinations">Destinations</a>
        <a href="../majestic-travels-blog.html#about">About</a>
        <a href="mailto:info@majestic-travels.com">Email</a>
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
${affiliateCallout}
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
${commentsEmbed}
    </article>
  </main>
  <section class="newsletter-section" aria-label="Newsletter signup">
    <div class="newsletter-section-inner">
      <h2>Get exclusive itineraries &amp; travel stories</h2>
      <p>Real destinations, honest tips — delivered to your inbox. No spam, ever.</p>
      <form class="newsletter-form" id="ctaNewsletterForm" action="https://manage.kmail-lists.com/subscriptions/subscribe" method="post" data-klaviyo-form data-klaviyo-public-key="${escapeHtml(klaviyo.publicKey || "")}" data-klaviyo-list-id="${escapeHtml(klaviyo.listId || "")}">
        <input type="hidden" name="g" value="${escapeHtml(klaviyo.listId || "")}">
        <input type="email" name="email" placeholder="your@email.com" class="newsletter-input" aria-label="Email address" autocomplete="email" required>
        <button type="submit" class="newsletter-btn">Subscribe</button>
      </form>
      <p class="newsletter-note">Unsubscribe anytime</p>
    </div>
  </section>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <img src="../public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="footer-logo">
        <span class="footer-name">Majestic Travels</span>
        <p class="footer-tagline">Solo travel. Real places. No filters.</p>
      </div>
      <div class="footer-right">
        <ul class="footer-links">
          <li><a href="../majestic-travels-blog.html#stories">Stories</a></li>
          <li><a href="../majestic-travels-blog.html#destinations">Destinations</a></li>
          <li><a href="../majestic-travels-blog.html#about">About</a></li>
          <li><a href="../rss.xml">RSS</a></li>
          <li><a href="../sitemap.html">Sitemap</a></li>
        </ul>
        <div class="footer-socials">
          <a href="https://www.instagram.com/your_majestic_travels" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg></a>
          <a href="https://www.tiktok.com/@your_majestic_travels" target="_blank" rel="noopener" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.2 8.2 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z"/></svg></a>
          <a href="https://ko-fi.com/majestictravels" target="_blank" rel="noopener" aria-label="Ko-fi"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/></svg></a>
          <a href="https://majestictravels.gumroad.com/" target="_blank" rel="noopener" aria-label="Gumroad"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm4.656 16.104c-1.326 1.326-3.156 2.04-5.076 2.04-1.848 0-3.636-.684-5.016-1.944l1.14-1.14c1.08 1.008 2.46 1.56 3.876 1.56 1.488 0 2.904-.564 3.948-1.608s1.608-2.46 1.608-3.948-.564-2.904-1.608-3.948-2.46-1.608-3.948-1.608c-2.868 0-5.28 2.16-5.52 5.016h3.504L5.58 15.504 1.596 11.52h3.024c.252-4.08 3.636-7.32 7.8-7.32 2.148 0 4.068.828 5.544 2.304a7.785 7.785 0 012.304 5.544c-.012 2.076-.828 3.96-2.304 5.436l-.348-.384.036.048.004-.044z"/></svg></a>
          <a href="mailto:info@majestic-travels.com" aria-label="Email Majestic Travels"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6L12 13 2 6"/></svg></a>
        </div>
        <p class="footer-copy">&copy; 2026 Majestic Travels</p>
      </div>
    </div>
  </footer>
  <script>
    window.toggleTheme = function() {
      var html = document.documentElement;
      var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = next === 'dark' ? '#1a1917' : '#2c2a26';
    };
    (function() {
      // Reader comments
      function initArticleComments() {
        var root = document.querySelector("[data-comments]");
        if (!root) return;

        var postSlug = root.getAttribute("data-post-slug");
        var list = root.querySelector("[data-comment-list]");
        var form = root.querySelector("[data-comment-form]");
        var status = root.querySelector("[data-comment-status]");

        function setStatus(message, type) {
          if (!status) return;
          status.textContent = message || "";
          status.classList.toggle("is-error", type === "error");
          status.classList.toggle("is-success", type === "success");
        }

        function emptyState(message) {
          list.innerHTML = "";
          var empty = document.createElement("p");
          empty.className = "comment-empty";
          empty.textContent = message;
          list.appendChild(empty);
        }

        function renderComments(comments) {
          list.innerHTML = "";
          if (!comments.length) {
            emptyState("No field notes yet. Yours can be the first.");
            return;
          }

          comments.forEach(function(comment) {
            var card = document.createElement("article");
            card.className = "comment-card";

            var header = document.createElement("header");
            var author = document.createElement("strong");
            var time = document.createElement("time");
            var body = document.createElement("p");

            author.textContent = comment.authorName || "A fellow traveler";
            time.dateTime = comment.createdAt || "";
            time.textContent = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "Recently";
            body.textContent = comment.body || "";

            header.appendChild(author);
            header.appendChild(time);
            card.appendChild(header);
            card.appendChild(body);
            list.appendChild(card);
          });
        }

        function loadComments() {
          return fetch("/api/comments?post=" + encodeURIComponent(postSlug), { headers: { "accept": "application/json" } })
            .then(function(response) {
              if (!response.ok) throw new Error("Comments are not ready yet.");
              return response.json();
            })
            .then(function(data) {
              if (data && data.disabled) {
                emptyState("Field notes are being unpacked. Until then, send thoughts to info@majestic-travels.com.");
                if (form) form.hidden = true;
                return;
              }
              renderComments((data && data.comments) || []);
            })
            .catch(function() {
              emptyState("Field notes are available on the live site.");
            });
        }

        loadComments();

        if (!form) return;
        form.addEventListener("submit", function(event) {
          event.preventDefault();
          setStatus("Sending...", "");
          var submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) submitButton.disabled = true;

          var formData = new FormData(form);
          var payload = {
            postSlug: postSlug,
            name: String(formData.get("name") || ""),
            email: String(formData.get("email") || ""),
            body: String(formData.get("body") || ""),
            website: String(formData.get("website") || "")
          };

          fetch("/api/comments", {
            method: "POST",
            headers: { "accept": "application/json", "content-type": "application/json" },
            body: JSON.stringify(payload)
          })
            .then(function(response) {
              return response.json().catch(function() { return {}; }).then(function(data) {
                if (!response.ok) throw new Error(data.message || "Could not send this note.");
                return data;
              });
            })
            .then(function() {
              form.reset();
              setStatus("Thanks. Your note is live.", "success");
              return loadComments();
            })
            .catch(function(error) {
              setStatus(error.message || "Could not send right now. Try email instead.", "error");
            })
            .then(function() {
              if (submitButton) submitButton.disabled = false;
            });
        });
      }

      initArticleComments();

      // Klaviyo newsletter forms
      function parseKlaviyoError(data) {
        if (data && data.errors && data.errors.length) {
          return data.errors.map(function(error) {
            return error.detail || error.title;
          }).filter(Boolean).join(" ");
        }
        return "";
      }
      
      function ensureKlaviyoListInput(form, listId) {
        var listInput = form.querySelector('input[name="g"]');
        if (!listInput) {
          listInput = document.createElement("input");
          listInput.type = "hidden";
          listInput.name = "g";
          form.insertBefore(listInput, form.firstChild);
        }
        listInput.value = listId;
        return listInput;
      }
      
      function submitClientKlaviyoSubscription(form, email) {
        var listInput = form.querySelector('input[name="g"]');
        var listId = (listInput && listInput.value) || form.dataset.klaviyoListId || "";
        var publicKey = form.dataset.klaviyoPublicKey || "";
      
        if (!publicKey || !listId) {
          return Promise.reject(new Error("Newsletter is not configured yet."));
        }
      
        ensureKlaviyoListInput(form, listId);
      
        return fetch("https://a.klaviyo.com/client/subscriptions?company_id=" + encodeURIComponent(publicKey), {
          method: "POST",
          headers: {
            "accept": "application/vnd.api+json",
            "content-type": "application/vnd.api+json",
            "revision": "2025-01-15"
          },
          body: JSON.stringify({
            data: {
              type: "subscription",
              attributes: {
                custom_source: "Majestic Travels newsletter",
                profile: {
                  data: {
                    type: "profile",
                    attributes: {
                      email: email,
                      subscriptions: {
                        email: {
                          marketing: {
                            consent: "SUBSCRIBED"
                          }
                        }
                      }
                    }
                  }
                }
              },
              relationships: {
                list: {
                  data: {
                    type: "list",
                    id: listId
                  }
                }
              }
            }
          })
        }).then(function(response) {
          if (response.ok) return;
          return response.json().catch(function() {
            return null;
          }).then(function(data) {
            throw new Error(parseKlaviyoError(data) || "Klaviyo rejected this signup.");
          });
        });
      }
      
      function submitHostedKlaviyoForm(form) {
        return new Promise(function(resolve, reject) {
          var listInput = form.querySelector('input[name="g"]');
          var listId = (listInput && listInput.value) || form.dataset.klaviyoListId || "";
      
          if (!listId) {
            reject(new Error("Newsletter is not configured yet."));
            return;
          }
      
          ensureKlaviyoListInput(form, listId);
      
          var iframe = document.createElement("iframe");
          iframe.name = "klaviyo_signup_" + Date.now();
          iframe.hidden = true;
          iframe.setAttribute("title", "Newsletter signup");
          document.body.appendChild(iframe);
      
          var previousTarget = form.target;
          var previousAction = form.action;
          form.target = iframe.name;
          form.action = "https://manage.kmail-lists.com/subscriptions/subscribe";
      
          var finished = false;
          var timeoutId = setTimeout(function() {
            if (finished) return;
            finished = true;
            cleanup();
            reject(new Error("Klaviyo signup did not respond."));
          }, 5000);
      
          function cleanup() {
            form.target = previousTarget;
            form.action = previousAction;
            setTimeout(function() {
              iframe.remove();
            }, 1000);
          }
      
          function finish() {
            if (finished) return;
            finished = true;
            clearTimeout(timeoutId);
            cleanup();
            resolve();
          }
      
          iframe.addEventListener("load", finish, { once: true });
          HTMLFormElement.prototype.submit.call(form);
        });
      }
      
      function subscribeWithKlaviyo(form, email) {
        return submitClientKlaviyoSubscription(form, email).catch(function(error) {
          console.warn("Client API error, falling back to hosted form:", error);
          return submitHostedKlaviyoForm(form);
        });
      }
      
      function handleNewsletterSubmit(form) {
        form.addEventListener("submit", function(e) {
          e.preventDefault();
          var input = form.querySelector("input[type='email']");
          var btn = form.querySelector("button[type='submit']");
          var email = input.value.trim();
          if (!email || !input.reportValidity()) return;
      
          var originalText = btn.textContent;
          btn.textContent = "...";
          btn.disabled = true;
      
          var prevError = form.parentNode.querySelector(".newsletter-error");
          if (prevError) prevError.remove();
      
          subscribeWithKlaviyo(form, email).then(function() {
            if (typeof window._learnq !== "undefined") {
              window._learnq.push(["identify", { "$email": email }]);
              window._learnq.push(["track", "Newsletter Signup", { source: "website" }]);
            }
            form.innerHTML = '<p class="newsletter-success">You\\'re in! Check your inbox to confirm.</p>';
          }).catch(function(err) {
            btn.textContent = originalText;
            btn.disabled = false;
            var errEl = document.createElement("p");
            errEl.className = "newsletter-error";
            errEl.textContent = err.message || "Something went wrong - try again.";
            form.parentNode.insertBefore(errEl, form.nextSibling);
          });
        });
      }
      
      var ctaForm = document.getElementById("ctaNewsletterForm");
      if (ctaForm) handleNewsletterSubmit(ctaForm);
      document.querySelectorAll("img").forEach(function(image) {
        var markBroken = function() { image.classList.add("is-broken"); };
        image.addEventListener("error", markBroken, { once: true });
        if (image.complete && image.naturalWidth === 0) markBroken();
      });
    })();
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
        featured: ["true", "yes", "1"].includes(String(meta.featured || "").toLowerCase()),
        affiliate: !["false", "no", "0"].includes(String(meta.affiliate || "").toLowerCase()),
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
  const post = posts.find((entry) => entry.featured) || posts[0];
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

function updateHomeSchema(home, posts) {
  const schema = `<script type="application/ld+json">\n${jsonLd(siteSchema(posts))}\n  </script>`;
  return home.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, schema);
}

function sitemapPageHtml(posts, css) {
  const groups = destinationGroups(posts);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sitemap | Majestic Travels</title>
  <meta name="description" content="Browse every Majestic Travels story, destination collection, feed, and public page from one simple sitemap.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${SITE_URL}/sitemap.html">
  <link rel="alternate" type="application/rss+xml" title="Majestic Travels RSS" href="${SITE_URL}/rss.xml">
  <link rel="icon" type="image/png" href="public/site/brand-logo.png">
  <link rel="apple-touch-icon" href="public/site/brand-logo.png">
  <meta name="theme-color" content="#2c2a26">
  <script type="application/ld+json">${jsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Majestic Travels Sitemap",
    url: `${SITE_URL}/sitemap.html`,
    description: "A complete public index of Majestic Travels pages and stories.",
    isPartOf: { "@id": `${SITE_URL}/#website` }
  })}</script>
  <style>${css}
    .sitemap-page { padding: 64px 0 96px; }
    .sitemap-shell { width: min(calc(100% - 44px), 1040px); margin: 0 auto; display: grid; gap: 34px; }
    .sitemap-hero { display: grid; gap: 16px; max-width: 760px; }
    .sitemap-hero h1 { font-size: clamp(3rem, 8vw, 6.6rem); line-height: 0.92; letter-spacing: 0; }
    .sitemap-hero p { color: var(--ink-soft); font-size: 1.16rem; line-height: 1.58; max-width: 64ch; }
    .sitemap-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
    .sitemap-section { border-top: 1.5px solid var(--line-strong); padding-top: 20px; display: grid; gap: 14px; }
    .sitemap-section h2 { font-size: 1.85rem; }
    .sitemap-list { display: grid; gap: 10px; list-style: none; padding: 0; }
    .sitemap-list a { display: inline-flex; color: var(--ink); font-weight: 800; text-decoration-thickness: 2px; text-underline-offset: 4px; }
    .sitemap-meta { color: var(--sandstone); font-size: 0.78rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; }
    @media (max-width: 760px) { .sitemap-grid { grid-template-columns: 1fr; } .sitemap-page { padding-top: 42px; } }
  </style>
  <script>
  (function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='dark'?'#1a1917':'#2c2a26'})();
  </script>
</head>
<body>
  <a class="skip-link" href="#sitemap">Skip to sitemap</a>
  <nav class="site-nav nav-solid" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="majestic-travels-blog.html" class="nav-brand">
        <img src="public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="nav-logo">
        <span class="nav-brand-name">Majestic Travels</span>
      </a>
      <ul class="nav-menu" role="list">
        <li><a href="majestic-travels-blog.html#stories">Stories</a></li>
        <li><a href="majestic-travels-blog.html#destinations">Destinations</a></li>
        <li><a href="majestic-travels-blog.html#about">About</a></li>
      </ul>
      <div class="nav-actions">
        <button class="theme-toggle" aria-label="Toggle dark mode" onclick="toggleTheme()">
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
        </button>
      </div>
    </div>
  </nav>
  <main class="sitemap-page" id="sitemap">
    <div class="sitemap-shell">
      <header class="sitemap-hero">
        <span class="kicker">Site index</span>
        <h1>Sitemap</h1>
        <p>A simple index of every public Majestic Travels page, story, destination cluster, and feed.</p>
      </header>
      <div class="sitemap-grid">
        <section class="sitemap-section" aria-labelledby="core-pages-heading">
          <h2 id="core-pages-heading">Pages</h2>
          <ul class="sitemap-list">
            <li><a href="majestic-travels-blog.html">Home</a></li>
            <li><a href="majestic-travels-blog.html#stories">Stories</a></li>
            <li><a href="majestic-travels-blog.html#destinations">Destinations</a></li>
            <li><a href="majestic-travels-blog.html#about">About</a></li>
            <li><a href="rss.xml">RSS feed</a></li>
            <li><a href="sitemap.xml">XML sitemap</a></li>
          </ul>
        </section>
        <section class="sitemap-section" aria-labelledby="stories-heading">
          <h2 id="stories-heading">Stories</h2>
          <ul class="sitemap-list">
${posts.map((post) => `            <li><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a><span class="sitemap-meta">${escapeHtml(post.categoryLabel)} &middot; ${escapeHtml(dateLabel(post.date))}</span></li>`).join("\n")}
          </ul>
        </section>
${groups.map(([destination, entries]) => `        <section class="sitemap-section" aria-labelledby="${escapeHtml(destination)}-heading">
          <h2 id="${escapeHtml(destination)}-heading">${escapeHtml(destination.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))}</h2>
          <ul class="sitemap-list">
${entries.map((post) => `            <li><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a></li>`).join("\n")}
          </ul>
        </section>`).join("\n")}
      </div>
    </div>
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <img src="public/logo_cleanedup_centered_transparant-01.png" alt="Majestic Travels logo" class="footer-logo">
        <span class="footer-name">Majestic Travels</span>
        <p class="footer-tagline">Solo travel. Real places. No filters.</p>
      </div>
      <div class="footer-right">
        <ul class="footer-links">
          <li><a href="majestic-travels-blog.html#stories">Stories</a></li>
          <li><a href="majestic-travels-blog.html#destinations">Destinations</a></li>
          <li><a href="majestic-travels-blog.html#about">About</a></li>
          <li><a href="rss.xml">RSS</a></li>
          <li><a href="sitemap.html">Sitemap</a></li>
        </ul>
        <p class="footer-copy">&copy; 2026 Majestic Travels</p>
      </div>
    </div>
  </footer>
  <script>
    window.toggleTheme = function() {
      var html = document.documentElement;
      var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = next === 'dark' ? '#1a1917' : '#2c2a26';
    };
  </script>
</body>
</html>`;
}

function writeLaunchFiles(posts) {
  const buildDate = todayIsoDate();
  const lastBuildDate = posts[0] ? rssDate(posts[0].date) : new Date().toUTCString();
  const urls = [
    { loc: `${SITE_URL}/`, lastmod: buildDate, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE_URL}/sitemap.html`, lastmod: buildDate, changefreq: "monthly", priority: "0.4" },
    ...posts.map((post) => ({
      loc: sitemapUrl(`blog/${post.slug}.html`),
      lastmod: sitemapLastmod(post.date, buildDate),
      changefreq: "monthly",
      priority: "0.8",
      image: {
        loc: sitemapUrl(post.image),
        title: post.title,
        caption: post.imageAlt
      }
    }))
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((item) => `  <url>
    <loc>${escapeHtml(item.loc)}</loc>${item.lastmod ? `\n    <lastmod>${escapeHtml(item.lastmod)}</lastmod>` : ""}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>${item.image ? `
    <image:image>
      <image:loc>${escapeHtml(item.image.loc)}</image:loc>
      <image:title>${escapeHtml(item.image.title)}</image:title>
      <image:caption>${escapeHtml(item.image.caption)}</image:caption>
    </image:image>` : ""}
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
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
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
  const klaviyo = getKlaviyoConfig(home);
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  posts.forEach((post, index) => {
    write(path.join(BLOG_DIR, `${post.slug}.html`), articleHtml(post, css, { index, posts, klaviyo }));
  });
  write(HOME_FILE, updateKlaviyoConfig(updateHomeSchema(updateFeatured(updateHome(home, posts), posts), posts), klaviyo));
  write(HTML_SITEMAP_FILE, sitemapPageHtml(posts, css));
  writeLaunchFiles(posts);

  console.log(`Built ${posts.length} posts.`);
  console.log(`Updated ${path.basename(HOME_FILE)}, blog/*.html, sitemap.html, sitemap.xml, robots.txt, and rss.xml.`);
}

main();

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");
const LOG_FILE = path.join(ROOT, ".writer-server.log");
const PORT = Number(process.env.PORT || 8792);
const HOST = "127.0.0.1";

function logLine(message) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`, "utf8");
}

process.on("uncaughtException", (error) => {
  logLine(error.stack || error.message);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  logLine(error && error.stack ? error.stack : String(error));
  process.exit(1);
});

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

function cleanLine(value = "") {
  return String(value).replace(/\r?\n/g, " ").trim();
}

function yamlString(value = "") {
  return `"${cleanLine(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Request body must be JSON."));
      }
    });
    request.on("error", reject);
  });
}

function send(response, status, body, type = "application/json") {
  response.writeHead(status, {
    "Content-Type": `${type}; charset=utf-8`,
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function sendJson(response, status, data) {
  send(response, status, JSON.stringify(data, null, 2));
}

function uniquePostPath(slug) {
  let candidate = slug;
  let count = 2;

  while (fs.existsSync(path.join(POSTS_DIR, `${candidate}.md`))) {
    candidate = `${slug}-${count}`;
    count += 1;
  }

  return { slug: candidate, filePath: path.join(POSTS_DIR, `${candidate}.md`) };
}

function resolvePostFile(fileName = "") {
  const cleanName = path.basename(String(fileName));
  if (!cleanName || cleanName !== fileName || !cleanName.endsWith(".md")) {
    throw new Error("Choose a valid Markdown post file.");
  }

  const resolved = path.resolve(POSTS_DIR, cleanName);
  const postsRoot = path.resolve(POSTS_DIR);
  if (!resolved.startsWith(`${postsRoot}${path.sep}`)) {
    throw new Error("Post file must stay inside posts/.");
  }

  if (!fs.existsSync(resolved)) {
    throw new Error(`Could not find ${cleanName}.`);
  }

  return resolved;
}

function markdownFromPayload(payload) {
  const title = cleanLine(payload.title);
  if (!title) throw new Error("Give the draft a title first.");

  const date = cleanLine(payload.date || todayIso());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  const body = String(payload.body || "").trim() || `Start with the specific moment: where you were, what you noticed, and why this trip stayed with you.

## What Happened

Write the story in plain language.

## What I Would Tell A Friend

Turn the experience into useful advice.

## Practical Notes

- Where:
- When:
- Good for:
- Skip if:
- Bring:
`;

  return `---
title: ${yamlString(title)}
date: ${yamlString(date)}
category: ${yamlString(payload.category || "Field note")}
tags: ${yamlString(payload.tags || "Slow travel")}
readTime: ${yamlString(payload.readTime || "5 min")}
excerpt: ${yamlString(payload.excerpt || "A fresh Majestic Travels field note from the road.")}
brief: ${yamlString(payload.brief || "What happened, what it changed, and what a reader can borrow for their own trip.")}
image: ${yamlString(payload.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=85")}
imageAlt: ${yamlString(payload.imageAlt || "Travel scene connected to the story")}
keywords: ${yamlString(payload.keywords || `${title}, travel blog, slow travel`)}
---

${body}
`;
}

function parsePostSource(source) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return { meta: {}, body: source.trim() };

  const meta = frontmatter[1].split(/\r?\n/).reduce((result, line) => {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) return result;
    result[pair[1]] = pair[2].trim().replace(/^["']|["']$/g, "");
    return result;
  }, {});

  return {
    meta,
    body: source.slice(frontmatter[0].length).trim()
  };
}

function parseFrontmatter(source) {
  return parsePostSource(source).meta;
}

function readPost(fileName) {
  const filePath = resolvePostFile(fileName);
  const source = fs.readFileSync(filePath, "utf8");
  const { meta, body } = parsePostSource(source);
  return {
    file: path.basename(filePath),
    title: meta.title || path.basename(filePath, ".md"),
    date: meta.date || todayIso(),
    category: meta.category || "Field note",
    tags: meta.tags || "",
    readTime: meta.readTime || "5 min",
    excerpt: meta.excerpt || "",
    brief: meta.brief || "",
    image: meta.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=85",
    imageAlt: meta.imageAlt || "Travel scene connected to the story",
    keywords: meta.keywords || "",
    body
  };
}

function listPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  return fs.readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const filePath = path.join(POSTS_DIR, file);
      const meta = parseFrontmatter(fs.readFileSync(filePath, "utf8"));
      return {
        file,
        title: meta.title || path.basename(file, ".md"),
        date: meta.date || "",
        category: meta.category || "Post",
        excerpt: meta.excerpt || "",
        readTime: meta.readTime || ""
      };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function runScript(scriptName) {
  return new Promise((resolve) => {
    execFile(process.execPath, [path.join(__dirname, scriptName)], { cwd: ROOT }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error && typeof error.code === "number" ? error.code : 0,
        output: [stdout, stderr].filter(Boolean).join("\n").trim()
      });
    });
  });
}

function writerHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Majestic Travels Writer Desk</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..800,50..100,0..1&family=Source+Sans+3:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    * { margin: 0; }
    :root {
      --ink: #18201c;
      --ink-soft: #314039;
      --paper: #f6ecdc;
      --paper-deep: #ead6bc;
      --white: #fff8ec;
      --sage: #526f62;
      --sage-deep: #263f36;
      --rust: #a5482d;
      --marigold: #d9a63f;
      --atlantic: #176c7c;
      --passport: #213d72;
      --line: rgba(24, 32, 28, 0.18);
      --line-strong: rgba(24, 32, 28, 0.46);
      --shadow: 12px 12px 0 rgba(24, 32, 28, 0.08);
      --font-display: "Fraunces", Georgia, serif;
      --font-body: "Source Sans 3", "Segoe UI", sans-serif;
    }
    body {
      min-height: 100vh;
      color: var(--ink);
      background:
        linear-gradient(rgba(24, 32, 28, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(24, 32, 28, 0.035) 1px, transparent 1px),
        radial-gradient(circle at 10% 20%, rgba(217, 166, 63, 0.18), transparent 28%),
        var(--paper);
      background-size: 24px 24px, 24px 24px, auto, auto;
      font-family: var(--font-body);
    }
    button, input, textarea, select { font: inherit; }
    a { color: inherit; }
    .wrap { width: min(calc(100% - 36px), 1320px); margin: 0 auto; }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 5;
      border-bottom: 1px solid var(--line);
      background: rgba(246, 236, 220, 0.92);
      backdrop-filter: blur(14px);
    }
    .nav { min-height: 74px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .brand { display: inline-flex; align-items: center; gap: 12px; text-decoration: none; font-weight: 900; }
    .brand-mark { width: 38px; height: 38px; display: grid; place-items: center; background: var(--ink); color: var(--marigold); font-family: var(--font-display); font-weight: 800; }
    .nav-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .button {
      min-height: 44px;
      border: 1.5px solid var(--ink);
      border-radius: 3px;
      background: var(--ink);
      color: var(--white);
      padding: 0 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: 900;
      cursor: pointer;
      text-decoration: none;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }
    .button:hover, .button:focus-visible { transform: translateY(-2px); box-shadow: 5px 5px 0 rgba(24, 32, 28, 0.12); }
    .button.secondary { background: transparent; color: var(--ink); }
    .button.rust { background: var(--rust); border-color: var(--rust); }
    .button.small { min-height: 36px; padding: 0 10px; font-size: 0.88rem; }
    .button:disabled { opacity: 0.52; cursor: not-allowed; transform: none; box-shadow: none; }
    main { padding: clamp(30px, 5vw, 70px) 0 70px; }
    .hero { display: grid; grid-template-columns: minmax(0, 0.75fr) minmax(260px, 0.25fr); gap: clamp(22px, 5vw, 58px); align-items: end; margin-bottom: 34px; }
    .kicker { color: var(--rust); text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.78rem; font-weight: 900; }
    h1 { max-width: 12ch; margin-top: 10px; font-family: var(--font-display); font-size: clamp(3.1rem, 9vw, 7.4rem); line-height: 0.9; letter-spacing: 0; }
    .hero p { max-width: 62ch; margin-top: 18px; color: var(--ink-soft); font-size: 1.14rem; line-height: 1.58; }
    .stamp {
      border: 1.5px dashed var(--line-strong);
      background: rgba(255, 248, 236, 0.72);
      padding: 18px;
      box-shadow: var(--shadow);
      transform: rotate(1deg);
    }
    .stamp strong { display: block; font-family: var(--font-display); font-size: 2rem; line-height: 1; }
    .stamp span { display: block; margin-top: 8px; color: var(--rust); font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem; }
    .desk { display: grid; grid-template-columns: minmax(0, 0.62fr) minmax(320px, 0.38fr); gap: 22px; align-items: start; }
    .sheet, .preview, .rail-section {
      border: 1.5px solid var(--line);
      border-radius: 3px;
      background: rgba(255, 248, 236, 0.76);
      box-shadow: 8px 8px 0 rgba(24, 32, 28, 0.06);
    }
    .sheet { padding: clamp(18px, 3vw, 28px); }
    .section-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .section-title span { text-align: right; }
    h2 { font-family: var(--font-display); font-size: 1.7rem; line-height: 1.05; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .field { display: grid; gap: 6px; }
    .field.full { grid-column: 1 / -1; }
    label { font-size: 0.76rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.11em; color: var(--ink-soft); }
    input, select, textarea {
      width: 100%;
      border: 1.5px solid var(--line);
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.38);
      color: var(--ink);
      padding: 11px 12px;
      outline: none;
    }
    textarea { min-height: 360px; resize: vertical; line-height: 1.5; }
    input:focus, select:focus, textarea:focus { border-color: var(--passport); box-shadow: 0 0 0 3px rgba(33, 61, 114, 0.14); }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
    .rail { display: grid; gap: 18px; }
    .preview { overflow: hidden; }
    .preview-media { aspect-ratio: 16 / 10; background: var(--sage-deep); position: relative; }
    .preview-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .preview-media span { position: absolute; left: 14px; bottom: 14px; background: var(--ink); color: var(--white); padding: 5px 9px; font-size: 0.78rem; font-weight: 900; }
    .preview-body { padding: 18px; display: grid; gap: 10px; }
    .preview-meta { display: flex; gap: 8px; flex-wrap: wrap; color: var(--rust); font-weight: 900; text-transform: uppercase; font-size: 0.72rem; }
    .preview h3 { font-family: var(--font-display); font-size: 2rem; line-height: 1.02; }
    .preview p { color: var(--ink-soft); line-height: 1.5; }
    .rail-section { padding: 18px; }
    .status { min-height: 58px; border: 1.5px dashed var(--line-strong); background: rgba(234, 214, 188, 0.45); padding: 12px; font-weight: 800; line-height: 1.35; }
    .status.good { border-color: rgba(23, 108, 124, 0.5); color: var(--atlantic); }
    .status.bad { border-color: rgba(165, 72, 45, 0.55); color: var(--rust); }
    .post-list { display: grid; gap: 10px; margin-top: 14px; }
    .post-item { border-top: 1px solid var(--line); padding-top: 10px; display: grid; gap: 8px; }
    .post-item header { display: grid; gap: 3px; }
    .post-item strong { font-family: var(--font-display); line-height: 1.08; }
    .post-item span { color: var(--ink-soft); font-size: 0.9rem; }
    .markdown-box { margin-top: 16px; display: grid; gap: 8px; }
    pre {
      max-height: 280px;
      overflow: auto;
      border: 1.5px solid var(--line);
      background: rgba(24, 32, 28, 0.92);
      color: var(--white);
      padding: 14px;
      white-space: pre-wrap;
      font-size: 0.9rem;
      line-height: 1.45;
    }
    @media (max-width: 960px) {
      .hero, .desk { grid-template-columns: 1fr; }
      .stamp { transform: none; }
    }
    @media (max-width: 680px) {
      .wrap { width: min(calc(100% - 24px), 1320px); }
      .nav { align-items: flex-start; flex-direction: column; padding: 14px 0; }
      .nav-actions, .actions { width: 100%; }
      .button { flex: 1 1 auto; }
      .grid { grid-template-columns: 1fr; }
      textarea { min-height: 310px; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <nav class="nav wrap" aria-label="Writer desk navigation">
      <a class="brand" href="/" aria-label="Majestic Travels writer desk">
        <span class="brand-mark" aria-hidden="true">M</span>
        <span>Majestic Travels Writer Desk</span>
      </a>
      <div class="nav-actions">
        <button class="button secondary" type="button" id="buildSite">Build site</button>
        <button class="button" type="button" id="checkSite">Check blog</button>
      </div>
    </nav>
  </header>
  <main class="wrap">
    <section class="hero" aria-labelledby="desk-title">
      <div>
        <span class="kicker">Local publishing desk</span>
        <h1 id="desk-title">Draft the next field note.</h1>
        <p>Shape the story, save it into the Markdown archive, then rebuild the blog from the same source files that power the public site.</p>
      </div>
      <aside class="stamp" aria-label="Current workflow">
        <strong>Posts first</strong>
        <span>Markdown archive</span>
      </aside>
    </section>

    <section class="desk" aria-label="Post drafting workspace">
      <form class="sheet" id="postForm">
        <div class="section-title">
          <div>
            <h2 id="formTitle">Post Draft</h2>
            <span class="kicker" id="modeLabel">New draft</span>
          </div>
          <span class="kicker" id="slugPreview">untitled-post.md</span>
        </div>
        <div class="grid">
          <div class="field full">
            <label for="title">Title</label>
            <input id="title" name="title" placeholder="Fuerteventura Before The First Wave" autocomplete="off" required>
          </div>
          <div class="field">
            <label for="date">Date</label>
            <input id="date" name="date" type="date" required>
          </div>
          <div class="field">
            <label for="category">Category</label>
            <select id="category" name="category">
              <option>Field note</option>
              <option>Essay</option>
              <option>Guide</option>
              <option>Solo travel</option>
            </select>
          </div>
          <div class="field">
            <label for="tags">Tags</label>
            <input id="tags" name="tags" placeholder="Solo travel, Fuerteventura">
          </div>
          <div class="field">
            <label for="readTime">Reading time</label>
            <input id="readTime" name="readTime" placeholder="6 min">
          </div>
          <div class="field full">
            <label for="excerpt">Excerpt</label>
            <input id="excerpt" name="excerpt" placeholder="One sentence for the homepage card.">
          </div>
          <div class="field full">
            <label for="brief">Story brief</label>
            <input id="brief" name="brief" placeholder="The promise readers see when they open the card brief.">
          </div>
          <div class="field full">
            <label for="image">Image URL</label>
            <input id="image" name="image" placeholder="https://images.unsplash.com/...">
          </div>
          <div class="field full">
            <label for="imageAlt">Image alt text</label>
            <input id="imageAlt" name="imageAlt" placeholder="Describe the scene clearly.">
          </div>
          <div class="field full">
            <label for="keywords">Search keywords</label>
            <input id="keywords" name="keywords" placeholder="fuerteventura surf solo travel field note">
          </div>
          <div class="field full">
            <label for="body">Article body</label>
            <textarea id="body" name="body"></textarea>
          </div>
        </div>
        <div class="actions">
          <button class="button rust" type="submit" id="saveDraft">Save draft</button>
          <button class="button secondary" type="button" id="copyMarkdown">Copy Markdown</button>
          <button class="button secondary" type="button" id="resetForm">New draft</button>
        </div>
      </form>

      <aside class="rail" aria-label="Preview and publishing status">
        <article class="preview" aria-label="Homepage card preview">
          <div class="preview-media">
            <img id="previewImage" alt="">
            <span id="previewDate"></span>
          </div>
          <div class="preview-body">
            <div class="preview-meta">
              <span id="previewCategory"></span>
              <span id="previewReadTime"></span>
            </div>
            <h3 id="previewTitle"></h3>
            <p id="previewExcerpt"></p>
          </div>
        </article>

        <section class="rail-section" aria-labelledby="status-title">
          <div class="section-title">
            <h2 id="status-title">Publish Rail</h2>
          </div>
          <div class="status" id="status">Ready for a new draft.</div>
          <div class="markdown-box">
            <label for="markdownPreview">Generated Markdown</label>
            <pre id="markdownPreview"></pre>
          </div>
        </section>

        <section class="rail-section" aria-labelledby="archive-title">
          <div class="section-title">
            <h2 id="archive-title">Archive</h2>
            <span class="kicker" id="postCount">0 posts</span>
          </div>
          <div class="post-list" id="postList"></div>
        </section>
      </aside>
    </section>
  </main>

  <script>
    const form = document.getElementById("postForm");
    const statusBox = document.getElementById("status");
    const postList = document.getElementById("postList");
    const postCount = document.getElementById("postCount");
    const markdownPreview = document.getElementById("markdownPreview");
    const saveButton = document.getElementById("saveDraft");
    const formTitle = document.getElementById("formTitle");
    const modeLabel = document.getElementById("modeLabel");
    const slugPreview = document.getElementById("slugPreview");
    const defaultImage = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=85";
    const fields = ["title", "date", "category", "tags", "readTime", "excerpt", "brief", "image", "imageAlt", "keywords", "body"];
    let editingFile = "";

    function todayIso() {
      const date = new Date();
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return localDate.toISOString().slice(0, 10);
    }

    function slugify(value) {
      return String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "untitled-post";
    }

    function cleanLine(value) {
      return String(value || "").replace(/\\r?\\n/g, " ").trim();
    }

    function yamlString(value) {
      return '"' + cleanLine(value).replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"') + '"';
    }

    function values() {
      return fields.reduce((data, field) => {
        data[field] = document.getElementById(field).value;
        return data;
      }, {});
    }

    function setMode(fileName) {
      editingFile = fileName || "";
      formTitle.textContent = editingFile ? "Edit Post" : "Post Draft";
      modeLabel.textContent = editingFile ? "Editing archive file" : "New draft";
      saveButton.textContent = editingFile ? "Save changes" : "Save draft";
      renderPreview();
    }

    function setSelectValue(select, value) {
      const existing = Array.from(select.options).some((option) => option.value === value);
      if (value && !existing) {
        select.add(new Option(value, value));
      }
      select.value = value || "Field note";
    }

    function fillForm(post) {
      fields.forEach((field) => {
        const input = document.getElementById(field);
        if (!input) return;
        if (field === "category") {
          setSelectValue(input, post[field] || "Field note");
        } else {
          input.value = post[field] || "";
        }
      });
      setMode(post.file || "");
    }

    function generatedMarkdown(data) {
      const title = data.title || "Untitled Post";
      const body = data.body || "Start with the specific moment: where you were, what you noticed, and why this trip stayed with you.\\n\\n## What Happened\\n\\nWrite the story in plain language.\\n\\n## What I Would Tell A Friend\\n\\nTurn the experience into useful advice.\\n\\n## Practical Notes\\n\\n- Where:\\n- When:\\n- Good for:\\n- Skip if:\\n- Bring:";
      return [
        "---",
        "title: " + yamlString(title),
        "date: " + yamlString(data.date || todayIso()),
        "category: " + yamlString(data.category || "Field note"),
        "tags: " + yamlString(data.tags || "Slow travel"),
        "readTime: " + yamlString(data.readTime || "5 min"),
        "excerpt: " + yamlString(data.excerpt || "A fresh Majestic Travels field note from the road."),
        "brief: " + yamlString(data.brief || "What happened, what it changed, and what a reader can borrow for their own trip."),
        "image: " + yamlString(data.image || defaultImage),
        "imageAlt: " + yamlString(data.imageAlt || "Travel scene connected to the story"),
        "keywords: " + yamlString(data.keywords || title + ", travel blog, slow travel"),
        "---",
        "",
        body.trim(),
        ""
      ].join("\\n");
    }

    function setStatus(message, kind) {
      statusBox.textContent = message;
      statusBox.className = "status" + (kind ? " " + kind : "");
    }

    function renderPreview() {
      const data = values();
      const title = data.title || "Untitled field note";
      slugPreview.textContent = editingFile || slugify(title) + ".md";
      document.getElementById("previewTitle").textContent = title;
      document.getElementById("previewExcerpt").textContent = data.excerpt || "A fresh Majestic Travels field note from the road.";
      document.getElementById("previewCategory").textContent = data.category || "Field note";
      document.getElementById("previewReadTime").textContent = data.readTime || "5 min";
      document.getElementById("previewDate").textContent = data.date || todayIso();
      const image = document.getElementById("previewImage");
      image.src = data.image || defaultImage;
      image.alt = data.imageAlt || "Travel scene connected to the story";
      markdownPreview.textContent = generatedMarkdown(data);
    }

    async function requestJson(url, payload) {
      const response = await fetch(url, {
        method: payload ? "POST" : "GET",
        headers: payload ? { "Content-Type": "application/json" } : {},
        body: payload ? JSON.stringify(payload) : undefined
      });
      const data = await response.json();
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || data.output || "Request failed.");
      }
      return data;
    }

    async function loadPosts() {
      try {
        const data = await requestJson("/api/posts");
        postCount.textContent = data.posts.length + (data.posts.length === 1 ? " post" : " posts");
        postList.innerHTML = data.posts.map((post) => (
          '<article class="post-item">' +
            '<header>' +
              '<strong>' + escapeHtml(post.title) + '</strong>' +
              '<span>' + escapeHtml([post.date, post.category, post.readTime].filter(Boolean).join(" / ")) + '</span>' +
            '</header>' +
            '<button class="button secondary small edit-post" type="button" data-file="' + escapeHtml(post.file) + '">Edit post</button>' +
          '</article>'
        )).join("") || '<p>No posts yet.</p>';
      } catch (error) {
        setStatus(error.message, "bad");
      }
    }

    async function loadPost(fileName) {
      setStatus("Loading " + fileName + "...", "");
      try {
        const data = await requestJson("/api/post?file=" + encodeURIComponent(fileName));
        fillForm(data.post);
        setStatus("Editing " + data.post.file + ". Save changes keeps this same Markdown file.", "good");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        setStatus(error.message, "bad");
      }
    }

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    form.addEventListener("input", renderPreview);

    postList.addEventListener("click", (event) => {
      const button = event.target.closest(".edit-post");
      if (!button) return;
      loadPost(button.dataset.file);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(editingFile ? "Saving changes..." : "Saving draft...", "");
      try {
        const endpoint = editingFile ? "/api/post" : "/api/draft";
        const payload = editingFile ? { ...values(), file: editingFile } : values();
        const data = await requestJson(endpoint, payload);
        setStatus("Saved " + data.file + ". Run Build site when the draft is ready for the public pages.", "good");
        await loadPosts();
      } catch (error) {
        setStatus(error.message, "bad");
      }
    });

    document.getElementById("buildSite").addEventListener("click", async () => {
      setStatus("Building public blog files...", "");
      try {
        const data = await requestJson("/api/build", {});
        setStatus(data.output || "Build finished.", "good");
        await loadPosts();
      } catch (error) {
        setStatus(error.message, "bad");
      }
    });

    document.getElementById("checkSite").addEventListener("click", async () => {
      setStatus("Checking blog...", "");
      try {
        const data = await requestJson("/api/check", {});
        setStatus(data.output || "Blog check passed.", "good");
      } catch (error) {
        setStatus(error.message, "bad");
      }
    });

    document.getElementById("copyMarkdown").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(markdownPreview.textContent);
        setStatus("Markdown is on the clipboard.", "good");
      } catch (error) {
        setStatus("Clipboard is blocked in this browser. The generated Markdown is still visible below.", "bad");
      }
    });

    document.getElementById("resetForm").addEventListener("click", () => {
      form.reset();
      document.getElementById("date").value = todayIso();
      document.getElementById("category").value = "Field note";
      document.getElementById("readTime").value = "5 min";
      document.getElementById("image").value = defaultImage;
      document.getElementById("body").value = "Start with the specific moment: where you were, what you noticed, and why this trip stayed with you.\\n\\n## What Happened\\n\\nWrite the story in plain language.\\n\\n## What I Would Tell A Friend\\n\\nTurn the experience into useful advice.\\n\\n## Practical Notes\\n\\n- Where:\\n- When:\\n- Good for:\\n- Skip if:\\n- Bring:";
      setMode("");
      setStatus("Ready for a new draft.", "");
    });

    document.getElementById("resetForm").click();
    loadPosts();
  </script>
</body>
</html>`;
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${HOST}:${PORT}`);

  try {
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/writer")) {
      send(response, 200, writerHtml(), "text/html");
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/posts") {
      sendJson(response, 200, { ok: true, posts: listPosts() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/post") {
      sendJson(response, 200, { ok: true, post: readPost(url.searchParams.get("file") || "") });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/draft") {
      const payload = await readJson(request);
      const markdown = markdownFromPayload(payload);
      const { slug, filePath } = uniquePostPath(slugify(payload.title));
      fs.mkdirSync(POSTS_DIR, { recursive: true });
      fs.writeFileSync(filePath, markdown, "utf8");
      sendJson(response, 200, {
        ok: true,
        slug,
        file: path.relative(ROOT, filePath).replace(/\\/g, "/"),
        markdown
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/post") {
      const payload = await readJson(request);
      const filePath = resolvePostFile(payload.file || "");
      const markdown = markdownFromPayload(payload);
      fs.writeFileSync(filePath, markdown, "utf8");
      sendJson(response, 200, {
        ok: true,
        file: path.relative(ROOT, filePath).replace(/\\/g, "/"),
        markdown
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/build") {
      const result = await runScript("build-blog.js");
      sendJson(response, result.ok ? 200 : 500, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/check") {
      const result = await runScript("check-blog.js");
      sendJson(response, result.ok ? 200 : 500, result);
      return;
    }

    sendJson(response, 404, { ok: false, error: "Not found." });
  } catch (error) {
    sendJson(response, 400, { ok: false, error: error.message });
  }
}

const server = http.createServer(handleRequest);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    logLine(`Port ${PORT} is already in use. Start with PORT=8793 npm run writer to use another port.`);
  } else {
    logLine(error.stack || error.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  logLine(`Majestic Travels writer desk: http://${HOST}:${PORT}/`);
});

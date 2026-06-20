# Majestic Travels — Setup & Workflow Guide

How this site was built, how it's deployed, and how to keep it running.

---

## Stack

| Layer | Tool | Cost |
|---|---|---|
| Source files | Your computer (`Majestic Travels/` folder) | Free |
| Version control | GitHub (`adrien501/majestic-travels-blog`) | Free |
| Build + hosting | Cloudflare Pages | Free (unlimited bandwidth) |
| Domain | majestic-travels.com (Namecheap) | ~$12/year |
| SSL | Automatic via Cloudflare | Free |

---

## Folder Structure

```
Majestic Travels/
│
├── posts/                  ← YOUR WRITING LIVES HERE
│   └── *.md                   Markdown files, one per post (YAML frontmatter + content)
│
├── blog/                   ← Generated HTML posts (DO NOT edit manually)
│   └── *.html                 Rebuilt by npm run build:blog
│
├── public/
│   ├── site/               ← Hero images and brand assets used in the site
│   ├── pics/               ← Your raw travel photos, organised by destination
│   ├── logo_cleanedup_centered_transparant-01.png
│   ├── plain_name.png
│   └── plain_name_crop.png
│
├── scripts/                ← Build system (DO NOT edit unless you know what you're doing)
│   ├── build-blog.js          Converts posts/*.md → blog/*.html + updates homepage
│   ├── check-blog.js          Validates HTML, SEO, links, alt text, RSS, sitemap
│   ├── new-post.js            Creates a new post with correct frontmatter
│   ├── prepare-publish.js     Packages everything into dist/ for deployment
│   └── writer-server.js       Local editor UI (optional, runs on port 8792)
│
├── dist/                   ← Built output (gitignored — regenerated on every build)
│
├── majestic-travels-blog.html  ← Homepage template (rebuilt by build-blog.js)
├── sitemap.xml             ← Auto-generated
├── rss.xml                 ← Auto-generated
├── robots.txt              ← Auto-generated
├── package.json
├── BLOGGING.md             ← Detailed writing workflow
└── SETUP.md                ← This file
```

---

## How Deployment Works

```
You write a post
      │
      ▼
git push → GitHub (adrien501/majestic-travels-blog)
      │
      ▼  Cloudflare Pages detects the push
      │  Runs: npm run prepare:publish
      │  Output: dist/
      ▼
majestic-travels.com goes live (~60 seconds)
```

Cloudflare Pages settings (set once, never touch again):
- **Build command:** `npm run prepare:publish`
- **Output directory:** `dist`
- **Branch:** `main`

Newsletter settings:
- Add `KLAVIYO_PUBLIC_API_KEY` in Cloudflare Pages environment variables. This is Klaviyo's public API key / site ID, not a private key.
- Add `KLAVIYO_LIST_ID` in Cloudflare Pages environment variables. This is the Klaviyo list new subscribers should join.
- Never put a Klaviyo private API key in static HTML or in GitHub.

Reader comments:
- Create a Cloudflare D1 database for comments.
- In Cloudflare Pages, add a D1 binding named `COMMENTS_DB` that points to that database.
- Optional but recommended: add an environment variable named `COMMENTS_ADMIN_TOKEN` with a long private token for moderation API calls.
- The `/api/comments` function creates its own `comments` table the first time it runs.
- New reader notes are saved as `pending`. List pending notes for a post with `GET /api/comments?post=POST_SLUG&status=pending` and the same bearer token.
- Approve notes by changing their `status` to `approved` in D1, or with an authenticated PATCH request:

```bash
curl -X PATCH "https://majestic-travels.com/api/comments" \
  -H "Authorization: Bearer YOUR_COMMENTS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"id\":\"COMMENT_ID\",\"status\":\"approved\"}"
```

---

## Adding a New Blog Post

```powershell
cd "C:\Users\Adrien\Desktop\Majestic Travels"

# 1. Create the post file
npm run new:post

# 2. Write your post in any text editor
#    File is created in posts/ with frontmatter pre-filled

# 3. Preview locally (optional)
npm run build:blog
# Open majestic-travels-blog.html in your browser

# 4. Publish
git add .
git commit -m "post: your post title here"
git push
# Live at majestic-travels.com/blog/your-post-slug in ~60 seconds
```

---

## DNS & Domain

- **Registrar:** Namecheap
- **DNS managed by:** Cloudflare (nameservers: `cass.ns.cloudflare.com`, `jeff.ns.cloudflare.com`)
- **Email (ProtonMail):** MX and DKIM records are in Cloudflare DNS — do not delete them

If you ever need to add a DNS record (e.g. for a new email tool), do it in the **Cloudflare dashboard** at dash.cloudflare.com — not in Namecheap, since Cloudflare is now the DNS authority.

---

## Cloudflare Pages Dashboard

→ dash.cloudflare.com → Pages → majestic-travels-blog

From here you can:
- See deploy history and logs
- Trigger a manual redeploy
- Manage the custom domain
- View build errors if a push fails

---

## If a Build Fails

1. Check the Cloudflare Pages deploy log (dashboard → your project → latest deployment)
2. Run `npm run prepare:publish` locally — it will show the same error
3. Fix the issue in your local files
4. `git push` again — Cloudflare will retry automatically

---

## Local Build Commands

| Command | What it does |
|---|---|
| `npm run new:post` | Creates a new post with frontmatter |
| `npm run build:blog` | Rebuilds HTML from Markdown |
| `npm run check:blog` | Validates posts, links, SEO, RSS |
| `npm run prepare:publish` | Full build + validation + packages dist/ |
| `npm run writer` | Opens local editor UI at http://localhost:8792 |

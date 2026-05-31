# Majestic Travels Launch Checklist

## Before Uploading

Run:

```bash
npm run prepare:publish
```

This rebuilds the blog, runs the checker, and creates `dist/`.

## Upload This

Upload the contents of `dist/` to your hosting root:

- `index.html`
- `majestic-travels-blog.html`
- `blog/`
- `public/site/`
- `sitemap.xml`
- `robots.txt`
- `rss.xml`

## Do Not Upload This

Do not upload the full backup folder. Keep these local:

- `posts/`
- `scripts/`
- `public/pics/`
- `.asset-previews/`
- Shopify screenshots, PDFs, ZIP backups, and DNG files
- writer server logs

## Domain

The default public URL is `https://majestic-travels.com`.

If you launch somewhere else, rebuild with:

```bash
$env:SITE_URL="https://your-domain.com"
npm run prepare:publish
```

## Final Checks

- Open the deployed homepage.
- Open one article under `/blog/`.
- Open `/rss.xml`.
- Open `/sitemap.xml`.
- Paste the homepage link into a social preview checker and confirm the Majestic Travels image appears.

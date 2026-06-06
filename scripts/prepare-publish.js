const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PUBLIC_SITE = path.join(ROOT, "public", "site");
const NEWSLETTER_WORKER = path.join(ROOT, "scripts", "newsletter-worker.js");
// Brand PNGs referenced directly in HTML (nav logo, hero wordmark, about photo placeholder)
const BRAND_PNGS = [
  "public/logo_cleanedup_centered_transparant-01.png",
  "public/plain_name_crop.png",
  "public/plain_name.png",
];

const files = [
  ["majestic-travels-blog.html", "index.html"],
  ["majestic-travels-blog.html", "majestic-travels-blog.html"],
  ["sitemap.html", "sitemap.html"],
  ["sitemap.xml", "sitemap.xml"],
  ["robots.txt", "robots.txt"],
  ["rss.xml", "rss.xml"]
];

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(from, to) {
  const source = path.join(ROOT, from);
  const target = path.join(DIST, to);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(source, target, skipExtensions) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath, skipExtensions);
    } else {
      if (skipExtensions && skipExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext))) continue;
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function main() {
  if (!fs.existsSync(PUBLIC_SITE)) {
    throw new Error("public/site is missing. Run Pass 9 asset optimization first.");
  }

  removeDir(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  files.forEach(([from, to]) => copyFile(from, to));
  copyDir(path.join(ROOT, "blog"), path.join(DIST, "blog"));
  copyDir(PUBLIC_SITE, path.join(DIST, "public", "site"));
  BRAND_PNGS.forEach((p) => copyFile(p, p));
  fs.copyFileSync(NEWSLETTER_WORKER, path.join(DIST, "_worker.js"));

  // Copy destination photos (skip raw camera files like .dng)
  const picsSource = path.join(ROOT, "public", "pics");
  if (fs.existsSync(picsSource)) {
    copyDir(picsSource, path.join(DIST, "public", "pics"), [".dng"]);
  }

  const outputFiles = walk(DIST);
  const totalBytes = outputFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);

  console.log(`Prepared ${path.relative(ROOT, DIST)} for upload.`);
  console.log(`Files: ${outputFiles.length}`);
  console.log(`Total size: ${formatBytes(totalBytes)}`);
  console.log("Upload the contents of dist/, not the whole backup folder.");
}

main();

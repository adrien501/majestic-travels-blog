const COMMENT_STATUSES = new Set(["pending", "approved", "spam", "deleted"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function cleanSingleLine(value = "", max = 120) {
  return String(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanBody(value = "", max = 1200) {
  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function isValidPostSlug(value) {
  return /^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$/.test(value);
}

function isValidEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function ensureSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_slug TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_email TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_comments_public
    ON comments (post_slug, status, created_at)
  `).run();
}

function getDb(env) {
  return env.COMMENTS_DB || env.DB || null;
}

function isAdmin(request, env) {
  const token = env.COMMENTS_ADMIN_TOKEN;
  if (!token) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

export async function onRequestGet({ request, env }) {
  const db = getDb(env);
  if (!db) {
    return json({
      comments: [],
      disabled: true,
      message: "Comments database is not configured yet."
    });
  }

  const url = new URL(request.url);
  const postSlug = cleanSingleLine(url.searchParams.get("post") || "", 120);
  if (!isValidPostSlug(postSlug)) {
    return json({ message: "Missing or invalid post." }, 400);
  }

  await ensureSchema(db);

  if (isAdmin(request, env)) {
    const status = cleanSingleLine(url.searchParams.get("status") || "approved", 20);
    if (!COMMENT_STATUSES.has(status)) {
      return json({ message: "Invalid comment status." }, 400);
    }

    const adminResult = await db.prepare(`
      SELECT id, post_slug AS postSlug, author_name AS authorName, author_email AS authorEmail,
             body, status, created_at AS createdAt, updated_at AS updatedAt
      FROM comments
      WHERE post_slug = ? AND status = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 100
    `).bind(postSlug, status).all();

    return json({ comments: adminResult.results || [] });
  }

  const result = await db.prepare(`
    SELECT id, author_name AS authorName, body, created_at AS createdAt
    FROM comments
    WHERE post_slug = ? AND status = 'approved'
    ORDER BY datetime(created_at) DESC
    LIMIT 50
  `).bind(postSlug).all();

  return json({ comments: result.results || [] });
}

export async function onRequestPost({ request, env }) {
  const db = getDb(env);
  if (!db) {
    return json({ message: "Comments are not configured yet." }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ message: "Could not read this note." }, 400);
  }

  const honeypot = cleanSingleLine(payload.website || "", 200);
  if (honeypot) {
    return json({ ok: true, queued: true });
  }

  const postSlug = cleanSingleLine(payload.postSlug || payload.post || "", 120);
  const name = cleanSingleLine(payload.name || "", 80);
  const email = cleanSingleLine(payload.email || "", 180);
  const body = cleanBody(payload.body || "", 1200);

  if (!isValidPostSlug(postSlug)) {
    return json({ message: "Missing or invalid post." }, 400);
  }

  if (name.length < 2) {
    return json({ message: "Add a name so I know who wrote the note." }, 400);
  }

  if (!isValidEmail(email)) {
    return json({ message: "That email address does not look right." }, 400);
  }

  if (body.length < 3) {
    return json({ message: "Write a slightly longer note." }, 400);
  }

  await ensureSchema(db);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  await db.prepare(`
    INSERT INTO comments (id, post_slug, author_name, author_email, body, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)
  `).bind(id, postSlug, name, email || null, body, createdAt, createdAt).run();

  return json({
    ok: true,
    published: true,
    comment: {
      id,
      authorName: name,
      body,
      createdAt
    }
  }, 201);
}

export async function onRequestPatch({ request, env }) {
  const db = getDb(env);
  if (!db) return json({ message: "Comments database is not configured yet." }, 503);
  if (!isAdmin(request, env)) return json({ message: "Not authorized." }, 401);

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ message: "Could not read moderation request." }, 400);
  }

  const id = cleanSingleLine(payload.id || "", 80);
  const status = cleanSingleLine(payload.status || "", 20);
  if (!id || !COMMENT_STATUSES.has(status)) {
    return json({ message: "Send a comment id and a valid status." }, 400);
  }

  await ensureSchema(db);

  await db.prepare(`
    UPDATE comments
    SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = ?
  `).bind(status, id).run();

  return json({ ok: true });
}

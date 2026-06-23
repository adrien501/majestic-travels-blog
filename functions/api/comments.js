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

function isValidCommentId(value) {
  return /^[a-z0-9-]{20,80}$/i.test(value);
}

async function hashDeleteToken(token) {
  const bytes = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function tryMigrate(db, statement) {
  try {
    await db.prepare(statement).run();
  } catch (error) {
    if (!/duplicate column name/i.test(String(error && error.message ? error.message : error))) {
      throw error;
    }
  }
}

async function ensureSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_slug TEXT NOT NULL,
      parent_id TEXT,
      author_name TEXT NOT NULL,
      author_email TEXT,
      author_location TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      delete_token_hash TEXT,
      deleted_by_author INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `).run();

  await tryMigrate(db, "ALTER TABLE comments ADD COLUMN parent_id TEXT");
  await tryMigrate(db, "ALTER TABLE comments ADD COLUMN author_location TEXT");
  await tryMigrate(db, "ALTER TABLE comments ADD COLUMN delete_token_hash TEXT");
  await tryMigrate(db, "ALTER TABLE comments ADD COLUMN deleted_by_author INTEGER NOT NULL DEFAULT 0");

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_comments_public
    ON comments (post_slug, status, created_at)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_comments_thread
    ON comments (post_slug, parent_id, status, created_at)
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
      SELECT id, post_slug AS postSlug, parent_id AS parentId,
             author_name AS authorName, author_email AS authorEmail, author_location AS authorLocation,
             body, status, deleted_by_author AS deletedByAuthor,
             created_at AS createdAt, updated_at AS updatedAt
      FROM comments
      WHERE post_slug = ? AND status = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 100
    `).bind(postSlug, status).all();

    return json({ comments: adminResult.results || [] });
  }

  const result = await db.prepare(`
    SELECT id, parent_id AS parentId, author_name AS authorName, author_location AS authorLocation,
           body, deleted_by_author AS deletedByAuthor, created_at AS createdAt
    FROM comments
    WHERE post_slug = ? AND status = 'approved'
    ORDER BY datetime(created_at) ASC
    LIMIT 100
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
  const parentId = cleanSingleLine(payload.parentId || payload.parent || "", 80);
  const name = cleanSingleLine(payload.name || "", 80);
  const email = cleanSingleLine(payload.email || "", 180);
  const location = cleanSingleLine(payload.location || payload.authorLocation || "", 80);
  const body = cleanBody(payload.body || "", 1200);

  if (!isValidPostSlug(postSlug)) {
    return json({ message: "Missing or invalid post." }, 400);
  }

  if (parentId && !isValidCommentId(parentId)) {
    return json({ message: "That reply target is not valid." }, 400);
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

  if (parentId) {
    const parent = await db.prepare(`
      SELECT id, parent_id AS parentId
      FROM comments
      WHERE id = ? AND post_slug = ? AND status = 'approved'
      LIMIT 1
    `).bind(parentId, postSlug).first();

    if (!parent) {
      return json({ message: "That note is no longer available to reply to." }, 400);
    }

    if (parent.parentId) {
      return json({ message: "Replies can only go one level deep." }, 400);
    }
  }

  const id = crypto.randomUUID();
  const deleteToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const deleteTokenHash = await hashDeleteToken(deleteToken);
  const createdAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  await db.prepare(`
    INSERT INTO comments (
      id, post_slug, parent_id, author_name, author_email, author_location,
      body, status, delete_token_hash, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?)
  `).bind(id, postSlug, parentId || null, name, email || null, location || null, body, deleteTokenHash, createdAt, createdAt).run();

  return json({
    ok: true,
    published: true,
    comment: {
      id,
      parentId: parentId || null,
      authorName: name,
      authorLocation: location || null,
      body,
      createdAt,
      deleteToken,
      deletedByAuthor: false
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

export async function onRequestDelete({ request, env }) {
  const db = getDb(env);
  if (!db) return json({ message: "Comments database is not configured yet." }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ message: "Could not read delete request." }, 400);
  }

  const id = cleanSingleLine(payload.id || "", 80);
  const postSlug = cleanSingleLine(payload.postSlug || payload.post || "", 120);
  if (!isValidCommentId(id) || !isValidPostSlug(postSlug)) {
    return json({ message: "Send a valid note id and post." }, 400);
  }

  await ensureSchema(db);

  let comment;
  if (isAdmin(request, env)) {
    comment = await db.prepare(`
      SELECT id, parent_id AS parentId
      FROM comments
      WHERE id = ? AND post_slug = ? AND status = 'approved'
      LIMIT 1
    `).bind(id, postSlug).first();
  } else {
    const deleteToken = cleanSingleLine(payload.deleteToken || "", 200);
    if (deleteToken.length < 40) {
      return json({ message: "This browser cannot delete that note." }, 401);
    }

    const deleteTokenHash = await hashDeleteToken(deleteToken);
    comment = await db.prepare(`
      SELECT id, parent_id AS parentId
      FROM comments
      WHERE id = ? AND post_slug = ? AND status = 'approved' AND delete_token_hash = ?
      LIMIT 1
    `).bind(id, postSlug, deleteTokenHash).first();
  }

  if (!comment) {
    return json({ message: "That note could not be deleted from this browser." }, 404);
  }

  const replyCount = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM comments
    WHERE parent_id = ? AND post_slug = ? AND status = 'approved'
  `).bind(id, postSlug).first();

  const hasReplies = Number(replyCount && replyCount.count ? replyCount.count : 0) > 0;

  if (hasReplies) {
    await db.prepare(`
      UPDATE comments
      SET author_name = 'A traveler',
          author_email = NULL,
          author_location = NULL,
          body = 'This note was deleted by its author.',
          delete_token_hash = NULL,
          deleted_by_author = 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      WHERE id = ? AND post_slug = ?
    `).bind(id, postSlug).run();
  } else {
    await db.prepare(`
      UPDATE comments
      SET status = 'deleted',
          author_email = NULL,
          author_location = NULL,
          delete_token_hash = NULL,
          deleted_by_author = 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      WHERE id = ? AND post_slug = ?
    `).bind(id, postSlug).run();
  }

  return json({ ok: true, redacted: hasReplies });
}

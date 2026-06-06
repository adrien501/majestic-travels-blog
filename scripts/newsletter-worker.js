const KLAVIYO_REVISION = "2026-04-15";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function parseKlaviyoError(data) {
  if (data && Array.isArray(data.errors) && data.errors.length) {
    return data.errors
      .map((error) => error.detail || error.title)
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleNewsletter(request, env) {
  if (request.method === "GET") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let body;

  try {
    body = await request.json();
  } catch (error) {
    return jsonResponse({ error: "Please enter a valid email address." }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const privateKey = env.KLAVIYO_PRIVATE_API_KEY;
  const listId = env.KLAVIYO_LIST_ID || body.listId;

  if (!isValidEmail(email)) {
    return jsonResponse({ error: "Please enter a valid email address." }, 400);
  }

  if (!privateKey || !listId) {
    return jsonResponse({ error: "Newsletter is not configured yet." }, 500);
  }

  const klaviyoResponse = await fetch("https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs", {
    method: "POST",
    headers: {
      "accept": "application/vnd.api+json",
      "authorization": `Klaviyo-API-Key ${privateKey}`,
      "content-type": "application/vnd.api+json",
      "revision": KLAVIYO_REVISION
    },
    body: JSON.stringify({
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          custom_source: "Majestic Travels newsletter",
          profiles: {
            data: [
              {
                type: "profile",
                attributes: {
                  email,
                  subscriptions: {
                    email: {
                      marketing: {
                        consent: "SUBSCRIBED"
                      }
                    }
                  }
                }
              }
            ]
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
  });

  if (klaviyoResponse.ok) {
    return jsonResponse({ ok: true });
  }

  const data = await klaviyoResponse.json().catch(() => null);
  return jsonResponse(
    { error: parseKlaviyoError(data) || "Newsletter signup failed. Please try again." },
    klaviyoResponse.status >= 400 && klaviyoResponse.status < 500 ? 400 : 502
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/newsletter") {
      return handleNewsletter(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return fetch(request);
  }
};

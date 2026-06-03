const KLAVIYO_ENDPOINT = "https://a.klaviyo.com/client/subscriptions";
const KLAVIYO_REVISION = "2026-04-15";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function readBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

function klaviyoErrorMessage(body) {
  if (body && Array.isArray(body.errors) && body.errors[0]) {
    return body.errors[0].detail || body.errors[0].title || "Klaviyo rejected the subscription.";
  }
  return "Klaviyo rejected the subscription.";
}

async function subscribe(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, { status: 405 });
  }

  const body = await readBody(request);
  const email = String(body.email || "").trim();
  const source = String(body.source || "Majestic Travels newsletter").slice(0, 120);
  const publicKey = env.KLAVIYO_PUBLIC_API_KEY;
  const listId = env.KLAVIYO_LIST_ID;

  if (!isValidEmail(email)) {
    return json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (!publicKey || !listId) {
    return json({ error: "Newsletter is not configured yet." }, { status: 500 });
  }

  const response = await fetch(`${KLAVIYO_ENDPOINT}?company_id=${encodeURIComponent(publicKey)}`, {
    method: "POST",
    headers: {
      accept: "application/vnd.api+json",
      "content-type": "application/vnd.api+json",
      revision: KLAVIYO_REVISION
    },
    body: JSON.stringify({
      data: {
        type: "subscription",
        attributes: {
          custom_source: source,
          profile: {
            data: {
              type: "profile",
              attributes: {
                email,
                subscriptions: {
                  email: {
                    marketing: {
                      consent: "SUBSCRIBED"
                    }
                  }
                },
                properties: {
                  signup_source: source
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
  });

  if (response.ok) {
    return json({ ok: true });
  }

  let errorBody = null;
  try {
    errorBody = await response.json();
  } catch (error) {
    errorBody = null;
  }

  return json({ error: klaviyoErrorMessage(errorBody) }, { status: response.status || 502 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/subscribe") {
      return subscribe(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

import { onRequestGet, onRequestPatch, onRequestPost } from "./functions/api/comments.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function methodNotAllowed() {
  return new Response(JSON.stringify({ message: "Method not allowed." }), {
    status: 405,
    headers: {
      ...JSON_HEADERS,
      allow: "GET, POST, PATCH"
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/comments") {
      const context = { request, env, ctx };

      if (request.method === "GET") return onRequestGet(context);
      if (request.method === "POST") return onRequestPost(context);
      if (request.method === "PATCH") return onRequestPatch(context);

      return methodNotAllowed();
    }

    return env.ASSETS.fetch(request);
  }
};

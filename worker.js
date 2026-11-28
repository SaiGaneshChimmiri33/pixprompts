// Cloudflare Worker entry: serves the static site from this folder and runs the
// /api/* backend. It keeps the API in the api-*.js files next to it.
import * as prompts from "./api-prompts.js";
import * * as contact from "./api-contact.js";
import * as subscribe from "./api-subscribe.js";
import * as inbox from "./api-inbox.js";
import * as imgUpload from "./api-img-upload.js";
import * as imgGet from "./api-img-get.js";

// Same precedence as Pages Functions: onRequestGet/Post/... first, then onRequest.
const call = (mod, request, env, ctx, params = {}) => {
  const h = mod["onRequest" + request.method.charAt(0) + request.method.slice(1).toLowerCase()] || mod.onRequest;
  if (!h) return new Response("method not allowed", { status: 405 });
  return h({ request, env, params, waitUntil: ctx.waitUntil.bind(ctx), next: () => env.ASSETS.fetch(request) });
};

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const p = pathname.replace(/\/+$/, "") || "/";
    if (p === "/api/prompts") return call(prompts, request, env, ctx);
    if (p === "/api/contact") return call(contact, request, env, ctx);
    if (p === "/api/subscribe") return call(subscribe, request, env, ctx);
    if (p === "/api/inbox") return call(inbox, request, env, ctx);
    if (p === "/api/img") return call(imgUpload, request, env, ctx);
    const m = /^\/api\/img\/([^/]+)$/.exec(p);
    if (m) return call(imgGet, request, env, ctx, { name: decodeURIComponent(m[1]) });
    if (p.startsWith("/api/")) return new Response("not found", { status: 404 });

    // Show the blog landing page at the website root, while keeping /blog available.
    if (p === "/") {
      const blogUrl = new URL("/blog.html", request.url);
      const blogRequest = new Request(blogUrl.toString(), request);
      return env.ASSETS.fetch(blogRequest);
    }

    return env.ASSETS.fetch(request);
  },
};

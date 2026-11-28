import { json, isAuthorized, sameOrigin, noKV } from "./util.js";

const color = (v) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : "#FFB6C9");
const clean = (x) => ({
  id: String(x.id || crypto.randomUUID()).slice(0, 60),
  title: String(x.title || "").trim().slice(0, 80),
  category: String(x.category || "").trim().slice(0, 30),
  tools: String(x.tools || "All tools").slice(0, 60),
  colors: [color((x.colors || [])[0]), color((x.colors || [])[1])],
  text: String(x.text || "").trim().slice(0, 1500),
  image: /^\/(img|api\/img)\/[\w.\-]+$/.test(x.image || "") ? x.image : "",
  published: x.published !== false,
});

// GET /api/prompts          -> published prompts (public, cached 60s)
// GET /api/prompts?all=1    -> everything incl. hidden (admin only)
export const onRequestGet = async ({ request, env }) => {
  if (!env.PIXPROMPTS) return noKV();
  const all = new URL(request.url).searchParams.get("all") === "1";
  if (all && !(await isAuthorized(request, env))) {
    return json({ error: "unauthorized" }, 401, { "cache-control": "no-store" });
  }
  const list = await env.PIXPROMPTS.get("list", "json");
  if (!list) return json({ prompts: null }, 200, { "cache-control": "no-store" });
  return json(
    { prompts: all ? list : list.filter((p) => p.published) },
    200,
    { "cache-control": all ? "no-store" : "public, max-age=60" },
  );
};

// PUT /api/prompts  { prompts: [...] }  (admin only)
export const onRequestPut = async ({ request, env }) => {
  if (!env.PIXPROMPTS) return noKV();
  if (!(await isAuthorized(request, env)) || !sameOrigin(request)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return json({ error: "unauthorized" }, 401, { "cache-control": "no-store" });
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!Array.isArray(body.prompts) || body.prompts.length > 500) return json({ error: "invalid" }, 400);
  const prompts = body.prompts.map(clean).filter((p) => p.title && p.text && p.category);
  await env.PIXPROMPTS.put("list", JSON.stringify(prompts));
  return json({ ok: true, count: prompts.length }, 200, { "cache-control": "no-store" });
};

export const onRequest = () =>
  json({ error: "method not allowed" }, 405, { allow: "GET, PUT" });

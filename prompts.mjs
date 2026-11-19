import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";
const J = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", ...h } });
const authed = (req) => {
  const t = (req.headers.get("authorization") || "").replace("Bearer ", ""), p = process.env.ADMIN_PASSWORD || "";
  return !!p && t.length === p.length && timingSafeEqual(Buffer.from(t), Buffer.from(p));
};
const col = (c) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : "#FFB6C9");
const clean = (x) => ({
  id: String(x.id || crypto.randomUUID()).slice(0, 60),
  title: String(x.title || "").trim().slice(0, 80),
  category: String(x.category || "").trim().slice(0, 30),
  tools: String(x.tools || "All tools").slice(0, 60),
  colors: [col((x.colors || [])[0]), col((x.colors || [])[1])],
  text: String(x.text || "").trim().slice(0, 1500),
  image: /^\/(img|api\/img)\/[\w.\-]+$/.test(x.image || "") ? x.image : "",
  published: x.published !== false,
});
export default async (req) => {
  const store = getStore("pixprompts"), url = new URL(req.url);
  if (req.method === "GET") {
    const all = url.searchParams.get("all");
    if (all && !authed(req)) return J({ error: "unauthorized" }, 401);
    const list = await store.get("list", { type: "json" });
    if (!list) return J({ prompts: null }, 200, { "cache-control": "no-store" });
    return J({ prompts: all ? list : list.filter((p) => p.published) }, 200, { "cache-control": all ? "no-store" : "public, max-age=60" });
  }
  if (req.method === "PUT") {
    if (!authed(req)) { await new Promise((r) => setTimeout(r, 800)); return J({ error: "unauthorized" }, 401); }
    let b; try { b = await req.json(); } catch { return J({ error: "bad json" }, 400); }
    if (!Array.isArray(b.prompts) || b.prompts.length > 500) return J({ error: "invalid" }, 400);
    const list = b.prompts.map(clean).filter((p) => p.title && p.text && p.category);
    await store.setJSON("list", list);
    return J({ ok: true, count: list.length });
  }
  return J({ error: "method not allowed" }, 405);
};
export const config = { path: "/api/prompts" };

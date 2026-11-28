import { json, isAuthorized, noKV } from "./util.js";

// GET /api/inbox?type=messages|subscribers  (admin only)
export const onRequestGet = async ({ request, env }) => {
  if (!env.PIXPROMPTS) return noKV();
  if (!(await isAuthorized(request, env))) return json({ error: "unauthorized" }, 401, { "cache-control": "no-store" });
  const type = new URL(request.url).searchParams.get("type") === "subscribers" ? "subscribers" : "messages";
  const prefix = type === "subscribers" ? "sub:" : "msg:";
  const { keys } = await env.PIXPROMPTS.list({ prefix, limit: 500 });
  const rows = await Promise.all(keys.map(async (k) => {
    try { return await env.PIXPROMPTS.get(k.name, "json"); } catch { return null; }
  }));
  const items = rows.filter(Boolean);
  if (type === "subscribers") items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return json({ type, items }, 200, { "cache-control": "no-store" });
};

import { json, readForm, redirect, noKV } from "./util.js";

// Replaces the old Netlify Forms newsletter form. One KV key per email (no duplicates).
export const onRequestPost = async ({ request, env }) => {
  if (!env.PIXPROMPTS) return noKV();
  let f;
  try { f = await readForm(request); } catch { return json({ error: "bad request" }, 400); }
  if (f["bot-field"]) return redirect("/?subscribed=1#signup");
  const email = String(f.email || "").trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return redirect("/?error=1#signup");
  const key = "sub:" + email;
  if (!(await env.PIXPROMPTS.get(key))) {
    await env.PIXPROMPTS.put(key, JSON.stringify({ email, at: new Date().toISOString() }));
  }
  return redirect("/?subscribed=1#signup");
};

export const onRequest = () => json({ error: "method not allowed" }, 405, { allow: "POST" });

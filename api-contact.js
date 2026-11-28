import { json, readForm, redirect, newestFirstKey, noKV } from "./util.js";

// Replaces the old Netlify Forms contact form. Messages are stored in KV
// and shown in /admin under "Inbox".
export const onRequestPost = async ({ request, env }) => {
  if (!env.PIXPROMPTS) return noKV();
  let f;
  try { f = await readForm(request); } catch { return json({ error: "bad request" }, 400); }
  if (f["bot-field"]) return redirect("/contact?sent=1"); // honeypot: pretend success
  const name = String(f.name || "").trim().slice(0, 100);
  const email = String(f.email || "").trim().slice(0, 200);
  const message = String(f.message || "").trim().slice(0, 4000);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return redirect("/contact?error=1");
  await env.PIXPROMPTS.put(
    newestFirstKey("msg:"),
    JSON.stringify({ name, email, message, at: new Date().toISOString() }),
    { expirationTtl: 60 * 60 * 24 * 180 }, // keep 180 days
  );
  return redirect("/contact?sent=1");
};

export const onRequest = () => json({ error: "method not allowed" }, 405, { allow: "POST" });

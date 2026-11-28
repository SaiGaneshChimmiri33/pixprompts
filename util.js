// Shared helpers for Cloudflare Pages Functions.
// Bindings needed (Pages project > Settings > Functions):
//   KV namespace  -> variable name: PIXPROMPTS
//   Secret        -> ADMIN_PASSWORD

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

const sha256 = async (text) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));

// Compare fixed-size digests in constant time so password length/content do not leak.
export const isAuthorized = async (request, env) => {
  const expected = env.ADMIN_PASSWORD || "";
  if (!expected) return false; // fail closed when the secret is missing
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") || "");
  const a = await sha256(expected);
  const b = await sha256(m ? m[1] : "");
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

// Browsers always send Origin on cross-site writes; non-browser clients still need the password.
export const sameOrigin = (request) => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
};

export const noKV = () =>
  json({ error: "KV binding PIXPROMPTS is not configured. See CLOUDFLARE_SETUP.md." }, 500, { "cache-control": "no-store" });

// Reverse-timestamp keys so KV's ascending list order returns newest first.
export const newestFirstKey = (prefix) =>
  `${prefix}${String(9999999999999 - Date.now()).padStart(13, "0")}-${crypto.randomUUID().slice(0, 8)}`;

export const readForm = async (request) => {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return await request.json();
  const fd = await request.formData();
  return Object.fromEntries(fd.entries());
};

export const redirect = (to) =>
  new Response(null, { status: 303, headers: { location: to, "cache-control": "no-store" } });

import { json, isAuthorized, sameOrigin, noKV } from "./util.js";

const TYPES = { jpg: "image/jpeg", webp: "image/webp", png: "image/png" };
const MAX = 1_500_000;

// Check real file bytes, not just the ?ext= the client claims.
const looksLike = (ext, b) => {
  const u = new Uint8Array(b.slice(0, 12));
  if (ext === "jpg") return u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff;
  if (ext === "png") return u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47;
  if (ext === "webp") return String.fromCharCode(...u.slice(0, 4)) === "RIFF" && String.fromCharCode(...u.slice(8, 12)) === "WEBP";
  return false;
};

// POST /api/img?ext=jpg   (admin only) -> { url: "/api/img/<uuid>.jpg" }
export const onRequestPost = async ({ request, env }) => {
  if (!env.PIXPROMPTS) return noKV();
  if (!(await isAuthorized(request, env)) || !sameOrigin(request)) return new Response("unauthorized", { status: 401 });
  const ext = new URL(request.url).searchParams.get("ext") || "jpg";
  if (!TYPES[ext]) return new Response("bad type", { status: 400 });
  const buf = await request.arrayBuffer();
  if (buf.byteLength === 0) return new Response("invalid size", { status: 400 });
  if (buf.byteLength > MAX) return new Response("too large", { status: 413 });
  if (!looksLike(ext, buf)) return new Response("not a valid image", { status: 400 });
  const name = crypto.randomUUID() + "." + ext;
  await env.PIXPROMPTS.put("img:" + name, buf, { metadata: { type: TYPES[ext] } });
  return json({ url: "/api/img/" + name }, 200, { "cache-control": "no-store" });
};

export const onRequest = () =>
  new Response("method not allowed", { status: 405, headers: { allow: "POST" } });

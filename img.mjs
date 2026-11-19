import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";
const authed = (req) => {
  const t = (req.headers.get("authorization") || "").replace("Bearer ", ""), p = process.env.ADMIN_PASSWORD || "";
  return !!p && t.length === p.length && timingSafeEqual(Buffer.from(t), Buffer.from(p));
};
const TYPES = { jpg: "image/jpeg", webp: "image/webp", png: "image/png" };
export default async (req) => {
  const store = getStore("images"), url = new URL(req.url);
  if (req.method === "POST") {
    if (!authed(req)) return new Response("unauthorized", { status: 401 });
    const ext = url.searchParams.get("ext") || "jpg";
    if (!TYPES[ext]) return new Response("bad type", { status: 400 });
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 1500000) return new Response("too large", { status: 413 });
    const name = crypto.randomUUID() + "." + ext;
    await store.set(name, buf, { metadata: { type: TYPES[ext] } });
    return Response.json({ url: "/api/img/" + name });
  }
  const name = url.pathname.split("/").pop();
  if (!/^[\w\-]+\.(jpg|webp|png)$/.test(name)) return new Response("not found", { status: 404 });
  const r = await store.getWithMetadata(name, { type: "arrayBuffer" });
  if (!r) return new Response("not found", { status: 404 });
  return new Response(r.data, { headers: { "content-type": r.metadata.type, "cache-control": "public, max-age=31536000, immutable" } });
};
export const config = { path: ["/api/img", "/api/img/*"] };

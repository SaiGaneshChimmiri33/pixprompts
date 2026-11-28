import { noKV } from "./util.js";

// GET /api/img/<uuid>.jpg
export const onRequestGet = async ({ params, env }) => {
  if (!env.PIXPROMPTS) return noKV();
  const name = String(params.name || "");
  if (!/^[\w\-]+\.(jpg|webp|png)$/.test(name)) return new Response("not found", { status: 404 });
  const { value, metadata } = await env.PIXPROMPTS.getWithMetadata("img:" + name, "arrayBuffer");
  if (!value) return new Response("not found", { status: 404 });
  return new Response(value, {
    headers: {
      "content-type": (metadata && metadata.type) || "image/jpeg",
      "x-content-type-options": "nosniff",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

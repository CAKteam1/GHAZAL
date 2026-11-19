interface Env {
  GHAZAL_KV?: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (env.GHAZAL_KV) {
    const saved = await env.GHAZAL_KV.get("studio_state");
    if (saved) {
      return new Response(saved, {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  }
  return new Response(JSON.stringify({ ok: true, edge: "cloudflare-pages" }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.text();
  if (env.GHAZAL_KV) {
    await env.GHAZAL_KV.put("studio_state", body);
  }
  return new Response(body || JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

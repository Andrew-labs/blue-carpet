export default async (req) => {
  const REPLICATE_TOKEN = Netlify.env.get("REPLICATE_API_TOKEN");

  if (!REPLICATE_TOKEN) {
    return new Response(JSON.stringify({ error: "API token not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { pathname, search } = new URL(req.url);
  const replicatePath = pathname.replace(/^\/api/, "/v1") + search;
  const replicateUrl = `https://api.replicate.com${replicatePath}`;

  const headers = {
    Authorization: `Bearer ${REPLICATE_TOKEN}`,
    "Content-Type": "application/json",
  };

  if (req.headers.get("Prefer")) {
    headers["Prefer"] = req.headers.get("Prefer");
  }

  const body = req.method !== "GET" ? await req.text() : undefined;

  const response = await fetch(replicateUrl, {
    method: req.method,
    headers,
    body,
  });

  const data = await response.text();

  return new Response(data, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/*",
};

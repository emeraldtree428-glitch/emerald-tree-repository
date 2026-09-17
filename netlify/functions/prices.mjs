import { getStore } from "@netlify/blobs";

const STORE = "emerald-tree-reviews";
const PRICE_KEY = "room-prices";
const DEFAULT_PRICES = { standard: 1499, deluxe: 1999, executive: 2499 };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

function adminOk(req) {
  const expected = String(process.env.REVIEWS_ADMIN_TOKEN ?? "").trim();
  if (!expected) return false;
  const bearer = req.headers.get("authorization") || "";
  const supplied = bearer.toLowerCase().startsWith("bearer ")
    ? bearer.slice(7).trim()
    : (req.headers.get("x-admin-token") || "").trim();
  return supplied === expected;
}

export default async (req) => {
  const store = getStore(STORE);

  if (req.method === "GET") {
    let prices = await store.get(PRICE_KEY, { type: "json" });
    if (!prices) prices = DEFAULT_PRICES;
    return json({ prices });
  }

  if (req.method === "PATCH") {
    if (!adminOk(req)) return json({ error: "Unauthorized" }, 401);
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }

    const prices = {};
    for (const key of ["standard", "deluxe", "executive"]) {
      const value = Number(body[key]);
      if (!Number.isFinite(value) || value < 0 || value > 1000000) {
        return json({ error: "Please enter valid room prices." }, 400);
      }
      prices[key] = Math.round(value);
    }

    await store.setJSON(PRICE_KEY, prices);
    return json({ ok: true, prices });
  }

  return json({ error: "Method not allowed." }, 405);
};

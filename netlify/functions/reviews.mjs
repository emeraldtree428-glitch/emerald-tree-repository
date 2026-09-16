import { getStore } from "@netlify/blobs";

const STORE = "emerald-tree-reviews";

const PRICE_KEY = "room-prices";
const DEFAULT_PRICES = { standard: 1499, deluxe: 1999, executive: 2499 };



function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function cleanText(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function adminOk(req) {
  const token = process.env.REVIEWS_ADMIN_TOKEN;
  if (!token) return false;
  const supplied = req.headers.get("x-admin-token") || "";
  return supplied === token;
}

export default async (req) => {
  const store = getStore(STORE);


  if (req.method === "GET" && new URL(req.url).pathname.endsWith("/prices")) {
    let prices = await store.get(PRICE_KEY, { type: "json" });
    if (!prices) prices = DEFAULT_PRICES;
    return json({ prices });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const admin = url.searchParams.get("admin") === "1";

    if (admin) {
      if (!adminOk(req)) return json({ error: "Unauthorized" }, 401);
      const { blobs } = await store.list({ prefix: "review-" });
      const reviews = [];
      for (const item of blobs) {
        const review = await store.get(item.key, { type: "json" });
        if (review) reviews.push(review);
      }
      reviews.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return json({ reviews });
    }

    const { blobs } = await store.list({ prefix: "review-" });
    const reviews = [];
    for (const item of blobs) {
      const review = await store.get(item.key, { type: "json" });
      if (review?.status === "approved") reviews.push(review);
    }
    reviews.sort((a, b) => String(b.approvedAt || b.createdAt).localeCompare(String(a.approvedAt || a.createdAt)));
    return json({ reviews });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }

    const name = cleanText(body.name, 60);
    const text = cleanText(body.text, 800);
    const rating = Number(body.rating);

    if (!name || !text || !Number.isInteger(rating) || rating < 1 || rating > 5 || body.stayed !== true) {
      return json({ error: "Please complete all fields and confirm that you stayed at Emerald Tree." }, 400);
    }

    const id = `${Date.now()}-${crypto.randomUUID()}`;
    const review = {
      id,
      name,
      text,
      rating,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    await store.setJSON(`review-${id}`, review);
    return json({ ok: true, message: "Feedback submitted for approval." }, 201);
  }


  if (req.method === "PATCH" && new URL(req.url).pathname.endsWith("/prices")) {
    if (!adminOk(req)) return json({ error: "Unauthorized" }, 401);
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
    const keys = ["standard","deluxe","executive"];
    const prices = {};
    for (const key of keys) {
      const value = Number(body[key]);
      if (!Number.isFinite(value) || value < 0 || value > 1000000) {
        return json({ error: "Please enter valid room prices." }, 400);
      }
      prices[key] = Math.round(value);
    }
    await store.setJSON(PRICE_KEY, prices);
    return json({ ok: true, prices });
  }

  if (req.method === "PATCH") {
    if (!adminOk(req)) return json({ error: "Unauthorized" }, 401);

    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }

    const id = cleanText(body.id, 120);
    const action = body.action;
    if (!id || !["approve", "reject", "delete"].includes(action)) {
      return json({ error: "Invalid moderation action." }, 400);
    }

    const key = `review-${id}`;
    const review = await store.get(key, { type: "json" });
    if (!review) return json({ error: "Review not found." }, 404);

    if (action === "delete" || action === "reject") {
      await store.delete(key);
      return json({ ok: true });
    }

    review.status = "approved";
    review.approvedAt = new Date().toISOString();
    await store.setJSON(key, review);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed." }, 405);
};

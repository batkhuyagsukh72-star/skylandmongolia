// Skyland admin API: sign in with the shared admin password, edit the site's tours and places, upload photos, read trip requests.
// Secrets (Supabase → Edge Functions → Secrets): ADMIN_PASSWORD (optional shared password), RESEND_API_KEY (login codes, review alerts),
// ADMIN_EMAILS (optional, comma-separated; default skylandmongolia@gmail.com) — these addresses can sign in with an e-mailed code.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

const PASS = Deno.env.get("ADMIN_PASSWORD") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "tour-photos";
const KEYS = ["tours", "places", "gallery"];
const RESEND = Deno.env.get("RESEND_API_KEY") ?? "";
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "skylandmongolia@gmail.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const FROM = "Azure Skyland Mongolia <hello@skylandmongolia.com>";
const NOTIFY = "skylandmongolia@gmail.com";
const TOKEN_HOURS = 12;
const ORIGINS = [
  "https://skylandmongolia.com",
  "https://www.skylandmongolia.com",
  "https://batkhuyagsukh72-star.github.io",
  "http://127.0.0.1:8766",
  "http://localhost:8766",
];

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}
function svcHeaders(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { apikey: SB_KEY, ...extra };
  if (!SB_KEY.startsWith("sb_")) h.Authorization = "Bearer " + SB_KEY;
  return h;
}
function db(path: string, init: RequestInit = {}) {
  return fetch(SB_URL + "/rest/v1/" + path, { ...init, headers: svcHeaders({ "Content-Type": "application/json", ...(init.headers as Record<string, string> ?? {}) }) });
}
const enc = new TextEncoder();
function b64u(b: Uint8Array) { let s = ""; b.forEach((x) => (s += String.fromCharCode(x))); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
async function hmac(msg: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode("skyland-admin|" + SB_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg))));
}
async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", enc.encode(s + "|skyland"));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
function same(a: string, b: string) {
  const x = enc.encode(a), y = enc.encode(b); let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}
async function makeToken() {
  const p = b64u(enc.encode(JSON.stringify({ exp: Date.now() + TOKEN_HOURS * 3600e3 })));
  return p + "." + (await hmac(p));
}
async function checkToken(t: string | null) {
  if (!t || !SB_KEY) return false;
  const [p, s] = t.split(".");
  if (!p || !s || !same(s, await hmac(p))) return false;
  try { return JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/"))).exp > Date.now(); } catch { return false; }
}

/* light shape checks so a broken save can never take the public site down */
function validTours(d: unknown) {
  if (!Array.isArray(d) || !d.length || d.length > 40) return "tours must be a list of 1–40 tours";
  const ids = new Set<string>();
  for (const t of d as Record<string, unknown>[]) {
    if (!t || typeof t !== "object") return "bad tour";
    if (typeof t.id !== "string" || !/^[a-z0-9-]{2,40}$/.test(t.id) || ids.has(t.id)) return "each tour needs a unique id (a–z, 0–9, -)";
    ids.add(t.id);
    if (!(Number(t.days) >= 1 && Number(t.days) <= 60)) return t.id + ": days must be 1–60";
    if (!t.name || typeof (t.name as Record<string, unknown>).en !== "string") return t.id + ": missing name";
    if (!Array.isArray(t.plan) || !Array.isArray(t.route) || (t.route as unknown[]).length < 2) return t.id + ": needs a day plan and at least 2 route stops";
  }
  return "";
}
function validPlaces(d: unknown) {
  if (!Array.isArray(d) || d.length > 300) return "places must be a list";
  for (const p of d as Record<string, unknown>[]) {
    if (typeof p.id !== "string" || !/^[a-z0-9-]{2,40}$/.test(p.id)) return "bad place id";
    const lat = Number(p.lat), lon = Number(p.lon);
    if (!(lat > 40 && lat < 53 && lon > 86 && lon < 121)) return p.id + ": coordinates must be inside Mongolia";
  }
  return "";
}

function validGallery(d: unknown) {
  if (!Array.isArray(d) || d.length > 200) return "gallery must be a list of up to 200 photos";
  for (const g of d as Record<string, unknown>[]) if (!g || typeof g.img !== "string" || !g.img) return "every gallery item needs a photo";
  return "";
}
function escH(s: unknown) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }
async function mail(to: string, subject: string, html: string) {
  if (!RESEND) return false;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json" }, body: JSON.stringify({ from: FROM, to: [to], subject, html }) });
  return r.ok;
}
const ipOf = (req: Request) => sha(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?");

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405, origin);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400, origin); }
  const act = String(b.action ?? "");

  /* ---- public: a traveller leaves a review (published only after approval) ---- */
  if (act === "review-submit") {
    if (b.website) return json({ ok: true }, 200, origin); // honeypot
    const name = String(b.name ?? "").trim().slice(0, 80), body = String(b.body ?? "").trim().slice(0, 2000);
    const rating = Math.round(Number(b.rating)), country = String(b.country ?? "").trim().slice(0, 60), tour = String(b.tour ?? "").trim().slice(0, 120);
    if (name.length < 2 || body.length < 10 || !(rating >= 1 && rating <= 5)) return json({ ok: false, error: "please fill in name, rating and at least a sentence" }, 400, origin);
    const ip = await ipOf(req), since = new Date(Date.now() - 3600e3).toISOString();
    const r0 = await db(`reviews?select=id&ip_hash=eq.${ip}&created_at=gte.${since}`);
    if (r0.ok && (await r0.json()).length >= 3) return json({ ok: false, error: "too many reviews from here, try later" }, 429, origin);
    const r = await db("reviews", { method: "POST", body: JSON.stringify({ name, country: country || null, rating, body, tour: tour || null, lang: String(b.lang ?? "").slice(0, 5), ip_hash: ip }), headers: { Prefer: "return=minimal" } });
    if (!r.ok) return json({ ok: false, error: "db " + r.status }, 500, origin);
    await mail(NOTIFY, "New review to approve — " + name, `<p><b>${escH(name)}</b>${country ? " (" + escH(country) + ")" : ""} — ${"★".repeat(rating)}${"☆".repeat(5 - rating)}</p><p>${escH(body).replace(/\n/g, "<br>")}</p>${tour ? "<p>Tour: " + escH(tour) + "</p>" : ""}<p>Approve or delete it in the admin: <a href="https://skylandmongolia.com/admin/">skylandmongolia.com/admin</a></p>`);
    return json({ ok: true }, 200, origin);
  }

  /* ---- public: sign in with a code e-mailed to an owner address ---- */
  if (act === "login-start") {
    const email = String(b.email ?? "").trim().toLowerCase();
    if (ADMIN_EMAILS.includes(email)) {
      const since = new Date(Date.now() - 3600e3).toISOString();
      const r0 = await db(`admin_codes?select=id&email=eq.${encodeURIComponent(email)}&created_at=gte.${since}`);
      if (!(r0.ok && (await r0.json()).length >= 6)) {
        const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
        await db("admin_codes", { method: "POST", body: JSON.stringify({ email, code_hash: await sha(email + "|" + code), expires_at: new Date(Date.now() + 10 * 60e3).toISOString() }), headers: { Prefer: "return=minimal" } });
        await mail(email, "Skyland admin code: " + code, `<p>Your sign-in code for the Azure Skyland admin:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>It works for 10 minutes. If you did not ask for it, ignore this e-mail.</p>`);
      }
    }
    return json({ ok: true }, 200, origin); // same answer for every address
  }
  if (act === "login-verify") {
    const email = String(b.email ?? "").trim().toLowerCase(), code = String(b.code ?? "").replace(/\D/g, "");
    const now = new Date().toISOString();
    const r = await db(`admin_codes?select=id,code_hash,tries&email=eq.${encodeURIComponent(email)}&expires_at=gt.${now}&order=id.desc&limit=1`);
    const row = r.ok ? (await r.json())[0] : null;
    if (!row || row.tries >= 5) return json({ ok: false, error: "code expired, ask for a new one" }, 401, origin);
    if (!same(row.code_hash, await sha(email + "|" + code))) {
      await db(`admin_codes?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ tries: row.tries + 1 }), headers: { Prefer: "return=minimal" } });
      return json({ ok: false, error: "wrong code" }, 401, origin);
    }
    await db(`admin_codes?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ tries: 99 }), headers: { Prefer: "return=minimal" } });
    return json({ ok: true, token: await makeToken(), hours: TOKEN_HOURS, email }, 200, origin);
  }

  if (act === "login") {
    if (!PASS) return json({ ok: false, error: "ADMIN_PASSWORD is not set" }, 503, origin);
    const ip = await sha(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?");
    const since = new Date(Date.now() - 15 * 60e3).toISOString();
    const r = await db(`admin_login?select=at&ip_hash=eq.${ip}&ok=eq.false&at=gte.${since}`);
    const fails = r.ok ? (await r.json()).length : 0;
    if (fails >= 8) return json({ ok: false, error: "too many attempts, wait 15 minutes" }, 429, origin);
    const ok = same(String(b.password ?? ""), PASS);
    await db("admin_login", { method: "POST", body: JSON.stringify({ ip_hash: ip, ok }), headers: { Prefer: "return=minimal" } });
    if (!ok) return json({ ok: false, error: "wrong password" }, 401, origin);
    return json({ ok: true, token: await makeToken(), hours: TOKEN_HOURS }, 200, origin);
  }

  if (!(await checkToken(req.headers.get("x-admin-token")))) return json({ ok: false, error: "signed out" }, 401, origin);

  if (act === "save") {
    const key = String(b.key ?? "");
    if (!KEYS.includes(key)) return json({ ok: false, error: "bad key" }, 400, origin);
    const err = key === "tours" ? validTours(b.data) : key === "places" ? validPlaces(b.data) : validGallery(b.data);
    if (err) return json({ ok: false, error: err }, 400, origin);
    if (JSON.stringify(b.data).length > 900_000) return json({ ok: false, error: "too large" }, 413, origin);
    const old = await db(`content?select=data&key=eq.${key}`);
    const prev = old.ok ? await old.json() : [];
    if (prev.length) await db("content_history", { method: "POST", body: JSON.stringify({ key, data: prev[0].data, note: String(b.note ?? "").slice(0, 120) }), headers: { Prefer: "return=minimal" } });
    const r = await db("content?on_conflict=key", { method: "POST", body: JSON.stringify({ key, data: b.data, updated_at: new Date().toISOString() }), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    if (!r.ok) return json({ ok: false, error: "db " + r.status + " " + (await r.text()).slice(0, 160) }, 500, origin);
    return json({ ok: true }, 200, origin);
  }

  if (act === "history") {
    const key = String(b.key ?? "tours");
    const r = await db(`content_history?select=id,saved_at,note&key=eq.${encodeURIComponent(key)}&order=id.desc&limit=30`);
    return json({ ok: r.ok, items: r.ok ? await r.json() : [] }, 200, origin);
  }

  if (act === "restore") {
    const id = Number(b.id);
    const r = await db(`content_history?select=key,data&id=eq.${id}`);
    const rows = r.ok ? await r.json() : [];
    if (!rows.length) return json({ ok: false, error: "not found" }, 404, origin);
    const cur = await db(`content?select=data&key=eq.${rows[0].key}`);
    const c = cur.ok ? await cur.json() : [];
    if (c.length) await db("content_history", { method: "POST", body: JSON.stringify({ key: rows[0].key, data: c[0].data, note: "before restore #" + id }), headers: { Prefer: "return=minimal" } });
    await db("content?on_conflict=key", { method: "POST", body: JSON.stringify({ key: rows[0].key, data: rows[0].data, updated_at: new Date().toISOString() }), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    return json({ ok: true, key: rows[0].key, data: rows[0].data }, 200, origin);
  }

  if (act === "upload") {
    const type = String(b.type ?? "");
    if (!["image/jpeg", "image/webp", "image/png"].includes(type)) return json({ ok: false, error: "jpg, webp or png only" }, 400, origin);
    const bin = Uint8Array.from(atob(String(b.b64 ?? "")), (c) => c.charCodeAt(0));
    if (!bin.length || bin.length > 4_500_000) return json({ ok: false, error: "photo must be under 4.5 MB" }, 413, origin);
    const slug = String(b.name ?? "photo").toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "photo";
    const path = `uploads/${Date.now().toString(36)}-${slug}.${type.split("/")[1].replace("jpeg", "jpg")}`;
    const r = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, { method: "POST", body: bin, headers: svcHeaders({ "Content-Type": type, "Cache-Control": "31536000", "x-upsert": "false" }) });
    if (!r.ok) return json({ ok: false, error: "storage " + r.status + " " + (await r.text()).slice(0, 160) }, 500, origin);
    return json({ ok: true, url: `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}` }, 200, origin);
  }

  if (act === "photos") {
    const r = await fetch(`${SB_URL}/storage/v1/object/list/${BUCKET}`, { method: "POST", body: JSON.stringify({ prefix: "uploads/", limit: 500, sortBy: { column: "created_at", order: "desc" } }), headers: svcHeaders({ "Content-Type": "application/json" }) });
    const items = r.ok ? await r.json() : [];
    return json({ ok: r.ok, items: items.filter((x: { name: string }) => x.name && !x.name.startsWith(".")).map((x: { name: string }) => `${SB_URL}/storage/v1/object/public/${BUCKET}/uploads/${x.name}`) }, 200, origin);
  }

  if (act === "reviews") {
    const r = await db("reviews?select=id,created_at,name,country,rating,body,tour,lang,approved&order=id.desc&limit=200");
    return json({ ok: r.ok, items: r.ok ? await r.json() : [] }, 200, origin);
  }
  if (act === "review-set") {
    const r = await db(`reviews?id=eq.${Number(b.id)}`, { method: "PATCH", body: JSON.stringify({ approved: !!b.approved }), headers: { Prefer: "return=minimal" } });
    return json({ ok: r.ok }, r.ok ? 200 : 500, origin);
  }
  if (act === "review-delete") {
    const r = await db(`reviews?id=eq.${Number(b.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    return json({ ok: r.ok }, r.ok ? 200 : 500, origin);
  }

  if (act === "requests") {
    const r = await db("requests?select=id,created_at,name,contact,email,month,travellers,style,tour,places,note,lang,mailed&order=id.desc&limit=100");
    return json({ ok: r.ok, items: r.ok ? await r.json() : [] }, 200, origin);
  }

  return json({ ok: false, error: "unknown action" }, 400, origin);
});

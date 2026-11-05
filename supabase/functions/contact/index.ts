// Skyland trip requests: store each request, email the team through Resend and send the traveller a short confirmation.
// Secrets: RESEND_API_KEY (required for email). Optional: NOTIFY_TO, MAIL_FROM.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const NOTIFY_TO = Deno.env.get("NOTIFY_TO") ?? "skylandmongolia@gmail.com";
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "Azure Skyland Mongolia <hello@skylandmongolia.com>";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}
function db(path: string, init: RequestInit = {}) {
  const h: Record<string, string> = { apikey: SB_KEY, "Content-Type": "application/json" };
  if (!SB_KEY.startsWith("sb_")) h.Authorization = "Bearer " + SB_KEY;
  return fetch(SB_URL + "/rest/v1/" + path, { ...init, headers: { ...h, ...(init.headers as Record<string, string> ?? {}) } });
}
function clip(v: unknown, n: number) { return String(v ?? "").replace(/\s+$/g, "").slice(0, n).trim(); }
function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }
async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s + "|skyland"));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
async function send(mail: Record<string, unknown>) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(mail),
  });
  if (!r.ok) throw new Error("resend " + r.status + " " + (await r.text()).slice(0, 200));
}

const COPY = {
  en: {
    subject: "We received your trip request — Azure Skyland Mongolia",
    hi: (n: string) => `Hello ${n},`,
    body: "Thank you for your request. We will reply within 24 hours with a route and a price. If you would like to add anything, simply reply to this email or write to us on WhatsApp: +976 9503 0466.",
    sum: "Your request",
    sign: "Azure Skyland Mongolia",
  },
  mn: {
    subject: "Таны аяллын хүсэлтийг хүлээж авлаа — Azure Skyland Mongolia",
    hi: (n: string) => `Сайн байна уу, ${n}!`,
    body: "Хүсэлт илгээсэнд баярлалаа. 24 цагийн дотор маршрут, үнийн мэдээллийг хариу илгээнэ. Нэмж хэлэх зүйл байвал энэ имэйлд хариу бичих эсвэл WhatsApp-аар бичээрэй: +976 9503 0466.",
    sum: "Таны хүсэлт",
    sign: "Azure Skyland Mongolia",
  },
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method === "GET") {
    // health check; also keeps the free project active
    const r = await db("requests?select=id&limit=1");
    return json({ ok: r.ok, mail: !!RESEND_KEY }, 200, origin);
  }
  if (req.method !== "POST") return json({ ok: false }, 405, origin);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400, origin); }
  if (b._honey) return json({ ok: true, mailed: true }, 200, origin); // bots: pretend success

  const name = clip(b.name, 120), contact = clip(b.contact, 160);
  if (!name || !contact) return json({ ok: false, error: "missing" }, 400, origin);
  const lang = b.lang === "mn" ? "mn" : "en";
  const row = {
    name, contact,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact) ? contact.toLowerCase() : null,
    month: clip(b.month, 40), travellers: clip(b.travellers, 20), style: clip(b.style, 80),
    places: clip(b.places, 600), note: clip(b.note, 3000), tour: clip(b.tour, 120), lang,
    ip_hash: await sha(req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"),
  };

  // at most 5 requests from one address in 10 minutes
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const rc = await db(`requests?select=id&ip_hash=eq.${row.ip_hash}&created_at=gte.${since}`, { headers: { Prefer: "count=exact", Range: "0-0" } });
  const total = Number((rc.headers.get("content-range") ?? "*/0").split("/")[1] || 0);
  if (total >= 5) return json({ ok: false, error: "rate" }, 429, origin);

  const ins = await db("requests?select=id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
  const id = ins.ok ? (await ins.json())[0]?.id : null;

  let mailed = false, err = "";
  if (RESEND_KEY) {
    const lines: [string, string][] = [
      ["Name", name], ["Contact", contact], ["Month", row.month], ["Travellers", row.travellers],
      ["Style", row.style], ["Tour", row.tour], ["Places", row.places], ["Note", row.note], ["Language", lang.toUpperCase()],
    ];
    const rows = lines.filter((l) => l[1]).map((l) => `<tr><td style="padding:6px 14px 6px 0;color:#667;vertical-align:top;white-space:nowrap">${l[0]}</td><td style="padding:6px 0;color:#131A27">${esc(l[1]).replace(/\n/g, "<br>")}</td></tr>`).join("");
    const wa = row.email ? "" : contact.replace(/[^\d+]/g, "");
    try {
      await send({
        from: MAIL_FROM, to: [NOTIFY_TO], subject: `New trip request — ${name}`,
        ...(row.email ? { reply_to: row.email } : {}),
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5"><h2 style="font-weight:600;margin:0 0 12px">New trip request${id ? " #" + id : ""}</h2><table style="border-collapse:collapse">${rows}</table>` +
          (row.email ? `<p style="margin-top:18px">Reply to this email to answer ${esc(name)} directly.</p>` : wa.length > 6 ? `<p style="margin-top:18px"><a href="https://wa.me/${wa.replace(/^\+/, "")}">Open WhatsApp chat</a></p>` : "") + `</div>`,
        text: lines.filter((l) => l[1]).map((l) => `${l[0]}: ${l[1]}`).join("\n"),
      });
      mailed = true;
      if (row.email) {
        const c = COPY[lang];
        const sum = lines.slice(2, 8).filter((l) => l[1]).map((l) => `${l[0]}: ${l[1]}`).join("\n");
        await send({
          from: MAIL_FROM, to: [row.email], reply_to: NOTIFY_TO, subject: c.subject,
          html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#131A27"><p>${esc(c.hi(name))}</p><p>${esc(c.body)}</p>${sum ? `<p style="color:#667;margin-bottom:4px">${esc(c.sum)}:</p><pre style="font-family:inherit;white-space:pre-wrap;background:#F6F1EC;padding:12px 14px;border-radius:8px">${esc(sum)}</pre>` : ""}<p>${esc(c.sign)}<br><a href="https://skylandmongolia.com">skylandmongolia.com</a></p></div>`,
          text: `${c.hi(name)}\n\n${c.body}\n\n${sum}\n\n${c.sign}\nhttps://skylandmongolia.com`,
        }).catch((e) => { err = "confirm: " + String(e).slice(0, 200); });
      }
    } catch (e) { err = String(e).slice(0, 300); }
  } else err = "no_key";

  if (id) await db(`requests?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ mailed, mail_error: err || null }) });
  return json({ ok: true, id, mailed }, 200, origin);
});

// Vercel serverless function: POST /api/contact
// Delivers a founding-slot request by email (Resend) and, optionally, as a phone push (ntfy).
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   required for email. From https://resend.com/api-keys
//   CONTACT_TO       where requests are sent, e.g. you@yourdomain.com (comma-separate for several)
//   CONTACT_FROM     optional sender, e.g. "Chat Lost It <hello@chatlostit.gg>" (domain must be verified in Resend).
//                    Defaults to Resend's test sender, which only delivers to your own Resend account email.
//   NTFY_TOPIC       optional. Same kind of topic the pipeline uses; you get a push on your phone per request.
//
// At least one of email or ntfy must be configured, otherwise the form returns an error
// instead of silently dropping the request.

const LIMITS = { name: 120, email: 200, role: 60, channel: 300, hours: 30, destination: 60, message: 2000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Use POST." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, error: "The form data was empty." });
  }

  // Bots: hidden "company" field filled in, or submitted faster than a person can type.
  // Answer "ok" so they don't learn to adapt, but don't deliver anything.
  if (clean(body.company, 200) || Number(body.elapsedMs) < 2500) {
    return res.status(200).json({ ok: true });
  }

  const lead = {};
  for (const [k, max] of Object.entries(LIMITS)) lead[k] = clean(body[k], max);

  if (!lead.name) return res.status(400).json({ ok: false, error: "Add your name." });
  if (!EMAIL_RE.test(lead.email)) return res.status(400).json({ ok: false, error: "Add an email we can reply to." });
  if (!lead.channel) return res.status(400).json({ ok: false, error: "Add a link to your channel." });

  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM, NTFY_TOPIC } = process.env;
  const canEmail = Boolean(RESEND_API_KEY && CONTACT_TO);
  const canPush = Boolean(NTFY_TOPIC);
  if (!canEmail && !canPush) {
    console.error("contact: no delivery configured (set RESEND_API_KEY + CONTACT_TO, or NTFY_TOPIC)");
    return res.status(500).json({ ok: false, error: "The form isn't connected yet." });
  }

  const rows = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Role", lead.role],
    ["Channel", lead.channel],
    ["Hours live per week", lead.hours],
    ["Post clips to", lead.destination],
    ["Notes", lead.message || "(none)"],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html = `<h2 style="font-family:sans-serif">New founding-slot request</h2><table style="font-family:sans-serif;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`)
    .join("")}</table>`;

  // Without email, the function logs are the only place the contact details are kept.
  if (!canEmail) console.log("contact: new request\n" + text);

  const tasks = [];
  if (canEmail) {
    tasks.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: CONTACT_FROM || "Chat Lost It <onboarding@resend.dev>",
          to: CONTACT_TO.split(",").map((s) => s.trim()).filter(Boolean),
          reply_to: lead.email,
          subject: `Founding slot request: ${lead.name} (${lead.channel})`.slice(0, 200),
          text,
          html,
        }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
        return "email";
      })
    );
  }
  if (canPush) {
    tasks.push(
      fetch(`https://ntfy.sh/${encodeURIComponent(NTFY_TOPIC)}`, {
        method: "POST",
        headers: { Title: "New Chat Lost It signup", Tags: "rotating_light", Priority: "high" },
        // ntfy topics are readable by anyone who knows the name, so send no contact details here.
        body: `${lead.role} wants a founding slot: ${lead.channel} (${lead.hours} hrs/week). ${
          canEmail ? "Details are in your email." : "Details are in the Vercel function logs."
        }`,
      }).then((r) => {
        if (!r.ok) throw new Error(`ntfy ${r.status}`);
        return "push";
      })
    );
  }

  const results = await Promise.allSettled(tasks);
  const delivered = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  results.filter((r) => r.status === "rejected").forEach((r) => console.error("contact delivery failed:", r.reason?.message));

  // Email is where the details live. If email is configured, it has to succeed.
  if (canEmail ? !delivered.includes("email") : delivered.length === 0) {
    // Last-resort record in the Vercel function logs so the request isn't lost.
    console.error("contact: undelivered request\n" + text);
    return res.status(502).json({ ok: false, error: "We couldn't deliver it just now." });
  }
  return res.status(200).json({ ok: true });
}

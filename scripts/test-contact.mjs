// Offline test of api/contact.js: mocks req/res and fetch, no network.
import handler from "../api/contact.js";

const calls = [];
globalThis.fetch = async (url, opts) => { calls.push({ url, opts }); return { ok: true, status: 200, text: async () => "" }; };

const run = async (body, env = {}) => {
  Object.assign(process.env, { RESEND_API_KEY: "", CONTACT_TO: "", NTFY_TOPIC: "", CONTACT_FROM: "" }, env);
  calls.length = 0;
  let out = {};
  const res = { setHeader() {}, status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; } };
  await handler({ method: "POST", body }, res);
  return { ...out, calls: [...calls] };
};
const good = { name: "Test", email: "a@b.co", role: "Streamer", channel: "twitch.tv/x", hours: "10 to 25", destination: "Both", message: "<b>hi</b>", elapsedMs: 9000 };
let fail = 0;
const check = (label, cond) => { console.log((cond ? "PASS " : "FAIL ") + label); if (!cond) fail++; };

let r = await run(good, { RESEND_API_KEY: "k", CONTACT_TO: "me@x.com", NTFY_TOPIC: "t" });
check("delivers email + push", r.code === 200 && r.json.ok && r.calls.length === 2);
const mail = JSON.parse(r.calls.find((c) => c.url.includes("resend")).opts.body);
check("reply_to is the submitter", mail.reply_to === "a@b.co");
check("html is escaped", mail.html.includes("&lt;b&gt;hi&lt;/b&gt;"));
check("push carries no email address", !r.calls.find((c) => c.url.includes("ntfy")).opts.body.includes("a@b.co"));
r = await run(good);
check("no delivery configured -> 500", r.code === 500 && !r.json.ok);
r = await run({ ...good, email: "nope" }, { NTFY_TOPIC: "t" });
check("bad email -> 400", r.code === 400);
r = await run({ ...good, company: "spam inc" }, { NTFY_TOPIC: "t" });
check("honeypot -> fake ok, nothing sent", r.code === 200 && r.calls.length === 0);
r = await run({ ...good, elapsedMs: 300 }, { NTFY_TOPIC: "t" });
check("too fast -> fake ok, nothing sent", r.code === 200 && r.calls.length === 0);
globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => "forbidden" });
r = await run(good, { RESEND_API_KEY: "k", CONTACT_TO: "me@x.com" });
check("email failure -> 502", r.code === 502);
process.exit(fail ? 1 : 0);

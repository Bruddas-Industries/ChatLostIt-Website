# Chat Lost It website

Pitch page for Chat Lost It's live clipping service, with a founding-slot signup form.

- `index.html`, `styles.css`, `main.js`: the page (static, no build step). The hero animation is `main.js`.
- `api/contact.js`: Vercel serverless function behind the form. Emails each request to you via [Resend](https://resend.com) and can also push to your phone via ntfy.
- `assets/`: favicon, logo mark and social preview image (from the ChatLostIt brand kit).

## Deploy on Vercel

1. Push this folder to a new GitHub repo, then **Add New → Project** in Vercel and import it.
   Framework preset: **Other**. Leave build and output settings empty.
2. In **Settings → Environment Variables**, add:

   | Variable | Required | What it is |
   |---|---|---|
   | `RESEND_API_KEY` | yes, for email | Create at resend.com → API Keys (free tier is plenty) |
   | `CONTACT_TO` | yes, for email | Where signups go. Comma-separate for several addresses |
   | `CONTACT_FROM` | recommended | e.g. `Chat Lost It <hello@yourdomain.com>`. The domain must be verified in Resend. Without it, Resend's test sender only delivers to the email on your Resend account |
   | `NTFY_TOPIC` | optional | Phone push per signup. Contains no contact details, since ntfy topics are public to anyone who knows the name |

3. Redeploy after adding variables (Deployments → ⋯ → Redeploy).
4. Test the form on the live URL. If delivery isn't configured, the form shows an error instead of dropping the request, and undelivered requests are printed in the function logs.

## Local preview

- Page only: `python -m http.server 5173`, then open http://127.0.0.1:5173. The form will show its error state because there's no API locally.
- With the form working: `npm i -g vercel`, then `vercel dev` (reads `.env.local`).
- Endpoint tests (no network): `npm test`

## Editing the offer

The free-first-month offer appears in the hero note, the signup section and the FAQ in `index.html`. Search for "first month" to change all of them.

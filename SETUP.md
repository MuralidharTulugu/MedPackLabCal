# MedPackLabCal — Setup & Redeployment Guide

This documents everything needed to stand this app up from scratch (or redo it if the
Cloudflare/Google config is ever lost). The app itself is a single static file,
`index.html` — there is no server, database, or build step. All data (customers, quotes)
lives in a Google Sheet created automatically in each signed-in user's own Google Drive.

Current live values (July 2026):
- App URL: `https://labelcal.medpack.workers.dev`
- Google Cloud project: `openworkintegration`
- OAuth Client ID: `1063718102279-tpibkv8nsnknluaf6p51ka2umkidtic4.apps.googleusercontent.com`
- Cloudflare Worker name: `labelcal`
- Cloudflare account subdomain: `medpack` (so all workers on this account are `*.medpack.workers.dev`)
- Google Sheet auto-created per user: "MedPackLabCal Quotes" (tabs: Customers, Quotes, Templates)

---

## 1. Google Cloud Console — OAuth + APIs

The app signs users in with Google and talks to Sheets/Drive using their own token —
there is no backend and no client secret in the app.

### 1.1 Create/select a project
Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project
(or reuse an existing one). Current setup uses project `openworkintegration`.

### 1.2 Enable both required APIs
Under **APIs & Services → Library**, enable:
- **Google Sheets API** — [console.cloud.google.com/apis/library/sheets.googleapis.com](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
- **Google Drive API** — [console.cloud.google.com/apis/library/drive.googleapis.com](https://console.cloud.google.com/apis/library/drive.googleapis.com)

**Both must show "Manage" (already enabled), not "Enable."** If either is missing, sign-in
will appear to succeed (you'll see "Signed in as ...") but creating the spreadsheet will
fail with a 403 and the app will show "Init failed" — the API calls fail even though
token exchange and the client library's own initialization don't need the API to be
enabled. This exact issue happened once already (Sheets API was left disabled) — check
this first if sign-in ever breaks again.

### 1.3 Configure the OAuth consent screen
Under **APIs & Services → OAuth consent screen**:
- User type: External
- Publishing status: Testing is fine for a small internal tool (no Google verification
  review needed), but only **test users** you explicitly add can sign in while in Testing.
- Add test users: every Google account that needs to use the app (e.g.
  `kamalesh@yantravision.com`, `murali@medpackindia.com`, and anyone else at MedPack).
- Scopes: make sure these are added under Data Access:
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.file`

### 1.4 Create the OAuth Client ID
Under **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
- Application type: Web application
- Authorized JavaScript origins: the exact URL the app is served from, e.g.
  `https://labelcal.medpack.workers.dev` — no trailing slash, no path.
- No redirect URI is needed (the app uses the GIS token-client popup flow, not a
  redirect flow).
- Save the **Client ID** (not secret) and paste it into `index.html` as
  `GOOGLE_CLIENT_ID`. The client secret that Google also generates is never used by this
  app and should not be committed anywhere — it's only relevant for server-side flows.

**Whenever the app's URL changes** (new Worker name, new Cloudflare subdomain, custom
domain, etc.), the Authorized JavaScript origin here must be updated to match, or
sign-in will fail with an origin-mismatch error.

---

## 2. Cloudflare — hosting

The app is deployed as a Cloudflare Worker serving static assets, uploaded directly from
the dashboard (no GitHub connection, no build step, no `wrangler` CLI required — though
`wrangler deploy` would also work if preferred later).

### 2.1 Why not GitHub Pages / a plain public bucket
The HTML file contains proprietary costing formulas in plain view (anyone can read page
source), and the tool has no access control of its own. Cloudflare Access (below) is what
adds a login wall in front of the whole site regardless of hosting method.

### 2.2 Set the account's workers.dev subdomain
Cloudflare gives every account one shared `*.workers.dev` subdomain for all Workers on
that account. Ours is `medpack` (changed once from an auto-generated one). To view/change
it: **Workers & Pages → (any worker) → Settings**, or account-level Workers settings →
"Change account subdomain." Changing this changes the URL of every Worker on the account.

### 2.3 Deploy / redeploy the Worker
1. Cloudflare dashboard → **Workers & Pages** → click the **labelcal** worker (or
   **Create application → Workers** if starting fresh, then name it `labelcal`).
2. Click **New deployment** (top right of the worker's Overview tab).
3. On the "Upload static files to update your Worker" screen, drag in (or browse to)
   the current `index.html`.
4. Click **Deploy**.

This uploader only accepts static assets (HTML/CSS/JS) — that's all this app needs.
There is no separate build step; whatever `index.html` contains is exactly what goes live.

### 2.4 Gate it with Cloudflare Access (Zero Trust)
Hosting alone doesn't add a login wall — anyone with the URL could open the raw page
without Access. Zero Trust Free covers this at no cost up to 50 authenticated users.

1. Cloudflare dashboard → **Zero Trust** → **Access → Applications → Add an application**.
2. Application type: **Self-hosted**.
3. Application destination type: **Workers** (not "Private destinations" — this matters,
   since the app is a Worker on the shared `workers.dev` domain, not a custom zone).
4. Destination: `labelcal.medpack.workers.dev`.
5. Add a policy, e.g. "Allow": rule type **Emails ending in** → `@medpackindia.com`
   (and/or **Emails** → specific addresses like `kamalesh@yantravision.com` for anyone
   outside that domain who also needs access — email rules can be combined with OR).
6. Save. Anyone hitting the URL now first sees Cloudflare's own login prompt (Google SSO,
   email OTP, etc., depending on what identity providers are configured) before ever
   reaching the app's HTML.

**Whenever the Worker's URL changes**, update this application's destination to match —
otherwise either the old URL stays gated with nothing behind it, or the new URL is
briefly exposed with no gate at all. Update this and the Google OAuth origin (1.4)
together.

---

## 3. Redeploying after a code change

Every time `index.html` is edited:
1. Re-upload it via **2.3** above (Workers & Pages → labelcal → New deployment → drop the
   file → Deploy).
2. No changes are normally needed on the Google Cloud or Access side unless the URL
   itself changed.
3. Hard-refresh the app in the browser to pick up the new version (Cloudflare's edge
   cache for Worker assets is normally near-instant, but a hard refresh avoids any local
   browser cache confusion).

---

## 4. How data storage works (no database to manage)

There is no shared backend database. On first successful sign-in, the app looks for a
Google Sheet named **"MedPackLabCal Quotes"** in the signed-in user's own Google Drive
and creates it if missing, with three tabs: `Customers`, `Quotes`, `Templates`. Because
each user signs in with their own Google account and the app only ever touches that
user's own Drive (via the `drive.file` scope, which limits the app to files it created
itself), data is naturally isolated per person — Murali's data stays in Murali's Drive,
Kamalesh's in Kamalesh's, with nothing to configure for that separation.

---

## 5. Known gotchas (already hit once each — check these first if something breaks)

- **"Init failed" after sign-in succeeds** → almost always the Sheets API or Drive API
  not being enabled on the Google Cloud project (see 1.2). Confirm both show "Manage,"
  not "Enable," in the API Library.
- **Sign-in button invisible / nothing happens on click** → check `index.html` for a
  stray inline `style="display:none"` on `#signInBtn` — the show/hide logic only toggles
  a CSS class, and an inline style will silently win over that every time.
- **Origin mismatch error on sign-in** → the Google OAuth Client's Authorized JavaScript
  Origins (1.4) doesn't match the current URL exactly (scheme + host, no trailing slash).
- **Google Cloud Console "excessive automated requests" warning / gstatic blocked** →
  happens if the Console is scripted/automated too aggressively in a short window; wait
  a few minutes and do the remaining steps manually in the Console UI.
- **Access gate protecting the old URL only** → after renaming the Worker or the account
  subdomain, remember to update both the Access application's destination (2.4) and the
  Google OAuth origin (1.4) to the new URL — they don't update themselves.

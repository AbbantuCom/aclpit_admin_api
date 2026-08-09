# ACLPIT Admin & Content API

Admin panel and content API backend for the **African Centre for Law and Public Interest Technology (ACLPIT)**. This repo has no public-facing pages of its own — the public website lives in a **separate** Next.js repo that consumes this repo's content API (`/api/content/[section]`) and contact form endpoint (`/api/contact`) over HTTP. Visiting the root of this app (`/`) redirects straight to `/auth`.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Content Sections](#content-sections)
4. [Prerequisites](#prerequisites)
5. [Environment Variables](#environment-variables)
6. [First-Time Setup](#first-time-setup)
7. [Running the App](#running-the-app)
8. [Admin Panel Guide](#admin-panel-guide)
9. [Public Content API](#public-content-api)
10. [User & Access Management](#user--access-management)
11. [Media Uploads](#media-uploads)
12. [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | MongoDB Atlas |
| Auth | Built-in — email/username + password (`bcryptjs`), no third party |
| Session | Signed JWT in an httpOnly cookie (`jose`) |
| Transactional email | Resend (invitations, password resets) |
| File Storage | Cloudflare R2 |
| Client-side data | TanStack React Query |

---

## Project Structure

```
aclpit_admin_api/
├── app/
│   ├── page.tsx               ← Redirects to /auth (no public site here)
│   ├── auth/                   ← Sign in, first-time setup, password reset,
│   │                              invitation acceptance
│   ├── admin/                  ← Protected CMS panel
│   │   ├── page.tsx            ← Dashboard
│   │   ├── hero/
│   │   ├── about/
│   │   ├── services/
│   │   ├── practice-areas/
│   │   ├── publications/
│   │   ├── dialogues/
│   │   ├── contact/
│   │   ├── media/              ← Media library
│   │   ├── messages/           ← Contact form submissions inbox
│   │   └── users/               ← Invite admins, manage roles
│   └── api/                     ← REST endpoints
│       ├── auth/register/       ← One-time super admin bootstrap
│       ├── auth/login/          ← Email-or-username + password → session cookie
│       ├── auth/logout/         ← Clear the session cookie
│       ├── auth/me/             ← Current signed-in user
│       ├── auth/status/         ← Whether first-time setup is still needed
│       ├── auth/forgot-password/ ← Request a reset link
│       ├── auth/reset-password/  ← Validate token (GET) / set password (POST)
│       ├── auth/accept-invite/   ← Validate invite (GET) / activate account (POST)
│       ├── auth/dev-reset/       ← Dev-only: wipe users so setup can rerun
│       ├── content/[section]    ← GET (public, CORS-enabled) / PUT (admin) site content
│       ├── content/seed/        ← Seed default content
│       ├── contact/             ← POST (public, CORS-enabled) contact form submissions
│       ├── documents/presign/   ← Presigned PDF upload (publications)
│       ├── upload/               ← Presigned image/video upload (media library)
│       ├── media/                ← Media library listing
│       └── users/                ← List / invite / remove members, transfer role
├── components/
│   ├── admin/                   ← CMS UI components and section editors
│   └── auth/AuthShell.tsx       ← Shared branded shell for the /auth screens
├── lib/
│   ├── mongodb.ts               ← MongoDB connection (lazy)
│   ├── session.ts               ← Session cookie + requireRole() route guard
│   ├── password.ts              ← bcrypt hashing + password policy
│   ├── users.ts                 ← Unique-index setup for users
│   ├── validation.ts            ← Email/username normalisation and checks
│   ├── email.ts                 ← Resend wrapper + templates (dev console fallback)
│   ├── auth-context.tsx         ← React auth context
│   ├── r2.ts                    ← Cloudflare R2 client
│   ├── cors.ts                  ← CORS helper for public API routes
│   └── seed-data.ts             ← Default content for all sections
├── types/index.ts                ← Shared TypeScript types
├── proxy.ts                      ← Route protection (Next.js 16 proxy)
└── .env.local.example            ← Template for environment variables
```

---

## Content Sections

The content API stores one document per section in the `content` MongoDB collection, each shaped as `{ section, data, updatedAt, updatedBy }`. Current sections (see `types/index.ts` for the full field shapes):

| Section | Shape | Description |
|---|---|---|
| `hero` | object | Kicker, title + highlighted phrase, description, CTA buttons, hero image, vision badge |
| `about` | object | Home preview text/image, background & rationale, vision & mission, objectives, governance, stakeholders |
| `services` | array | Service cards — icon, anchor, title, description, bullet points, image |
| `practiceAreas` | array | The Centre's six practice-area pillars — icon, anchor, title, description, bullet points |
| `publications` | array | Research reports / policy briefs — title, description, category, PDF file URL, cover image, date |
| `dialogues` | array | Legal Tech Dialogues video entries — YouTube URL, title, description, category |
| `contact` | object | Section text, email, phone, address, postal address, office hours, map embed URL, socials, enquiry topics |
| `footer` | object | Footer brand description and copyright organisation name |

---

## Prerequisites

- **Node.js** ≥ 18 (v24 recommended)
- **npm** ≥ 9
- A **MongoDB Atlas** cluster (free tier works fine)
- A **Resend** account and verified sending domain — optional in local development, where unsent emails are logged to the console instead
- A **Cloudflare R2** bucket (see `CLOUDFLARE_R2_SETUP.md`)
- The **public client repo** deployed somewhere, if you want CORS and cache revalidation to work end to end

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

### MongoDB

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
```

### App URL

Used to build the links inside invitation and password-reset emails, so it must
be reachable by the recipient. Locally, set it to the port this app actually
runs on (often `3001` if the public client site already uses `3000`).

```env
APP_URL=http://localhost:3001
```

### Session & Reset Secrets

Any long random strings (at least 32 characters):

```env
SESSION_SECRET=some-very-long-random-string-change-this-now
RESET_SECRET=another-long-random-string-change-this-too
```

- **`SESSION_SECRET`** signs the httpOnly session cookie. **Required** — the app throws if it is missing. Changing it invalidates every existing session.
- **`RESET_SECRET`** guards `/api/auth/dev-reset`, which wipes the users, invitations and password-reset collections so first-time setup can be run again. The route refuses to run when `NODE_ENV=production`.

### Email (Resend)

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=ACLPIT Admin <no-reply@aclpit.org>
```

`EMAIL_FROM` must be on a domain verified in Resend.

> **Local development:** if `RESEND_API_KEY` is unset, nothing breaks — the email
> is printed to the server console instead, **including the invite / reset link**,
> so both flows stay fully testable without configuring a mail provider.

### Cloudflare R2 (media storage)

See `CLOUDFLARE_R2_SETUP.md` for how to create these:

```env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=aclpit-media
R2_PUBLIC_URL=https://media.aclpit.org
```

### Public Client Site Integration

```env
CLIENT_URL=https://aclpit.org
CLIENT_ORIGIN=https://aclpit.org
REVALIDATE_SECRET=another-long-random-string-shared-with-the-client-repo
```

- **`CLIENT_URL`** — base URL of the public client site. After a content section is saved, this app POSTs to `${CLIENT_URL}/api/revalidate` so the client site can drop its cache for that section. If unreachable, the failure is logged (`console.warn`) and does not affect the save.
- **`CLIENT_ORIGIN`** — comma-separated list of origins allowed to call the public endpoints (`GET /api/content/[section]`, `POST /api/contact`) cross-origin, e.g. `https://aclpit.org,https://staging.aclpit.org`.
- **`REVALIDATE_SECRET`** — shared secret sent in the revalidate webhook body; the client repo's `/api/revalidate` route should verify it matches before clearing its cache.

---

## First-Time Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Follow the [Environment Variables](#environment-variables) section above.

### 3. Seed default content

Start the dev server, then make a one-time POST request to populate MongoDB with the default ACLPIT content:

```bash
curl -X POST http://localhost:3000/api/content/seed
```

This only inserts sections that **don't already exist** — it is safe to run more than once.

### 4. Create the Super Admin account

Go to `/auth`. Because the database has no users yet, the page shows a first-time
setup form — choose an email, username and password to create the **one and only**
Super Admin account.

This route closes permanently once any account exists: `/api/auth/register` returns
403 from then on, so the Super Admin cannot be re-registered and everyone else must
be invited from **Admin → Users**.

---

## Running the App

```bash
npm run dev      # Development (hot reload)
npm run build    # Production build
npm start        # Start production server
```

The app runs on **http://localhost:3000** by default.

| URL | Purpose |
|---|---|
| `http://localhost:3000/auth` | Admin sign-in page |
| `http://localhost:3000/admin` | CMS dashboard |

---

## Admin Panel Guide

1. Go to `/auth` and sign in with your **email address or username** and password
2. You are redirected to `/admin`
3. Pick a section from the sidebar or dashboard
4. Edit the fields directly in the form and click **Save Changes**

Forgot your password? Use the link on the sign-in page — you will receive a reset
link that is valid for one hour and can only be used once.

Saving a section writes to MongoDB immediately and (if `CLIENT_URL` is configured) tells the public client site to revalidate its cache for that section.

Card-list sections (**Services**, **Practice Areas**, **Publications**, **Dialogues**) support add / remove / reorder — use the **▲ / ▼** arrows to move a card up or down, then **Save Changes** to persist the new order.

---

## Public Content API

The separate public client repo reads content from this API — no authentication required for these two routes, but cross-origin requests are only allowed from origins listed in `CLIENT_ORIGIN`:

- **`GET /api/content/:section`** → `{ section, data, updatedAt, updatedBy }` (or `{ data: null }` if unseeded)
- **`POST /api/contact`** → accepts `{ name, email, subject, message }`, stores the submission for the **Messages** inbox

Every other route is authenticated by the **httpOnly session cookie**, which the
browser sends automatically on same-origin requests. There is no bearer token to
manage: `PUT /api/content/:section` and all the admin routes simply require a
valid session belonging to an active account with a sufficient role.

---

## User & Access Management

Navigate to **Admin → Users** (`/admin/users`).

### Roles

| Role | Content, media & messages | Invite members | Remove members / transfer role |
|---|:---:|:---:|:---:|
| **Super Admin** | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | — |
| **Staff** | ✅ | — | — |

There is **exactly one Super Admin** at all times. The role is created once during
first-time setup and can only move via **Transfer Super Admin Role**, which demotes
the current holder to Admin in the same operation. It cannot be granted by
invitation, and the Super Admin account cannot be deleted.

Staff never see the Users screen — it is hidden from the sidebar and dashboard,
`proxy.ts` redirects them away from `/admin/users`, and the user-management API
routes reject them with 403.

### Inviting

Enter an email address and pick **Staff** or **Admin**. Resend delivers an
invitation link (valid 7 days) where the invitee chooses their own username and
password; accepting signs them straight in. If the email fails to send, the
invitation is still valid and the UI shows the link so it can be shared manually.

Only the Super Admin can revoke pending invitations, remove members, or transfer
the role.

### Sessions

Sessions last 7 days, but the signed-in user is re-read from the database on
**every request** — so removing someone, or changing their role, takes effect
immediately rather than when their cookie expires.

---

## Media Uploads

Every image field in the CMS supports two methods:

- **Upload a file** — PNG, JPG, WebP, max 10 MB, uploaded to Cloudflare R2 via a presigned URL
- **Paste a URL** — any publicly accessible image URL

**Publications** additionally support PDF uploads (max 20 MB) or an external link, via a separate presigned-upload route (`/api/documents/presign`) that stores files as-is without the image/video processing pipeline.

---

## Deployment

### Vercel (recommended)

1. Push the project to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local` in the Vercel dashboard (Project → Settings → Environment Variables)
4. Deploy — Vercel automatically runs `npm run build`

### Any Node.js host (Railway, Render, VPS)

```bash
npm run build
npm start          # starts on port 3000 by default
```

Set all environment variables on the hosting platform before starting.

### After deploying

1. Run the seed endpoint once: `curl -X POST https://your-domain.com/api/content/seed`
2. Visit `https://your-domain.com/auth` and create the Super Admin account
3. Invite any additional admins via **Admin → Users**
4. Point the public client repo's `CLIENT_URL`/API base at this deployment, and set `CLIENT_ORIGIN` here to the client's deployed origin(s)

---

## Security Notes

- `SESSION_SECRET`, `RESET_SECRET`, `RESEND_API_KEY` and `REVALIDATE_SECRET` must **never** be committed to git — `.env.local` is gitignored by default.
- **Passwords** are hashed with bcrypt (cost 12) and never leave the server: every API response is passed through `toPublicUser()`, which strips `passwordHash`.
- **Sessions** are a signed JWT in an `httpOnly`, `sameSite: lax` cookie (`secure` in production). Because it is `httpOnly`, JavaScript — including injected scripts — cannot read it.
- The session is **re-validated against the database on every request**, so a removed or demoted account loses access immediately instead of when its cookie expires.
- **Password reset tokens** are stored only as SHA-256 hashes, expire after 1 hour, and are single-use — the raw token exists only in the email, so database access alone cannot reset anyone's password.
- **Login and password reset do not reveal whether an account exists**: wrong password, unknown username and unknown email all return the same message.
- `GET /api/content/[section]` and `POST /api/contact` allow cross-origin requests only from origins listed in `CLIENT_ORIGIN`; every other API route is same-origin and session-authenticated.
- Self-registration is only possible when **zero** accounts exist. Once the Super Admin is created, everyone else must be invited.

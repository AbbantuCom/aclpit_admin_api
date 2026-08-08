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
| Auth | Firebase Authentication (Google Sign-In) |
| File Storage | Cloudflare R2 |
| Session | Signed JWT cookie (`jose`) |
| Client-side data | TanStack React Query |

---

## Project Structure

```
aclpit_admin_api/
├── app/
│   ├── page.tsx               ← Redirects to /auth (no public site here)
│   ├── auth/page.tsx           ← Google sign-in / invitation acceptance
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
│       ├── auth/verify/         ← Verify Firebase token, issue session cookie
│       ├── content/[section]    ← GET (public, CORS-enabled) / PUT (admin) site content
│       ├── content/seed/        ← Seed default content
│       ├── contact/             ← POST (public, CORS-enabled) contact form submissions
│       ├── documents/presign/   ← Presigned PDF upload (publications)
│       ├── upload/               ← Presigned image/video upload (media library)
│       ├── media/                ← Media library listing
│       ├── users/                ← List / invite / remove admins, transfer role
│       └── auth/reset/           ← Emergency admin roster reset
├── components/
│   └── admin/                   ← CMS UI components and section editors
├── lib/
│   ├── mongodb.ts               ← MongoDB connection (lazy)
│   ├── firebase.ts              ← Firebase client SDK (lazy, browser-only)
│   ├── firebase-admin.ts        ← Firebase Admin SDK (server-only)
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
- A **Firebase** project with:
  - Google Sign-In enabled (Authentication → Sign-in method → Google)
  - A service account key downloaded (Project Settings → Service Accounts → Generate new private key)
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

### Firebase (Client — public, used in the browser)

Get these from **Firebase Console → Project Settings → General → Your apps → Web app config**:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Firebase Admin (Server — private, never exposed to the browser)

Get these from **Firebase Console → Project Settings → Service Accounts → Generate new private key** (downloads a JSON file):

```env
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> **Important:** Keep the quotes around the private key and preserve the literal `\n` characters exactly as they appear in the JSON file.

### Session & Reset Secrets

Any long random strings (at least 32 characters):

```env
SESSION_SECRET=some-very-long-random-string-change-this-now
RESET_SECRET=another-long-random-string-change-this-too
```

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

Go to `http://localhost:3000/auth`. Because the database has no users yet, the page shows a first-time setup banner — sign in with Google to create the first Super Admin account automatically. This only works once; after that, new admins must be invited from **Admin → Users**.

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

1. Go to `/auth` and sign in with an authorised Google account
2. You are redirected to `/admin`
3. Pick a section from the sidebar or dashboard
4. Edit the fields directly in the form and click **Save Changes**

Saving a section writes to MongoDB immediately and (if `CLIENT_URL` is configured) tells the public client site to revalidate its cache for that section.

Card-list sections (**Services**, **Practice Areas**, **Publications**, **Dialogues**) support add / remove / reorder — use the **▲ / ▼** arrows to move a card up or down, then **Save Changes** to persist the new order.

---

## Public Content API

The separate public client repo reads content from this API — no authentication required for these two routes, but cross-origin requests are only allowed from origins listed in `CLIENT_ORIGIN`:

- **`GET /api/content/:section`** → `{ section, data, updatedAt, updatedBy }` (or `{ data: null }` if unseeded)
- **`POST /api/contact`** → accepts `{ name, email, subject, message }`, stores the submission for the **Messages** inbox

Editing content (`PUT /api/content/:section`) requires a valid Firebase ID token for an active admin — that's what the admin panel's editors use.

---

## User & Access Management

Navigate to **Admin → Users** (`/admin/users`).

| Role | Permissions |
|---|---|
| **Super Admin** | Edit all content, invite admins, remove admins, transfer super admin role |
| **Admin** | Edit all content, invite admins |

Invite a new admin by entering their Google account email — they get a link (expires in 7 days) that grants access on sign-in. Only the super admin can revoke pending invitations, remove other admins, or transfer the super admin role.

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

- `FIREBASE_PRIVATE_KEY`, `SESSION_SECRET`, `RESET_SECRET`, and `REVALIDATE_SECRET` must **never** be committed to git — `.env.local` is gitignored by default.
- All admin API routes verify the Firebase ID token on every request — the session cookie alone is not enough to mutate data.
- Session cookies are `httpOnly`, `sameSite: lax`, and `secure` in production.
- `GET /api/content/[section]` and `POST /api/contact` allow cross-origin requests only from origins listed in `CLIENT_ORIGIN`; all other API routes are same-origin / token-authenticated.
- Self-registration is only possible when **zero** admin accounts exist. Once the Super Admin is created, all new admins must be invited.

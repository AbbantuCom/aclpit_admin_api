# AgriVerde Solutions — CMS & Website

A full-stack Next.js 16 website with a built-in content management system (CMS). The public-facing site is a one-page agricultural company site; the admin panel (`/admin`) lets authorised users edit every section of the site — text, images, stats, cards — without touching code.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Environment Variables](#environment-variables)
5. [First-Time Setup](#first-time-setup)
6. [Running the App](#running-the-app)
7. [Admin Panel Guide](#admin-panel-guide)
8. [User & Access Management](#user--access-management)
9. [Image Uploads](#image-uploads)
10. [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | MongoDB Atlas |
| Auth | Firebase Authentication (Google Sign-In) |
| File Storage | Firebase Storage |
| Session | Signed JWT cookie (`jose`) |

---

## Project Structure

```
agric_convert_to_react/
├── app/
│   ├── page.tsx              ← Public homepage (fetches from MongoDB)
│   ├── auth/page.tsx         ← Google sign-in / invitation acceptance
│   ├── admin/                ← Protected CMS panel
│   │   ├── page.tsx          ← Dashboard
│   │   ├── hero/
│   │   ├── about/
│   │   ├── services/
│   │   ├── equipment/
│   │   ├── impact/
│   │   ├── projects/
│   │   ├── sustainability/
│   │   ├── contact/
│   │   └── users/            ← Invite admins, manage roles
│   └── api/                  ← REST endpoints
│       ├── auth/verify/      ← Verify Firebase token, issue session cookie
│       ├── content/[section] ← GET/PUT site content
│       ├── content/seed/     ← Seed default content
│       ├── users/            ← List admins
│       ├── users/invite/     ← Create / revoke invitations
│       ├── users/[uid]/      ← Remove an admin
│       └── users/transfer/   ← Transfer super admin role
├── components/
│   ├── public/               ← Public site sections (Navbar, Hero, etc.)
│   └── admin/                ← CMS UI components and section editors
├── lib/
│   ├── mongodb.ts            ← MongoDB connection (lazy)
│   ├── firebase.ts           ← Firebase client SDK (lazy, browser-only)
│   ├── firebase-admin.ts     ← Firebase Admin SDK (server-only)
│   ├── auth-context.tsx      ← React auth context
│   └── seed-data.ts          ← Default content for all sections
├── types/index.ts            ← Shared TypeScript types
├── proxy.ts                  ← Route protection (Next.js 16 proxy)
└── .env.local.example        ← Template for environment variables
```

---

## Prerequisites

- **Node.js** ≥ 18 (v24 recommended)
- **npm** ≥ 9
- A **MongoDB Atlas** cluster (free tier works fine)
- A **Firebase** project with:
  - Google Sign-In enabled (Authentication → Sign-in method → Google)
  - A Firebase Storage bucket enabled
  - A service account key downloaded (Project Settings → Service Accounts → Generate new private key)

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and set the following:

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

### Session Secret

Any long random string (at least 32 characters):

```env
SESSION_SECRET=some-very-long-random-string-change-this-now
```

---

## First-Time Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Follow the [Environment Variables](#environment-variables) section above.

### 3. Seed default content

Start the dev server, then make a one-time POST request to populate MongoDB with the default website content:

```bash
# In a second terminal (while dev server is running):
curl -X POST http://localhost:3000/api/content/seed
```

Or open your browser to `http://localhost:3000/api/content/seed` and use a REST client (Postman, Insomnia, etc.) to POST.

This only inserts sections that **don't already exist** — it is safe to run more than once.

### 4. Create the Super Admin account

No manual database work is required. The system detects when no admins exist yet and guides you through self-registration automatically.

**Step 1 — Visit the login page**

Go to `http://localhost:3000/auth`. Because the database has no users yet, the page shows a first-time setup banner:

> **"Welcome — no admins yet"**
> Sign in with your Google account to create the first Super Admin account.
> This only works once — after that, new admins must be invited.

**Step 2 — Click "Create Super Admin account with Google"**

A Google OAuth popup opens. Sign in with the Google account you want to use as the Super Admin.

**Step 3 — You are redirected to `/admin`**

Your account is created automatically with the `super_admin` role. No invitation, no manual DB step.

> **This self-registration only works when zero admin accounts exist.** Once the first Super Admin is created, all subsequent users must be invited via the Users page. Anyone who tries to sign in without an invitation is denied access.

---

## Running the App

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

The app runs on **http://localhost:3000** by default.

| URL | Purpose |
|---|---|
| `http://localhost:3000` | Public website |
| `http://localhost:3000/auth` | Admin sign-in page |
| `http://localhost:3000/admin` | CMS dashboard |

---

## Admin Panel Guide

### Accessing the panel

1. Go to `/auth`
2. Click **Continue with Google** and sign in with your authorised Google account
3. You are redirected to `/admin`

### Editing a section

1. Click any section card on the dashboard (or use the sidebar)
2. Edit the fields directly in the form
3. Click **Save Changes**
4. The live website updates within 60 seconds (ISR cache) — or immediately on hard refresh

### Section editors

| Section | What you can edit |
|---|---|
| **Hero** | Tagline, main title, description, CTA button text & links, background video URL, poster image, stats bar |
| **About** | Label, title, two paragraphs, badge text, main image, thumbnail image, four feature pillars |
| **Services** | Add / remove / reorder service cards; each card has a title, description, and image |
| **Equipment** | Add / remove / reorder equipment items; mark one as "featured" (large card) |
| **Impact Stats** | Background image, animated counter stats (target number + label) |
| **Projects** | Add / remove / reorder project cards; each has a title, description, category tag, and image |
| **Sustainability** | Label, title, description, sustainability items list, two side images, SDG badge text |
| **Contact** | Section title, WhatsApp number, email address, physical address, contact image |

### Reordering cards (Services, Equipment, Projects)

Use the **▲ / ▼** arrows on the left of each card row to move items up or down. Click **Save Changes** to persist the new order.

---

## User & Access Management

Navigate to **Admin → Users** (`/admin/users`).

### Roles

| Role | Permissions |
|---|---|
| **Super Admin** | Edit all content, invite admins, remove admins, transfer super admin role |
| **Admin** | Edit all content, invite admins |

### Inviting a new admin

1. Enter the person's Google account email in the **Invite a New Admin** box
2. Click **Send Invite**
3. Copy the invitation link that appears and send it to the person (email, WhatsApp, etc.)
4. The link expires in **7 days**
5. The person opens the link, clicks **Continue with Google**, and signs in — they automatically get admin access

> The invitation link looks like: `https://your-site.com/auth?invite=<token>`

### Revoking a pending invitation

Only the super admin can revoke pending invitations. Click **Revoke** next to the invitation in the **Pending Invitations** list.

### Removing an admin

Only the super admin can remove other admins. Click **Remove** next to the user in the **Admin Users** list.

### Transferring the super admin role

> **Warning:** This cannot be undone without the cooperation of the new super admin.

1. Go to **Admin → Users**
2. Scroll to **Transfer Super Admin Role**
3. Select the admin you want to promote from the dropdown
4. Click **Transfer**
5. You become a regular admin; the selected person becomes super admin

---

## Image Uploads

Every image field in the CMS supports two methods:

**Method 1 — Upload a file**
- Click the upload area or drag and drop an image file (PNG, JPG, WebP — max 10 MB)
- The file is uploaded directly to **Firebase Storage**
- The public download URL is saved automatically

**Method 2 — Paste a URL**
- Paste any publicly accessible image URL into the text field below the upload area
- Useful for Pexels, Unsplash, or images already hosted elsewhere

To remove an image, click the **✕** button on the image preview.

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

1. Run the seed endpoint once to populate default content:
   ```bash
   curl -X POST https://your-domain.com/api/content/seed
   ```
2. Visit `https://your-domain.com/auth` — the page detects no admins exist and shows the first-time setup screen.
3. Click **"Create Super Admin account with Google"** and sign in. Your account is created automatically as Super Admin.
4. From the admin panel, invite any additional admins via **Admin → Users**.

---

## Security Notes

- The `FIREBASE_PRIVATE_KEY` and `SESSION_SECRET` must **never** be committed to git. The `.env.local` file is already listed in `.gitignore` by default with Next.js.
- All admin API routes verify the Firebase ID token on every request — the session cookie alone is not enough to mutate data.
- Session cookies are `httpOnly`, `sameSite: lax`, and `secure` in production.
- Self-registration is only possible when **zero** admin accounts exist. Once the Super Admin is created, all new admins must be invited.

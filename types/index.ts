// ─── User / Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'staff';

/** Roles allowed to manage people (invite, remove, transfer). Staff cannot. */
export const USER_MANAGEMENT_ROLES: readonly UserRole[] = ['super_admin', 'admin'];

/**
 * How many super admins may exist at once.
 *
 * Two, so the role is never a single point of failure — if one person is away or
 * leaves, the other can still promote, demote and remove people. Promotion beyond
 * this cap is refused rather than queued.
 */
export const MAX_SUPER_ADMINS = 2;

/** Roles allowed to edit site content, media and messages. */
export const CONTENT_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'staff'];

/**
 * An admin-panel account. `passwordHash` is server-only and must never be
 * returned by an API route — use PublicAdminUser for anything client-facing.
 */
export interface AdminUser {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  invitedBy?: string;
  createdAt: string;
  status: 'active' | 'pending' | 'deactivated';
  emailVerified: boolean;
  lastLoginAt?: string;
}

/** AdminUser minus the credential fields — safe to send to the browser. */
export type PublicAdminUser = Omit<AdminUser, 'passwordHash'>;

export interface Invitation {
  _id?: string;
  email: string;
  token: string;
  role: UserRole;
  invitedBy: string;
  invitedByEmail: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

/** Single-use password reset token, stored hashed alongside its expiry. */
export interface PasswordResetToken {
  _id?: string;
  uid: string;
  email: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

/** Payload encoded into the signed session cookie. */
export interface SessionPayload {
  uid: string;
  role: UserRole;
}

// ─── Site Content ─────────────────────────────────────────────────────────────

export interface HeroContent {
  kicker: string;
  title: string;
  titleHighlight: string;
  description: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  image: string;
  visionLabel: string;
  visionText: string;
}

export interface AboutObjective {
  icon: string;
  title: string;
  description: string;
}

export interface AboutStakeholder {
  icon: string;
  title: string;
  description: string;
}

export interface AboutContent {
  eyebrow: string;
  title: string;
  paragraph1: string;
  paragraph2: string;
  image: string;

  backgroundEyebrow: string;
  backgroundTitle: string;
  backgroundParagraph1: string;
  backgroundParagraph2: string;
  backgroundParagraph3: string;
  backgroundImage: string;

  visionText: string;
  missionText: string;

  objectives: AboutObjective[];

  governanceEyebrow: string;
  governanceTitle: string;
  governanceParagraph1: string;
  governanceParagraph2: string;
  governanceValues: string[];
  governanceImage: string;

  stakeholders: AboutStakeholder[];

  /**
   * The company profile PDF. The About page shows its "Download Company
   * Profile" button only when this is set; empty or missing means no button.
   */
  companyProfileUrl?: string;
}

export interface ServiceItem {
  id: string;
  anchor: string;
  icon: string;
  title: string;
  description: string;
  bullets: string[];
  image: string;
  imageAlt: string;
  order: number;
}

export interface PracticeArea {
  id: string;
  anchor: string;
  icon: string;
  title: string;
  description: string;
  bullets: string[];
  order: number;
}

/**
 * A person on the Team page.
 *
 * `order` is the hierarchy — the sequence leadership appears in, set by dragging
 * rows in the admin rather than typed by hand. `featured` picks the handful shown
 * on the home page; everyone appears on /team regardless.
 */
export interface TeamMember {
  id: string;
  name: string;
  title: string;
  bio: string;
  image: string;
  email: string;
  linkedin: string;
  featured: boolean;
  order: number;
  /**
   * Whether this person appears anywhere on the public site. Optional because
   * members saved before this switch existed have no value — those count as
   * enabled, so adding the switch never hides anyone who was already shown.
   */
  enabled?: boolean;
}

/**
 * The categories of Resources entry, in the order the site's tabs list them.
 * Each has its own page (/resources/<category>); a tab only appears once its
 * category has something in it.
 */
export const NEWS_CATEGORIES = ['research', 'annual-reports', 'news', 'events', 'newsletter', 'stories'] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  research: 'Research Reports and Policy Briefs',
  'annual-reports': 'Annual Reports',
  news: 'News',
  events: 'Events',
  newsletter: 'Newsletter',
  stories: 'Our Stories',
};

/**
 * The category an entry is filed under. Entries saved before categories
 * existed have none — those count as News, so nothing already live vanishes.
 */
export function newsCategoryOf(item: { newsCategory?: string }): NewsCategory {
  return (NEWS_CATEGORIES as readonly string[]).includes(item.newsCategory ?? '')
    ? (item.newsCategory as NewsCategory)
    : 'news';
}

/** A Resources entry (stored under the `publications` content section). */
export interface PublicationItem {
  id: string;
  title: string;
  description: string;
  /** One of NEWS_CATEGORIES — decides which tab and menu entry of the site lists it. */
  newsCategory?: NewsCategory;
  /** Free-text tag shown on the card, e.g. "Policy Brief". */
  category: string;
  fileUrl: string;
  coverImage: string;
  date: string;
  order: number;
  /**
   * Whether the publication appears on the public site. Optional because items
   * saved before this switch existed have no value — those count as enabled, so
   * adding the switch never hides anything that was already live.
   */
  enabled?: boolean;
}

/**
 * Where a Resources entry can be shared from the website, in button order.
 * Which of these appear is chosen in the dashboard (Resources → sharing).
 */
export const SHARE_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: 'bi-facebook' },
  { key: 'x', label: 'X (Twitter)', icon: 'bi-twitter-x' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'bi-linkedin' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'bi-whatsapp' },
  { key: 'telegram', label: 'Telegram', icon: 'bi-telegram' },
  { key: 'reddit', label: 'Reddit', icon: 'bi-reddit' },
  { key: 'threads', label: 'Threads', icon: 'bi-threads' },
  { key: 'bluesky', label: 'Bluesky', icon: 'bi-bluesky' },
  { key: 'email', label: 'Email', icon: 'bi-envelope' },
  { key: 'copy', label: 'Copy link', icon: 'bi-link-45deg' },
] as const;

export type SharePlatformKey = (typeof SHARE_PLATFORMS)[number]['key'];

/** Offered until an editor picks their own. */
export const DEFAULT_SHARE_PLATFORMS: SharePlatformKey[] = ['facebook', 'x', 'linkedin', 'whatsapp', 'email', 'copy'];

/** Keeps only known platforms, in button order; anything else falls back to the defaults. */
export function sharePlatformsOf(value: unknown): SharePlatformKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_SHARE_PLATFORMS];
  return SHARE_PLATFORMS.map((p) => p.key).filter((k) => value.includes(k));
}

/**
 * Site-wide switches, stored as the `settings` content doc. Unlike editorial
 * sections these take effect the moment they are flipped — there is no draft.
 */
export interface SiteSettings {
  /** Whether the Resources pages are live and linked from the main menu. */
  publicationsEnabled: boolean;
  /** Whether the Legal Tech Dialogues page is live and linked from the main menu. */
  dialoguesEnabled: boolean;
  /**
   * Whether the Services page shows each item's image beside it. Off — or no
   * item has an image — lays the items out as icon cards, like Programs.
   * Optional because settings saved before this switch existed have no value;
   * those count as on, which is how the page looked then.
   */
  servicesImagesEnabled?: boolean;
  /** Whether Resources entries show share buttons. Missing counts as off. */
  publicationSharingEnabled?: boolean;
  /** Which share buttons appear when sharing is on. Missing → DEFAULT_SHARE_PLATFORMS. */
  publicationSharePlatforms?: SharePlatformKey[];
}

/** The on/off settings — every SiteSettings key except the platform list. */
export type BooleanSettingKey = Exclude<keyof SiteSettings, 'publicationSharePlatforms'>;

export interface DialogueItem {
  id: string;
  youtubeUrl: string;
  title: string;
  description: string;
  category: string;
  order: number;
}

/** Kinds of position a job posting can be, in the order the dashboard lists them. */
export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Consultancy', 'Internship', 'Fellowship', 'Volunteer'] as const;

/** One vacancy on the Careers page. */
export interface JobPosting {
  id: string;
  title: string;
  /** Team or program the role sits in, e.g. "Research". Optional. */
  department: string;
  /** Where the role is based, e.g. "Kampala, Uganda" or "Remote". */
  location: string;
  /** One of JOB_TYPES. */
  employmentType: string;
  /** One or two sentences shown on the job's card in the list. */
  summary: string;
  /** "About the role" — paragraphs separated by a blank line. */
  description: string;
  responsibilities: string[];
  /** Qualifications and experience. */
  requirements: string[];
  /** Last day to apply (YYYY-MM-DD, inclusive). Empty = open until filled. */
  deadline: string;
  /** When it was posted (YYYY-MM-DD). */
  postedDate: string;
  /** Overrides the page-wide application email for this one job. Empty = use that. */
  applicationEmail?: string;
  order: number;
  /** Switched off → the job never leaves the API. Missing counts as on. */
  enabled?: boolean;
}

/** The Careers page (Get Involved → Careers). */
export interface CareersContent {
  /** Short text at the top of the page. */
  intro: string;
  /** Where applications are emailed, shown on the page and used by every "Apply" button. */
  applicationEmail: string;
  /** What to send, shown with each job, e.g. "Send your CV and a cover letter…". */
  howToApply: string;
  jobs: JobPosting[];
}

/**
 * Every social platform the site can link to, in the order the icons appear.
 * `icon` is the Bootstrap Icons class. X keeps the key `twitter` so links
 * saved before the rename still work.
 */
export const SOCIAL_PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', icon: 'bi-linkedin', placeholder: 'https://www.linkedin.com/company/…' },
  { key: 'twitter', label: 'X (Twitter)', icon: 'bi-twitter-x', placeholder: 'https://x.com/…' },
  { key: 'facebook', label: 'Facebook', icon: 'bi-facebook', placeholder: 'https://www.facebook.com/…' },
  { key: 'instagram', label: 'Instagram', icon: 'bi-instagram', placeholder: 'https://www.instagram.com/…' },
  { key: 'youtube', label: 'YouTube', icon: 'bi-youtube', placeholder: 'https://www.youtube.com/@…' },
  { key: 'tiktok', label: 'TikTok', icon: 'bi-tiktok', placeholder: 'https://www.tiktok.com/@…' },
  { key: 'threads', label: 'Threads', icon: 'bi-threads', placeholder: 'https://www.threads.net/@…' },
  { key: 'bluesky', label: 'Bluesky', icon: 'bi-bluesky', placeholder: 'https://bsky.app/profile/…' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'bi-whatsapp', placeholder: 'https://wa.me/256…  or a WhatsApp channel link' },
  { key: 'telegram', label: 'Telegram', icon: 'bi-telegram', placeholder: 'https://t.me/…' },
  { key: 'medium', label: 'Medium', icon: 'bi-medium', placeholder: 'https://medium.com/@…' },
  { key: 'substack', label: 'Substack', icon: 'bi-substack', placeholder: 'https://….substack.com' },
  { key: 'spotify', label: 'Spotify', icon: 'bi-spotify', placeholder: 'https://open.spotify.com/show/…' },
  { key: 'github', label: 'GitHub', icon: 'bi-github', placeholder: 'https://github.com/…' },
  { key: 'mastodon', label: 'Mastodon', icon: 'bi-mastodon', placeholder: 'https://mastodon.social/@…' },
  { key: 'discord', label: 'Discord', icon: 'bi-discord', placeholder: 'https://discord.gg/…' },
  { key: 'pinterest', label: 'Pinterest', icon: 'bi-pinterest', placeholder: 'https://www.pinterest.com/…' },
  { key: 'reddit', label: 'Reddit', icon: 'bi-reddit', placeholder: 'https://www.reddit.com/r/…' },
  { key: 'vimeo', label: 'Vimeo', icon: 'bi-vimeo', placeholder: 'https://vimeo.com/…' },
  { key: 'snapchat', label: 'Snapchat', icon: 'bi-snapchat', placeholder: 'https://www.snapchat.com/add/…' },
] as const;

export type SocialPlatformKey = (typeof SOCIAL_PLATFORMS)[number]['key'];

/** A link per platform. Empty or missing → that platform's icon isn't shown. */
export type ContactSocials = Partial<Record<SocialPlatformKey, string>>;

export interface ContactContent {
  title: string;
  subtitle: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  postalAddress: string;
  officeHours: string;
  mapEmbedUrl: string;
  socials: ContactSocials;
  topics: string[];
}

export interface ContactSubmission {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
  contacted: boolean;
}

export interface FooterContent {
  description: string;
  copyrightName: string;
}

export interface SiteContent {
  section: string;
  data:
    | HeroContent
    | AboutContent
    | ServiceItem[]
    | PracticeArea[]
    | TeamMember[]
    | PublicationItem[]
    | DialogueItem[]
    | CareersContent
    | ContactContent
    | FooterContent;
  updatedAt: string;
  updatedBy: string;
}

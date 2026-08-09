// ─── User / Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'staff';

/** Roles allowed to manage people (invite, remove, transfer). Staff cannot. */
export const USER_MANAGEMENT_ROLES: readonly UserRole[] = ['super_admin', 'admin'];

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
  status: 'active' | 'pending';
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

export interface PublicationItem {
  id: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  coverImage: string;
  date: string;
  order: number;
}

export interface DialogueItem {
  id: string;
  youtubeUrl: string;
  title: string;
  description: string;
  category: string;
  order: number;
}

export interface ContactSocials {
  linkedin: string;
  twitter: string;
  youtube: string;
  facebook: string;
}

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
    | PublicationItem[]
    | DialogueItem[]
    | ContactContent
    | FooterContent;
  updatedAt: string;
  updatedBy: string;
}

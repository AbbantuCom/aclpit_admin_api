'use client';

import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAuth } from '@/lib/auth-context';
import { useContentStatus } from '@/components/admin/useContentStatus';
import { USER_MANAGEMENT_ROLES } from '@/types';

const sections = [
  { label: 'Hero',           href: '/admin/hero',           desc: 'Kicker, title, description, CTA buttons, hero image' },
  { label: 'About',          href: '/admin/about',          desc: 'Background, vision, mission, objectives, governance, stakeholders' },
  { label: 'Services',       href: '/admin/services',       desc: 'Service cards with icons, descriptions and bullet points' },
  { label: 'Practice Areas', href: '/admin/practice-areas', desc: 'The six thematic pillars of the Centre’s work' },
  { label: 'Publications',   href: '/admin/publications',   desc: 'Research reports, policy briefs and commentary' },
  { label: 'Dialogues',      href: '/admin/dialogues',      desc: 'Legal Tech Dialogues video series entries' },
  { label: 'Contact',        href: '/admin/contact',        desc: 'Contact info, office hours, map, socials' },
  { label: 'Users',          href: '/admin/users',          desc: 'Manage members, invite, transfer role', requiresUserManagement: true },
];

export default function AdminDashboard() {
  const { adminUser } = useAuth();
  const { data: contentStatus } = useContentStatus();

  const canManageUsers = adminUser ? USER_MANAGEMENT_ROLES.includes(adminUser.role) : false;
  const visibleSections = sections.filter((s) => !s.requiresUserManagement || canManageUsers);

  const pendingCount = contentStatus?.pendingCount ?? 0;

  return (
    <>
      <AdminHeader title="Dashboard" />
      <div className="p-4 sm:p-8 max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            Welcome back, {adminUser?.displayName?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            Choose a section below to edit the site content. Edits are saved as drafts — the public
            site only changes when you publish.
          </p>
        </div>

        {pendingCount > 0 && (
          <Link
            href="/admin/pending"
            className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 hover:border-amber-400 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-sm text-amber-900 flex-1">
              <strong>
                {pendingCount} section{pendingCount === 1 ? '' : 's'}
              </strong>{' '}
              {pendingCount === 1 ? 'has' : 'have'} unpublished changes waiting to go live.
            </span>
            <span className="text-amber-800 text-xs font-semibold whitespace-nowrap">Review →</span>
          </Link>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {visibleSections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 hover:border-wine hover:shadow-md transition-all group"
            >
              <h3 className="font-semibold text-gray-800 group-hover:text-wine transition-colors">{s.label}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
              <div className="mt-3 sm:mt-4 text-wine text-xs font-medium group-hover:translate-x-1 transition-transform inline-block">
                Edit →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

'use client';

import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAuth } from '@/lib/auth-context';

const sections = [
  { label: 'Hero',           href: '/admin/hero',           desc: 'Kicker, title, description, CTA buttons, hero image' },
  { label: 'About',          href: '/admin/about',          desc: 'Background, vision, mission, objectives, governance, stakeholders' },
  { label: 'Services',       href: '/admin/services',       desc: 'Service cards with icons, descriptions and bullet points' },
  { label: 'Practice Areas', href: '/admin/practice-areas', desc: 'The six thematic pillars of the Centre’s work' },
  { label: 'Publications',   href: '/admin/publications',   desc: 'Research reports, policy briefs and commentary' },
  { label: 'Dialogues',      href: '/admin/dialogues',      desc: 'Legal Tech Dialogues video series entries' },
  { label: 'Contact',        href: '/admin/contact',        desc: 'Contact info, office hours, map, socials' },
  { label: 'Users',          href: '/admin/users',          desc: 'Manage admins, invite, transfer role' },
];

export default function AdminDashboard() {
  const { adminUser } = useAuth();

  return (
    <>
      <AdminHeader title="Dashboard" />
      <div className="p-4 sm:p-8 max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            Welcome back, {adminUser?.displayName?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Choose a section below to edit the site content.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sections.map((s) => (
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

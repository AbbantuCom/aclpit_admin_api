'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getFirebaseAuth } from '@/lib/firebase';

const navItems = [
  { label: 'Dashboard',       href: '/admin',                icon: '⊞' },
  { label: 'Hero',            href: '/admin/hero',           icon: '▶' },
  { label: 'About',           href: '/admin/about',          icon: '◉' },
  { label: 'Services',        href: '/admin/services',       icon: '◈' },
  { label: 'Practice Areas',  href: '/admin/practice-areas', icon: '⚖' },
  { label: 'Publications',    href: '/admin/publications',   icon: '▤' },
  { label: 'Dialogues',       href: '/admin/dialogues',      icon: '▶' },
  { label: 'Contact',         href: '/admin/contact',        icon: '✉' },
  { label: 'Messages',        href: '/admin/messages',       icon: '✎' },
  { label: 'Media Library',   href: '/admin/media',          icon: '▣' },
  { label: 'Users',           href: '/admin/users',          icon: '◈' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const { adminUser } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!adminUser) return;

    async function checkUnread() {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch('/api/contact/count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadMessages(data.unread);
      }
    }

    checkUnread();
    const interval = setInterval(checkUnread, 60_000);
    return () => clearInterval(interval);
  }, [adminUser]);

  // Opening the Messages page marks everything as read server-side — hide the badge right away too.
  useEffect(() => {
    if (pathname.startsWith('/admin/messages')) setUnreadMessages(0);
  }, [pathname]);

  const sidebarContent = (
    <aside className="w-64 h-full bg-wine-dark flex flex-col">
      {/* Logo + close button row */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
              <span className="text-wine-dark text-xs font-black tracking-tight">AC</span>
            </div>
            <span className="font-display text-white font-bold tracking-wide">
              ACLPIT
            </span>
          </div>
          <p className="text-white/40 text-xs mt-0.5 pl-10">Admin Panel</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-wine-dark'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-xs w-4 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === '/admin/messages' && unreadMessages > 0 && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ${
                    active ? 'bg-wine-dark text-white' : 'bg-white text-wine-dark'
                  }`}
                >
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-wine flex items-center justify-center text-white text-xs font-bold shrink-0">
            {adminUser?.displayName?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{adminUser?.displayName}</p>
            <p className="text-white/60 text-xs capitalize">{adminUser?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop: static sidebar ── */}
      <div className="hidden md:flex md:w-64 md:min-h-screen md:shrink-0">
        {sidebarContent}
      </div>

      {/* ── Mobile: slide-in drawer ── */}
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 flex transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}

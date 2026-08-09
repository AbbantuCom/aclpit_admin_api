'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useAdminLayout } from '@/app/admin/layout';

export default function AdminHeader({ title }: { title: string }) {
  const { adminUser, signOut } = useAuth();
  const router = useRouter();
  const { openSidebar } = useAdminLayout();

  async function handleSignOut() {
    await signOut();
    router.push('/auth');
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={openSidebar}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <h1 className="text-base sm:text-lg font-bold text-gray-800 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-wine flex items-center justify-center text-white text-xs font-bold shrink-0">
          {adminUser?.displayName?.[0]?.toUpperCase() || 'A'}
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-800">{adminUser?.displayName}</p>
          <p className="text-xs text-gray-500">{adminUser?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

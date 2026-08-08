'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import AdminSidebar from '@/components/admin/AdminSidebar';
import QueryProvider from '@/components/admin/QueryProvider';

interface LayoutContextValue {
  openSidebar: () => void;
}

export const AdminLayoutContext = createContext<LayoutContextValue>({ openSidebar: () => {} });
export const useAdminLayout = () => useContext(AdminLayoutContext);

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, adminUser, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!firebaseUser || !adminUser)) {
      router.replace('/auth');
    }
  }, [loading, firebaseUser, adminUser, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-wine border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!firebaseUser || !adminUser) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-w-0 overflow-auto">
        <AdminLayoutContext.Provider value={{ openSidebar: () => setSidebarOpen(true) }}>
          {children}
        </AdminLayoutContext.Provider>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <AdminGuard>{children}</AdminGuard>
      </AuthProvider>
    </QueryProvider>
  );
}

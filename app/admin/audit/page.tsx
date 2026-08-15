import AdminHeader from '@/components/admin/AdminHeader';
import AuditLog from '@/components/admin/sections/AuditLog';

export default function AuditPage() {
  return (
    <>
      <AdminHeader title="Activity Log" />
      <div className="p-4 sm:p-8">
        <p className="text-sm text-gray-500 mb-5 max-w-2xl">
          Every change made through this panel, newest first. Entries are written when the
          action succeeds and are never edited or removed from here.
        </p>
        <AuditLog />
      </div>
    </>
  );
}

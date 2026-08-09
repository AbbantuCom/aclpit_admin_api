import AdminHeader from '@/components/admin/AdminHeader';
import PendingChanges from '@/components/admin/sections/PendingChanges';

export default function PendingChangesPage() {
  return (
    <>
      <AdminHeader title="Pending Changes" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <PendingChanges />
      </div>
    </>
  );
}

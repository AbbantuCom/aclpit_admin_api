import AdminHeader from '@/components/admin/AdminHeader';
import UsersManager from '@/components/admin/sections/UsersManager';

export default function UsersPage() {
  return (
    <>
      <AdminHeader title="User Management" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <UsersManager />
      </div>
    </>
  );
}

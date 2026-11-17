import AdminHeader from '@/components/admin/AdminHeader';
import PublicationsEditor from '@/components/admin/sections/PublicationsEditor';
import PublicationsVisibilitySwitch from '@/components/admin/PublicationsVisibilitySwitch';

export default function PublicationsPage() {
  return (
    <>
      <AdminHeader title="Publications" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <PublicationsVisibilitySwitch />
        <PublicationsEditor />
      </div>
    </>
  );
}

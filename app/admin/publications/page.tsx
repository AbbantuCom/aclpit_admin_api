import AdminHeader from '@/components/admin/AdminHeader';
import PublicationsEditor from '@/components/admin/sections/PublicationsEditor';
import SectionVisibilitySwitch from '@/components/admin/SectionVisibilitySwitch';

export default function PublicationsPage() {
  return (
    <>
      <AdminHeader title="Resources" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <SectionVisibilitySwitch setting="publicationsEnabled" label="Resources" />
        <PublicationsEditor />
      </div>
    </>
  );
}

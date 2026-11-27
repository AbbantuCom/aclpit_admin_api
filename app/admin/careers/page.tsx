import AdminHeader from '@/components/admin/AdminHeader';
import CareersEditor from '@/components/admin/sections/CareersEditor';

export default function CareersPage() {
  return (
    <>
      <AdminHeader title="Careers" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <CareersEditor />
      </div>
    </>
  );
}

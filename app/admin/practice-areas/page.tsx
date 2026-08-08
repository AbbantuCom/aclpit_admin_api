import AdminHeader from '@/components/admin/AdminHeader';
import PracticeAreasEditor from '@/components/admin/sections/PracticeAreasEditor';

export default function PracticeAreasPage() {
  return (
    <>
      <AdminHeader title="Practice Areas" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <PracticeAreasEditor />
      </div>
    </>
  );
}

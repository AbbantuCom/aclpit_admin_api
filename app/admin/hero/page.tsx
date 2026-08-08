import AdminHeader from '@/components/admin/AdminHeader';
import HeroEditor from '@/components/admin/sections/HeroEditor';

export default function HeroPage() {
  return (
    <>
      <AdminHeader title="Hero Section" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <HeroEditor />
      </div>
    </>
  );
}

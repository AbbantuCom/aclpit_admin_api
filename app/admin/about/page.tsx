import AdminHeader from '@/components/admin/AdminHeader';
import AboutEditor from '@/components/admin/sections/AboutEditor';

export default function AboutPage() {
  return (
    <>
      <AdminHeader title="About Section" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <AboutEditor />
      </div>
    </>
  );
}

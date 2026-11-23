import AdminHeader from '@/components/admin/AdminHeader';
import ServicesEditor from '@/components/admin/sections/ServicesEditor';

export default function ServicesPage() {
  return (
    <>
      <AdminHeader title="What We Do Section" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <ServicesEditor />
      </div>
    </>
  );
}

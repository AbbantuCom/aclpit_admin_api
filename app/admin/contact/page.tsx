import AdminHeader from '@/components/admin/AdminHeader';
import ContactEditor from '@/components/admin/sections/ContactEditor';

export default function ContactPage() {
  return (
    <>
      <AdminHeader title="Contact Section" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <ContactEditor />
      </div>
    </>
  );
}

import AdminHeader from '@/components/admin/AdminHeader';
import MessagesManager from '@/components/admin/sections/MessagesManager';

export default function MessagesPage() {
  return (
    <>
      <AdminHeader title="Contact Messages" />
      <div className="p-4 sm:p-8">
        <MessagesManager />
      </div>
    </>
  );
}

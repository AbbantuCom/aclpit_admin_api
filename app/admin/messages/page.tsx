import AdminHeader from '@/components/admin/AdminHeader';
import MessagesManager from '@/components/admin/sections/MessagesManager';
import MessageNotificationSettings from '@/components/admin/MessageNotificationSettings';

export default function MessagesPage() {
  return (
    <>
      <AdminHeader title="Contact Messages" />
      <div className="p-4 sm:p-8">
        <MessageNotificationSettings />
        <MessagesManager />
      </div>
    </>
  );
}

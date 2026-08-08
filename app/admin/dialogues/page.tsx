import AdminHeader from '@/components/admin/AdminHeader';
import DialoguesEditor from '@/components/admin/sections/DialoguesEditor';

export default function DialoguesPage() {
  return (
    <>
      <AdminHeader title="Legal Tech Dialogues" />
      <div className="p-4 sm:p-8 max-w-3xl">
        <DialoguesEditor />
      </div>
    </>
  );
}

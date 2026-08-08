import AdminHeader from '@/components/admin/AdminHeader';
import MediaLibrary from '@/components/admin/sections/MediaLibrary';

export default function MediaPage() {
  return (
    <>
      <AdminHeader title="Media Library" />
      <div className="p-4 sm:p-8">
        <MediaLibrary />
      </div>
    </>
  );
}

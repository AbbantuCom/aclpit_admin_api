import AdminHeader from '@/components/admin/AdminHeader';
import TeamEditor from '@/components/admin/sections/TeamEditor';

export default function TeamPage() {
  return (
    <>
      <AdminHeader title="Team" />
      <div className="p-4 sm:p-8 max-w-4xl">
        <TeamEditor />
      </div>
    </>
  );
}

'use client';

interface Props {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  error?: string;
}

export default function SaveBar({ saving, saved, onSave, error }: Props) {
  return (
    <div className="flex items-center gap-4 pt-6 border-t border-gray-200 mt-8">
      <button
        onClick={onSave}
        disabled={saving}
        className="bg-forest hover:bg-pine text-white font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
      {saved && !saving && (
        <span className="text-pine text-sm font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          Saved
        </span>
      )}
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
}

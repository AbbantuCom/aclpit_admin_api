import Link from 'next/link';

export const authInputClass =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-wine focus:ring-2 focus:ring-wine/15';

interface Props {
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Shared wine-branded card used by every /auth screen. */
export default function AuthShell({ subtitle, children, footer }: Props) {
  return (
    <div className="min-h-screen bg-chalk flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/auth" className="inline-block">
            <div className="w-14 h-14 rounded-full bg-wine flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-sm font-black tracking-tight">AC</span>
            </div>
          </Link>
          <h1 className="text-wine text-2xl font-black tracking-wide">ACLPIT</h1>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">{children}</div>

        {footer && <div className="text-center mt-6 text-sm">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600" role="alert">
      {message}
    </div>
  );
}

export function AuthNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 bg-linen border border-wine/20 rounded-xl px-4 py-3 text-sm text-gray-700" role="status">
      {children}
    </div>
  );
}

export function AuthSpinner() {
  return (
    <div className="min-h-screen bg-chalk flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-wine border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

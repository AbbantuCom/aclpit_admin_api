import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ACLPIT Admin — African Centre for Law and Public Interest Technology',
  description:
    'Admin and content API backend for the African Centre for Law and Public Interest Technology (ACLPIT).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

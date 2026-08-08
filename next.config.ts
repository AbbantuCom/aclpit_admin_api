import type { NextConfig } from 'next';

const r2PublicHostname = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Kept for any content still pointing at pre-migration Firebase Storage URLs.
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'images.openai.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      ...(r2PublicHostname ? [{ protocol: 'https' as const, hostname: r2PublicHostname }] : []),
    ],
  },
  // sharp and fluent-ffmpeg ship native binaries — keep them out of the webpack bundle.
  serverExternalPackages: ['sharp', 'fluent-ffmpeg', '@ffmpeg-installer/ffmpeg'],
};

export default nextConfig;

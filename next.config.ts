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

  /**
   * Ship the native libraries the upload route dlopen()s at runtime.
   *
   * Keeping a package external is not enough on its own. Next traces the files a
   * function needs by following `require`/`import`, and sharp's .node binding
   * pulls in libvips-cpp.so through dlopen — invisible to static analysis. The
   * trace therefore carried the 0-byte `stub.node` placeholder but left the real
   * 18 MB shared object behind, and the deployed function failed with
   *   ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file
   *
   * The globs match whichever platform package is installed (glibc or musl), so
   * this does not need editing if the deployment target changes.
   */
  outputFileTracingIncludes: {
    '/api/upload/process': [
      './node_modules/@img/sharp-libvips-*/lib/**/*',
      './node_modules/@img/sharp-linux*/lib/**/*',
    ],
  },
};

export default nextConfig;

import type { NextConfig } from 'next';

const r2PublicHostname = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : undefined;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Practice Areas were renamed Programs.
      { source: '/admin/practice-areas', destination: '/admin/programs', permanent: true },
    ];
  },
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
  // pdfjs-dist loads its worker by a runtime import of a sibling file, and
  // @napi-rs/canvas is a native binding — both break if bundled.
  serverExternalPackages: ['sharp', 'fluent-ffmpeg', '@ffmpeg-installer/ffmpeg', 'pdfjs-dist', '@napi-rs/canvas'],

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
    // The PDF cover route reads pdfjs's font, cmap and wasm files by path at
    // runtime, and @napi-rs/canvas picks its platform binary dynamically — none
    // of which the tracer can see.
    '/api/documents/cover': [
      './node_modules/pdfjs-dist/legacy/build/**/*',
      './node_modules/pdfjs-dist/standard_fonts/**/*',
      './node_modules/pdfjs-dist/cmaps/**/*',
      './node_modules/pdfjs-dist/wasm/**/*',
      './node_modules/@napi-rs/canvas*/**/*',
      './node_modules/@img/sharp-libvips-*/lib/**/*',
      './node_modules/@img/sharp-linux*/lib/**/*',
    ],
    '/api/media/thumbnail': [
      './node_modules/pdfjs-dist/legacy/build/**/*',
      './node_modules/pdfjs-dist/standard_fonts/**/*',
      './node_modules/pdfjs-dist/cmaps/**/*',
      './node_modules/pdfjs-dist/wasm/**/*',
      './node_modules/@napi-rs/canvas*/**/*',
      './node_modules/@img/sharp-libvips-*/lib/**/*',
      './node_modules/@img/sharp-linux*/lib/**/*',
    ],
  },
};

export default nextConfig;

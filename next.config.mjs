/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output giver et lille Docker-image hvor kun det noedvendige kopieres.
  output: 'standalone',
  experimental: {
    // better-sqlite3 og pdfkit er native/server-only moduler der ikke maa bundles af webpack.
    // (I Next 15 hedder denne noegle 'serverExternalPackages' og ligger paa top-niveau.)
    serverComponentsExternalPackages: ['better-sqlite3', 'pdfkit'],
    // pdfkit har AFM-font-filer der skal med i standalone-outputtet, ellers fejler PDF-genereringen i Docker.
    outputFileTracingIncludes: {
      '/api/admin/export': ['./node_modules/pdfkit/js/data/**/*'],
    },
  },
};

export default nextConfig;

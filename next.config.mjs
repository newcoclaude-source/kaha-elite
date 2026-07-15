/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // A entrada do produto é a Agenda (não o dashboard/landing).
      { source: "/", destination: "/agenda", permanent: false },
      // /sessoes virou /agenda no redesign (308 permanente).
      { source: "/sessoes", destination: "/agenda", permanent: true },
      { source: "/sessoes/:path*", destination: "/agenda/:path*", permanent: true },
    ];
  },
};

export default nextConfig;

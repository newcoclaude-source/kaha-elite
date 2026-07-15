/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // /sessoes virou /agenda no redesign (308 permanente).
    return [
      { source: "/sessoes", destination: "/agenda", permanent: true },
      { source: "/sessoes/:path*", destination: "/agenda/:path*", permanent: true },
    ];
  },
};

export default nextConfig;

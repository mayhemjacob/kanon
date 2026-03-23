import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/clash/:handleA/:handleB",
        destination: "/match/:handleA/:handleB",
        permanent: true,
      },
    ];
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
  images: {
    remotePatterns: [
      // Supabase Storage public URLs: https://<project>.supabase.co/storage/v1/object/public/...
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // TMDb poster images (imported catalog)
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
      // Google Books cover/thumbnail URLs (imported catalog)
      {
        protocol: "https",
        hostname: "books.google.com",
        pathname: "/**",
      },
      // Google OAuth profile images
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
      // GitHub avatars
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      // Gravatar
      {
        protocol: "https",
        hostname: "www.gravatar.com",
        pathname: "/avatar/**",
      },
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
        pathname: "/avatar/**",
      },
      // Facebook profile images (NextAuth)
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

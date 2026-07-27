import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Doctor photos live in the public "doctor-photos" Supabase Storage
    // bucket (see supabase/migrations/14_doctor_photos.sql). Scoped to
    // storage's public-object path rather than the whole *.supabase.co
    // domain, which also serves the API itself.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

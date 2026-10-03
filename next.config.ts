import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets a phone or another computer on the same Wi-Fi open
  // `npm run dev` through the machine's network address. Without this, Next.js
  // blocks the dev assets for those origins (403) and the page never hydrates,
  // so taps on links and buttons do nothing. Has no effect in production.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;

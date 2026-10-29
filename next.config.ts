import type { NextConfig } from "next";

// BUILD_TARGET=mobile exports the on-device demo as static files for the Android app (see scripts/build-mobile.mjs).
// Only .tsx files count as routes there, which leaves out the server-only route.ts handlers (API, sign-in callback)
// and the proxy: the packaged app has no server, so it always runs the demo data layer.
const mobile = process.env.BUILD_TARGET === "mobile";

const nextConfig: NextConfig = mobile
  ? {
      output: "export",
      trailingSlash: true,
      images: { unoptimized: true },
      pageExtensions: ["tsx"],
    }
  : {};

export default nextConfig;

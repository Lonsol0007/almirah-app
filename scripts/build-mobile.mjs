// Builds the static demo into out/ for the Android app. Usage: node scripts/build-mobile.mjs
// The Supabase variables are blanked so the packaged app always uses the on-device data layer.
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

for (const dir of ["out", ".next"]) if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });

const env = {
  ...process.env,
  BUILD_TARGET: "mobile",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
};
const r = spawnSync("npx next build", { stdio: "inherit", env, shell: true });
if (r.status !== 0) process.exit(r.status ?? 1);
if (!existsSync("out/index.html")) {
  console.error("build-mobile: out/index.html missing — the static export didn't run");
  process.exit(1);
}
console.log("build-mobile: static demo written to out/");

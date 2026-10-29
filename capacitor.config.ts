import type { CapacitorConfig } from "@capacitor/cli";

// The Android app packages the static demo build (node scripts/build-mobile.mjs → out/).
// appId is the reverse of getalmirah.app; it can't change once the app is published on Google Play.
const config: CapacitorConfig = {
  appId: "app.getalmirah",
  appName: "Almirah",
  webDir: "out",
  android: {
    backgroundColor: "#f5f6f8",
  },
};

export default config;

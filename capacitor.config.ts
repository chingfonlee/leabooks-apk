import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.leabook.tv",
  appName: "Lea Books TV",
  webDir: "dist",
  server: {
    androidScheme: "http",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#0e1116",
    minWebViewVersion: 60,
  },
};

export default config;

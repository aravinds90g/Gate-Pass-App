import { defineConfig, type MobilewrightConfig } from "mobilewright";
import { MobileNextDriver } from "@mobilewright/driver-mobilenext";
import * as fs from "node:fs";
import * as path from "node:path";

// EAS workflow stages the downloaded preview APK to
// ./build-artifacts/app-preview.apk; locally fall back to the debug APK.
// APK_PATH env overrides both (used by CI and ad-hoc runs).
const apkCandidates = [
  process.env.APK_PATH,
  "./build-artifacts/app-preview.apk",
  "./android/app/build/outputs/apk/debug/app-debug.apk",
].filter((p): p is string => !!p);
const apkPath = apkCandidates
  .map((p) => path.resolve(p))
  .find((p) => fs.existsSync(p));

if (!apkPath) {
  console.warn(
    `[mobilewright] No APK found (tried: ${apkCandidates.join(", ")}). ` +
      "Tests will run against the already-installed app."
  );
}

const onCloud = !!process.env.MOBILENEXT_API_KEY;

const config: MobilewrightConfig = {
  testDir: "./tests",
  bundleId: "com.aravinds90g.myapp",
  timeout: 120_000,
  workers: process.env.CI ? 2 : 1,
  projects: [
    {
      name: "android",
      use: {
        platform: "android",
        // Real Pixel on MobileNext Cloud, local emulator for dev runs.
        deviceType: onCloud ? "real" : "emulator",
        deviceName: /Pixel 7/,
        ...(apkPath ? { installApps: apkPath } : {}),
      },
    },
  ],
};

if (onCloud) {
  config.driver = new MobileNextDriver({
    apiKey: process.env.MOBILENEXT_API_KEY as string,
    testResult: { name: "Gate Pass App E2E", environment: "preview" },
  });
}

export default defineConfig(config);

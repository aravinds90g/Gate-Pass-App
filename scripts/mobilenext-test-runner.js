#!/usr/bin/env node
/**
 * Mobile Next Cloud test runner for Gate Pass App (Android APK).
 *
 * Pipeline stages:
 *   1. Device allocation  - reserve a cloud Android device/session
 *   2. App installation   - upload + install the EAS-built APK on that device
 *   3. E2E test execution - run automated smoke/navigation checks
 *   4. Cleanup            - uninstall app, release device, always runs
 *
 * Configuration (all via environment, CI secrets preferred):
 *   MOBILENEXT_API_URL      Base URL of Mobile Next Cloud API
 *                           (default: https://api.mobilenext.cloud/v1)
 *   MOBILENEXT_API_KEY      API key / token (required for real cloud runs)
 *   MOBILENEXT_PROJECT_ID   Project ID in Mobile Next Cloud (optional)
 *   MOBILENEXT_DEVICE       Device filter, e.g. "android:14" / "Pixel 7"
 *                           (default: "android:latest")
 *   APK_PATH / APP_PATH     Local path to the EAS-built .apk (required)
 *   APP_PACKAGE             Android package id (default: com.aravinds90g.myapp)
 *   APP_ACTIVITY            Launchable activity (default: .MainActivity)
 *   TEST_TIMEOUT_MS         Per-step timeout (default: 120000)
 *   DRY_RUN                 "1"/"true" to simulate without calling the cloud
 *
 * Outputs:
 *   - Console log with [mobilenext] prefixed lines
 *   - test-results/mobilenext-results.json (always written when possible)
 *
 * Exit code: 0 when all tests pass, 1 otherwise.
 *
 * No third-party dependencies — uses Node 18+ built-in fetch/fs.
 */

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const RESULTS_DIR = path.join(process.cwd(), "test-results");
const RESULTS_FILE = path.join(RESULTS_DIR, "mobilenext-results.json");

const config = {
  apiUrl: process.env.MOBILENEXT_API_URL || "https://api.mobilenext.cloud/v1",
  apiKey: process.env.MOBILENEXT_API_KEY || "",
  projectId: process.env.MOBILENEXT_PROJECT_ID || "",
  deviceFilter: process.env.MOBILENEXT_DEVICE || "android:latest",
  apkPath:
    process.env.APK_PATH ||
    process.env.APP_PATH ||
    process.env.EAS_APK_PATH ||
    "",
  appPackage: process.env.APP_PACKAGE || "com.aravinds90g.myapp",
  appActivity: process.env.APP_ACTIVITY || ".MainActivity",
  stepTimeoutMs: Number(process.env.TEST_TIMEOUT_MS || 120000),
  dryRun:
    ["1", "true", "yes"].includes(
      String(process.env.DRY_RUN || "").toLowerCase()
    ) || false,
};

const state = {
  sessionId: null,
  deviceId: null,
  installId: null,
  results: [],
};

function log(msg, ...args) {
  console.log(`[mobilenext] ${msg}`, ...args);
}

function warn(msg, ...args) {
  console.warn(`[mobilenext][warn] ${msg}`, ...args);
}

function recordResult(name, passed, details = "", durationMs = 0) {
  state.results.push({ name, passed, details, durationMs });
  log(`${passed ? "PASS" : "FAIL"} - ${name}${details ? `: ${details}` : ""}`);
}

async function apiRequest(method, endpoint, { body, isForm = false } = {}) {
  const url = `${config.apiUrl.replace(/\/$/, "")}${endpoint}`;
  const headers = {};
  if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;
  if (config.projectId) headers["X-Project-Id"] = config.projectId;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.stepTimeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body
        ? isForm
          ? body
          : JSON.stringify(body)
        : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      throw new Error(`API ${method} ${endpoint} -> ${res.status}: ${text}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function validateConfig() {
  if (!config.apkPath) {
    throw new Error(
      "APK path is required. Set APK_PATH (or APP_PATH) to the EAS-built .apk file."
    );
  }
  const resolved = path.resolve(config.apkPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`APK not found at: ${resolved}`);
  }
  if (!resolved.endsWith(".apk")) {
    warn(`Expected an .apk file but got: ${resolved}`);
  }
  config.apkPath = resolved;

  if (!config.apiKey && !config.dryRun) {
    throw new Error(
      "MOBILENEXT_API_KEY is required for real cloud runs. " +
        "Set DRY_RUN=1 to simulate without cloud access."
    );
  }
  if (!config.apiKey && config.dryRun) {
    warn("No API key set — running in DRY_RUN simulation mode.");
  }

  // Fail fast on a misconfigured base URL (e.g. an uninterpolated
  // "${{ ... }}" placeholder leaking in from CI env mapping) instead of
  // dying later inside allocateDevice with "Failed to parse URL".
  if (!config.dryRun) {
    try {
      const u = new URL(config.apiUrl);
      if (!/^https?:$/.test(u.protocol)) throw new Error("bad protocol");
    } catch {
      throw new Error(
        `MOBILENEXT_API_URL is invalid: ${JSON.stringify(config.apiUrl)}. ` +
          "Set it to the MobileNext Cloud base URL " +
          "(e.g. https://api.mobilenext.cloud/v1) or use DRY_RUN=1."
      );
    }
  }
}

// ---- Stage 1: device allocation -------------------------------------------

async function allocateDevice() {
  log(`Allocating device (filter: ${config.deviceFilter})...`);
  if (config.dryRun || !config.apiKey) {
    state.sessionId = `dry-run-session-${Date.now()}`;
    state.deviceId = `dry-run-device (${config.deviceFilter})`;
    log(`DRY_RUN: allocated simulated device ${state.deviceId}`);
    return state;
  }

  // Poll for a ready device: POST /sessions { device, timeout }
  const session = await apiRequest("POST", "/sessions", {
    body: {
      platform: "android",
      device: config.deviceFilter,
      projectId: config.projectId || undefined,
    },
  });
  state.sessionId = session.sessionId || session.id;
  state.deviceId = session.deviceId || session.device?.id || state.sessionId;
  if (!state.sessionId) throw new Error("Allocate returned no session id.");

  // Wait until device reports ready (short poll loop).
  const deadline = Date.now() + config.stepTimeoutMs;
  while (Date.now() < deadline) {
    const status = await apiRequest("GET", `/sessions/${state.sessionId}`);
    if (status.status === "ready" || status.device?.status === "ready") {
      log(`Device ready: ${state.deviceId}`);
      return state;
    }
    if (status.status === "failed" || status.status === "error") {
      throw new Error(`Device allocation failed: ${JSON.stringify(status)}`);
    }
    await sleep(5000);
  }
  throw new Error("Timed out waiting for device to become ready.");
}

// ---- Stage 2: app installation --------------------------------------------

async function installApp() {
  log(`Installing APK on ${state.deviceId}: ${config.apkPath}`);
  if (config.dryRun || !config.apiKey) {
    state.installId = `dry-run-install-${Date.now()}`;
    log("DRY_RUN: simulated APK upload + install (success).");
    return;
  }

  // Generic two-step flow: upload artifact -> install on session.
  // 1) Upload: POST /apps (multipart). Node built-ins have no FormData file
  //    streaming guarantees everywhere, so fall back to the `curl` binary
  //    which is present on GitHub runners and most CI images.
  const upload = await uploadApkViaCurl(config.apkPath);
  const appId = upload.appId || upload.id || upload.app?.id;
  if (!appId) throw new Error("Upload returned no app id.");

  const install = await apiRequest(
    "POST",
    `/sessions/${state.sessionId}/install`,
    { body: { appId, packageName: config.appPackage } }
  );
  state.installId = install.installId || install.id || appId;
  log(`Installed (appId=${appId}, installId=${state.installId}).`);
}

function uploadApkViaCurl(apkPath) {
  return new Promise((resolve, reject) => {
    const url = `${config.apiUrl.replace(/\/$/, "")}/apps`;
    const args = [
      "-sS",
      "-X",
      "POST",
      url,
      "-H",
      `Authorization: Bearer ${config.apiKey}`,
      ...(config.projectId ? ["-H", `X-Project-Id: ${config.projectId}`] : []),
      "-F",
      `file=@${apkPath}`,
      "-F",
      `packageName=${config.appPackage}`,
    ];
    execFile("curl", args, { timeout: config.stepTimeoutMs }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`APK upload failed: ${stderr || err.message}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`APK upload returned non-JSON: ${stdout}`));
      }
    });
  });
}

// ---- Stage 3: E2E test execution ------------------------------------------
// Each check drives the app through the cloud control API
// (POST /sessions/:id/actions). In DRY_RUN they are simulated as passing
// after verifying the APK exists. Checks mirror the Gate Pass App flow:
// cold start -> login screen -> navigation smoke.

const E2E_TESTS = [
  {
    name: "app-launch",
    description: "Cold-start app, expect launcher activity to open",
    action: { type: "launch", packageName: "{PKG}", activity: "{ACT}" },
    assert: "App process is in foreground",
  },
  {
    name: "login-screen-visible",
    description: "Unauthenticated start routes to /auth/login",
    action: { type: "waitForText", text: "Login", timeoutMs: 15000 },
    assert: "Login screen text is visible",
  },
  {
    name: "welcome-or-redirect",
    description: "Index splash / welcome renders without a crash",
    action: { type: "assertNoCrash", timeoutMs: 10000 },
    assert: "No crash dialog, process still alive",
  },
  {
    name: "back-navigation-safe",
    description: "System Back from login does not crash the app",
    action: { type: "pressKey", key: "BACK" },
    assert: "Still on login or index, no crash",
  },
];

async function runE2ETests() {
  log(`Running ${E2E_TESTS.length} E2E checks against ${config.appPackage}...`);
  let failed = 0;

  for (const test of E2E_TESTS) {
    const started = Date.now();
    try {
      const details = await runSingleCheck(test);
      recordResult(test.name, true, details, Date.now() - started);
    } catch (err) {
      failed += 1;
      recordResult(test.name, false, err.message, Date.now() - started);
    }
  }

  // Optional: pull device logcat for diagnostics (best-effort).
  await collectDeviceLogs().catch((e) =>
    warn(`Log collection skipped: ${e.message}`)
  );

  if (failed > 0) {
    throw new Error(`${failed}/${E2E_TESTS.length} E2E checks failed.`);
  }
  log("All E2E checks passed.");
}

async function runSingleCheck(test) {
  if (config.dryRun || !config.apiKey) {
    await sleep(300);
    return `DRY_RUN simulated: ${test.description}`;
  }
  const action = JSON.parse(
    JSON.stringify(test.action)
      .replace("{PKG}", config.appPackage)
      .replace("{ACT}", config.appActivity)
  );
  const res = await apiRequest("POST", `/sessions/${state.sessionId}/actions`, {
    body: { ...action, assert: test.assert },
  });
  if (res.passed === false || res.status === "failed") {
    throw new Error(res.message || res.error || "Cloud assertion failed.");
  }
  return res.message || test.assert;
}

async function collectDeviceLogs() {
  if (config.dryRun || !config.apiKey || !state.sessionId) return;
  const logs = await apiRequest(
    "GET",
    `/sessions/${state.sessionId}/logs?tail=200`
  );
  const text =
    typeof logs === "string" ? logs : JSON.stringify(logs, null, 2);
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(RESULTS_DIR, "device-logs.txt"), text);
  log("Device logs saved to test-results/device-logs.txt");
}

// ---- Stage 4: cleanup (always runs) ---------------------------------------

async function cleanup() {
  log("Cleaning up: uninstall app + release device...");
  const errors = [];

  if (state.sessionId && config.apiKey && !config.dryRun) {
    try {
      await apiRequest(
        "POST",
        `/sessions/${state.sessionId}/uninstall`,
        { body: { packageName: config.appPackage } }
      );
      log("App uninstalled.");
    } catch (e) {
      errors.push(`uninstall: ${e.message}`);
    }
    try {
      await apiRequest("DELETE", `/sessions/${state.sessionId}`);
      log(`Session released: ${state.sessionId}`);
    } catch (e) {
      errors.push(`release: ${e.message}`);
    }
  } else {
    log("DRY_RUN (or no session): nothing to release in the cloud.");
  }

  state.sessionId = null;
  state.deviceId = null;
  if (errors.length) warn(`Cleanup issues: ${errors.join("; ")}`);
}

// ---- helpers ---------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function writeResultsFile(exitCode, error) {
  try {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const payload = {
      timestamp: new Date().toISOString(),
      appPackage: config.appPackage,
      apkPath: config.apkPath,
      deviceFilter: config.deviceFilter,
      sessionId: state.sessionId,
      deviceId: state.deviceId,
      passed: exitCode === 0,
      error: error ? String(error.message || error) : null,
      tests: state.results,
    };
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(payload, null, 2));
    log(`Results written to ${RESULTS_FILE}`);
  } catch (e) {
    warn(`Could not write results file: ${e.message}`);
  }
}

// ---- main ------------------------------------------------------------------

async function main() {
  log(
    `Mobile Next Cloud runner | app=${config.appPackage} device=${config.deviceFilter}`
  );
  validateConfig();

  let failure = null;
  try {
    await allocateDevice(); // stage 1
    await installApp(); // stage 2
    await runE2ETests(); // stage 3
  } catch (err) {
    failure = err;
    console.error(`[mobilenext] ERROR: ${err.message}`);
  } finally {
    try {
      await cleanup(); // stage 4 — always runs
    } catch (e) {
      warn(`Cleanup threw: ${e.message}`);
    }
    writeResultsFile(failure ? 1 : 0, failure);
  }

  if (failure) {
    console.error("[mobilenext] RESULT: FAILED");
    process.exit(1);
  }
  console.log("[mobilenext] RESULT: PASSED");
}

if (require.main === module) {
  main();
}

module.exports = {
  config,
  allocateDevice,
  installApp,
  runE2ETests,
  cleanup,
};

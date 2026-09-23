/**
 * Shared helpers for the Gate Pass first-use flow suite.
 *
 * Flow (5 files, run in order on 1 worker):
 *   01-signup.spec.ts        create security + mentor + student (+ admin via API)
 *   02-apply-pass.spec.ts    student creates a Home gate pass
 *   03-mentor-forward.spec.ts mentor forwards it to admin
 *   04-admin-approve.spec.ts admin approves it
 *   05-student-verify.spec.ts student sees it under Approved Passes
 *
 * Each file fresh-installs the app first, so every file starts logged
 * out and is independently rerunnable. Backend records persist, so files
 * must still run in order (03 needs 02's pass, ...).
 */

import { expect } from "@mobilewright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const API_BASE =
  process.env.API_BASE || "https://gate-pass-backend-2ccd.onrender.com/api";

/** Per-run accounts file: 01 writes it, 02-05 read it.
 * NOTE: lives in tests/, NOT test-results/ — the runner wipes
 * test-results/ on every invocation. */
const FLOW_ACCOUNTS_FILE = path.join(
  process.cwd(),
  "tests",
  ".flow-accounts.json"
);

export function saveFlowAccounts(a: Record<string, string>) {
  fs.mkdirSync(path.dirname(FLOW_ACCOUNTS_FILE), { recursive: true });
  fs.writeFileSync(FLOW_ACCOUNTS_FILE, JSON.stringify(a, null, 2));
  console.log(`[setup] flow accounts -> ${FLOW_ACCOUNTS_FILE}`);
}

export function loadFlowAccounts(): Record<string, string> {
  try {
    const raw = fs.readFileSync(FLOW_ACCOUNTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    console.log(`[setup] flow accounts loaded (${parsed.studentEmail})`);
    return parsed;
  } catch {
    console.log("[setup] no flow accounts file, using defaults");
    return {
      studentEmail: ACCOUNTS.student.email,
      mentorEmail: ACCOUNTS.mentor.email,
      securityEmail: ACCOUNTS.security.email,
    };
  }
}

export const ACCOUNTS = {
  admin: {
    name: "Admin",
    email: "admin@gmail.com",
    password: "123456",
    role: "admin",
  },
  student: {
    name: "Aravind S",
    email: "aravind@gmail.com",
    password: "123456",
    role: "student",
    dept: "ECE",
    year: "4",
    rollNo: "412622106001",
    phoneNo: "6379804149",
  },
  mentor: {
    name: "Flow Mentor",
    email: "flow.mentor@gmail.com",
    password: "123456",
    role: "mentor",
    dept: "ECE",
    year: "4",
  },
  security: {
    name: "Flow Security",
    email: "flow.security@gmail.com",
    password: "123456",
    role: "security",
  },
};

export const HOME_PASS = {
  destination: "Home - Chennai",
  reasonForGoingHome: "function",
  parentName: "Aravind",
  parentContact: "1234567890",
};

/** Idempotent account setup via API. Reruns hit the duplicate path. */
export async function ensureUserAPI(u: Record<string, string>) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(u),
  });
  const text = await res.text();
  if (res.ok) {
    console.log(`[setup] ${u.email} registered`);
    return;
  }
  if (!/exist|already|duplicate|taken/i.test(text)) {
    throw new Error(`register ${u.email} failed: HTTP ${res.status} ${text}`);
  }
  // Duplicate: verify it is actually usable — correct password AND role.
  // A stale account with the wrong role is the classic "not created
  // correctly" trap; fail loudly instead of passing blindly.
  const login = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: u.email, password: u.password }),
  });
  const ltext = await login.text();
  if (!login.ok) {
    throw new Error(
      `${u.email} already exists but login failed (wrong password?). ` +
        `Delete it from the backend and rerun. HTTP ${login.status} ${ltext}`
    );
  }
  const role = JSON.parse(ltext)?.user?.role;
  if (role !== u.role) {
    throw new Error(
      `${u.email} already exists with role "${role}", expected "${u.role}". ` +
        `Delete it from the backend and rerun.`
    );
  }
  console.log(`[setup] ${u.email} already exists, role=${role} verified`);
}

/** Wipe app data via reinstall so the file starts logged out. */
export async function freshInstall(device: any, bundleId: string) {
  const apk = process.env.E2E_APK_PATH;
  if (!apk) throw new Error("E2E_APK_PATH not set by mobilewright.config");
  await device.uninstallApp(bundleId).catch(() => {});
  await device.installApp(apk);
  console.log("[setup] fresh install done");
}

export async function openApp({ device, screen, bundleId }: any) {
  await device.terminateApp(bundleId).catch(() => {});
  await device.launchApp(bundleId);

  // State machine: the dev launcher can show the intro sheet, the
  // server list, or the app itself, in any order/timing. Cloud release
  // builds always land straight on app content, so this loop exits on
  // its first iteration there.
  const visible = async (locator: any, ms: number) =>
    locator.isVisible({ timeout: ms }).catch(() => false);
  const start = Date.now();
  let content = false;
  while (Date.now() - start < 90_000) {
    if (await visible(screen.getByText("Continue").first(), 2_000)) {
      console.log("[openApp] tapping Continue");
      await screen.getByText("Continue").first().tap();
      continue;
    }
    if (
      (await visible(screen.getByText("Login").first(), 2_000)) ||
      (await visible(screen.getByText("Aravind S"), 2_000))
    ) {
      content = true;
      break;
    }
    if (await visible(screen.getByText("http://10.0.2.2:8081"), 2_000)) {
      console.log("[openApp] tapping dev server");
      await screen.getByText("http://10.0.2.2:8081").tap();
      continue;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  console.log(`[openApp] content=${content}`);

  // Drain any overlay sheet before interacting: covered elements resolve
  // in the tree but are not actionable/visible on screen.
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const n = await screen
      .getByText("Continue")
      .count()
      .catch(() => 1);
    if (n === 0) break;
    await screen.getByText("Continue").first().tap().catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
  }
}

/** Scroll into view, then tap — waiting for the target to appear first. */
export async function tapText(
  screen: any,
  text: string,
  opts: { exact?: boolean; timeout?: number } = {}
) {
  const loc = opts.exact
    ? screen.getByText(text, { exact: true })
    : screen.getByText(text);
  const deadline = Date.now() + (opts.timeout ?? 15_000);
  let ok = false;
  while (Date.now() < deadline) {
    ok = await loc.isVisible({ timeout: 2_000 }).catch(() => false);
    if (ok) break;
  }
  if (!ok) throw new Error(`tapText never visible: ${text}`);
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  // Let scroll momentum settle: a tap issued while the ScrollView is
  // still moving is absorbed as scroll-stop and never reaches the target
  // (below-fold taps silently doing nothing).
  await new Promise((r) => setTimeout(r, 1500));
  await loc.tap();
}

export async function fillField(
  screen: any,
  _name: string,
  index: number,
  value: string,
  dismissLabel?: string
) {
  // Tapping a static label dismisses the keyboard on screens that
  // support tap-outside-to-dismiss (register). With the keyboard closed,
  // covered fields re-enter the hierarchy dump. Harmless no-op elsewhere.
  if (dismissLabel) {
    await tapText(screen, dismissLabel).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Login/register inputs expose NO accessible name (verified via probe
  // dump: textfields with empty text), so go straight positional.
  // With the keyboard open, covered fields drop out of the hierarchy
  // dump: swipe the form up from the last visible field until the
  // target index exists.
  for (let attempt = 0; attempt < 3; attempt++) {
    const count = await screen
      .getByRole("textfield")
      .count()
      .catch(() => 0);
    if (count > index) break;
    await screen
      .getByRole("textfield")
      .nth(Math.max(0, count - 1))
      .swipe({ direction: "up" })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Tap-focus-type-verify loop (see comment above).
  for (let attempt = 0; attempt < 3; attempt++) {
    const field = screen.getByRole("textfield").nth(index);
    // Wait for the field to exist (screen transitions) before touching it.
    const deadline = Date.now() + 15_000;
    let present = false;
    while (Date.now() < deadline) {
      const n = await screen
        .getByRole("textfield")
        .count()
        .catch(() => 0);
      if (n > index) {
        present = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!present) throw new Error(`fillField index=${index} never appeared`);
    // Tap first and let focus + keyboard settle: typing into an
    // unfocused field sets node text without firing onChange, and React
    // wipes it on the next render (fields read back empty seconds later).
    await field.tap().catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    await field.fill(value);
    await new Promise((r) => setTimeout(r, 2000));
    const actual = await screen
      .getByRole("textfield")
      .nth(index)
      .getText()
      .catch(() => "?");
    // Password fields render masked bullets; length still must match.
    const ok =
      actual === value ||
      (actual.length === value.length &&
        /^\W+$/.test(actual.replace(/[0-9a-zA-Z]/g, "")));
    console.log(
      `[fillField] index=${index} attempt=${attempt} ok=${ok} expected=${JSON.stringify(
        value
      )} actual=${JSON.stringify(actual)}`
    );
    if (ok) return;
  }
  throw new Error(`fillField index=${index} never stuck: ${value}`);
}

export async function tapLogin(screen: any) {
  // The Login submit TouchableOpacity is NOT exposed as role=button
  // (the only button on screen is the "Sign Up" link). Its label appears
  // as text alongside the "Login" title, so tap the second match, which
  // always lands inside the submit button. Tap the title first to dismiss
  // the keyboard — otherwise it can cover the submit button and swallow
  // the tap, leaving the request unsent with no error shown.
  await screen.getByText("Login").nth(0).tap();
  await new Promise((r) => setTimeout(r, 1000));
  await screen.getByText("Login").nth(1).tap();
}

/**
 * Fresh install -> launch -> login as the given account (3 attempts:
 * mistyped chars or swallowed taps are retried) -> assert landing text.
 */
export async function loginAs(
  device: any,
  screen: any,
  bundleId: string,
  account: { email: string; password: string },
  landingText: string
) {
  await freshInstall(device, bundleId);
  await openApp({ device, screen, bundleId });

  const loginTitle = screen.getByText("Login");
  const onLoginScreen = await loginTitle
    .isVisible({ timeout: 15_000 })
    .catch(() => false);

  if (onLoginScreen) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      await fillField(screen, "Enter email", 0, account.email);
      await fillField(screen, "Enter password", 1, account.password);
      await tapLogin(screen);

      const landed = await screen
        .getByText(landingText)
        .isVisible({ timeout: 20_000 })
        .catch(() => false);
      if (landed) break;
      const rejected = await screen
        .getByText("Invalid email or password")
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      console.log(
        `[login] attempt=${attempt} landed=${landed} rejected=${rejected}`
      );
      if (attempt === 3) break;
    }
  }

  await expect(screen.getByText(landingText)).toBeVisible({ timeout: 60_000 });
}
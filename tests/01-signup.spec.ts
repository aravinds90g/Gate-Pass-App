import { test, expect } from "@mobilewright/test";
import {
  ACCOUNTS,
  ensureUserAPI,
  freshInstall,
  openApp,
  fillField,
  tapText,
  saveFlowAccounts,
  expectVisible,
} from "./helpers";

/**
 * File 1/5 — first-use setup: create mentor + student through the UI.
 * Every run uses FRESH timestamped emails, so stale backend state
 * (e.g. an account created with the wrong role) can never poison the
 * flow. The credentials are saved for files 02-05. Admin, security and
 * the legacy smoke-test student are ensured via API: institutional roles
 * are no longer self-service on the registration screen.
 */

async function setRole(screen: any, current: string, next: string) {
  await tapText(screen, current, { exact: true });
  await tapText(screen, next);
}

async function setYear(screen: any, year: string) {
  // Dismiss the keyboard first: covered texts drop out of the dump.
  // "Full Name" sits at the top, always visible and tappable.
  await tapText(screen, "Full Name").catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));
  const yearValue = screen.getByText("1", { exact: true });
  if (await yearValue.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await tapText(screen, "1", { exact: true });
  }
  await tapText(screen, year, { exact: true });
}

async function expectSignupOutcome(screen: any, role: string) {
  const landed = await screen
    .getByText("Login")
    .first()
    .isVisible({ timeout: 90_000 })
    .catch(() => false);
  if (landed) {
    console.log(`[signup] ${role}: created`);
    return;
  }
  // Exact server message only — a loose regex would match the footer's
  // "Already have an account?" and fake a pass (seen once, never again).
  const dup = await screen
    .getByText("User already exists")
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  console.log(`[signup] ${role}: duplicate=${dup}`);
  expect(dup).toBe(true);
}

/** From login OR register-with-error, reach a fresh register form. */
async function gotoRegister(screen: any) {
  const onRegister = await screen
    .getByText("Create Account")
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  if (onRegister) {
    await tapText(screen, "Login here");
  }
  await tapText(screen, "Sign Up");
  await expectVisible(screen.getByText("Create Account"), { timeout: 15_000 });
}

test("signup student and mentor from a clean backend", async ({
  device,
  screen,
  bundleId,
}) => {
  await ensureUserAPI(ACCOUNTS.admin);
  await ensureUserAPI(ACCOUNTS.student);

  // Unique emails per run: stale accounts can never poison the flow.
  const ts = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(2, 12);
  const rnd = (n: number) =>
    String(Math.floor(Math.random() * 10 ** n)).padStart(n, "0");
  const student = {
    ...ACCOUNTS.student,
    email: `flow.student.${ts}@gmail.com`,
    rollNo: `412622${rnd(6)}`,
    phoneNo: `9${rnd(9)}`,
  };
  const mentor = {
    ...ACCOUNTS.mentor,
    email: `flow.mentor.${ts}@gmail.com`,
  };
  const security = {
    ...ACCOUNTS.security,
    email: `flow.security.${ts}@gmail.com`,
  };
  // Security is staff: provisioned through the API, not the public form.
  await ensureUserAPI(security);
  saveFlowAccounts({
    studentEmail: student.email,
    mentorEmail: mentor.email,
    securityEmail: security.email,
  });

  await freshInstall(device, bundleId!);
  await openApp({ device, screen, bundleId });

  // Reach the Register screen from Login.
  await tapText(screen, "Sign Up");
  await expectVisible(screen.getByText("Create Account"), { timeout: 15_000 });

  // --- Student (default role + default ECE dept; year 1 -> 4) ---
  // Fill bottom-up so every target stays above the open keyboard.
  const s = student;
  await fillField(screen, "phone", 4, s.phoneNo);
  await fillField(screen, "rollNo", 3, s.rollNo);
  await fillField(screen, "password", 2, s.password);
  await fillField(screen, "email", 1, s.email);
  await fillField(screen, "name", 0, s.name);
  // Dismiss the keyboard (register screen taps outside inputs dismiss it)
  // so the Year picker and Register button below are tappable.
  await tapText(screen, "Full Name");
  await setYear(screen, "4");
  await tapText(screen, "Register");
  await expectSignupOutcome(screen, "student");

  // --- Mentor only; staff roles are not offered on the public form ---
  await gotoRegister(screen);
  await setRole(screen, "Student", "Mentor");
  const m = mentor;
  await fillField(screen, "name", 0, m.name);
  await fillField(screen, "email", 1, m.email);
  await fillField(screen, "password", 2, m.password);
  await tapText(screen, "Full Name");
  await setYear(screen, "4");
  await tapText(screen, "Register");
  await expectSignupOutcome(screen, "mentor");
});

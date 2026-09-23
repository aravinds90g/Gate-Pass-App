import { test, expect } from "@mobilewright/test";
import {
  ACCOUNTS,
  HOME_PASS,
  ensureUserAPI,
  loginAs,
  tapText,
  fillField,
  loadFlowAccounts,
} from "./helpers";

/**
 * File 2/5 — student creates a Home gate pass.
 * Depends on 01 (student account). Run order: 01 -> 02 -> 03 -> 04 -> 05.
 */

async function pickDayOffset(
  screen: any,
  fieldText: string,
  offsetDays: number
) {
  // Tap (with settle-swipe retries: a tap issued while the form is still
  // settling after scroll is absorbed and the dialog never opens).
  for (let attempt = 1; attempt <= 3; attempt++) {
    await tapText(screen, fieldText);
    // The native dialog must appear (either button proves it).
    const deadline = Date.now() + 15_000;
    let opened = false;
    while (Date.now() < deadline) {
      const ok = await screen
        .getByText("OK")
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      const cancel = await screen
        .getByText("CANCEL")
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (ok || cancel) {
        opened = true;
        break;
      }
    }
    if (opened) break;
    console.log(`[pickDay] ${fieldText} attempt=${attempt} no dialog, settling`);
    if (attempt === 3)
      throw new Error(`date dialog never opened for ${fieldText}`);
    await screen
      .getByText(fieldText)
      .swipe({ direction: "up" })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
  }
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const day = screen.getByText(String(d.getDate()), { exact: true });
  if (await day.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await day.tap();
  }
  await tapText(screen, "OK");
}

async function submitForm(screen: any) {
  // The success banner auto-hides after 3s; a tap swallowed by layout
  // settling needs a re-tap. A duplicate submit is harmless for the flow
  // assertions (any pending pass gets forwarded/approved).
  for (let attempt = 1; attempt <= 3; attempt++) {
    // The open keyboard covers the bottom of the form: swipe up until
    // Submit is actually in the hierarchy dump, then tap it.
    const shown = Date.now() + 20_000;
    while (Date.now() < shown) {
      const visible = await screen
        .getByText("Submit Request")
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (visible) break;
      await screen
        .getByText("Parent's Contact")
        .swipe({ direction: "up" })
        .catch(() => {});
      await new Promise((r) => setTimeout(r, 1000));
    }
    await tapText(screen, "Submit Request");
    const ok = await screen
      .getByText("Gate pass submitted successfully!")
      .isVisible({ timeout: 30_000 })
      .catch(() => false);
    if (ok) return;
    console.log(`[submit] attempt=${attempt} no banner, re-tapping`);
  }
  throw new Error("submit never confirmed");
}

test("student applies for a Home gate pass", async ({
  device,
  screen,
  bundleId,
}) => {
  await ensureUserAPI(ACCOUNTS.student);
  const { studentEmail } = loadFlowAccounts();
  const student = { ...ACCOUNTS.student, email: studentEmail };
  await ensureUserAPI(student);
  await loginAs(device, screen, bundleId, student, "Aravind S");

  await tapText(screen, "New Gate Pass");
  await expect(screen.getByText("New Gate Pass").first()).toBeVisible({
    timeout: 15_000,
  });

  // Leaving = tomorrow, return = leaving + 2 days (a two-day trip).
  const LEAVING_OFFSET = 1;
  const RETURN_OFFSET = LEAVING_OFFSET + 2;

  // Leaving date = tomorrow, time = now (accept dialog defaults).
  await pickDayOffset(screen, "Select a date...", LEAVING_OFFSET);
  await tapText(screen, "Select a time...");
  await tapText(screen, "OK");

  // Destination (keyboard closed at this point).
  await fillField(screen, "place", 0, HOME_PASS.destination);

  // Reason = Going Home (reveals the Home-only fields).
  await tapText(screen, "Select a reason...");
  await tapText(screen, "Going Home");
  // Ensure the options dialog fully dismissed (its "Others" option must
  // be gone) before touching anything else: a lingering modal overlay
  // swallows subsequent taps while the form looks perfectly normal.
  {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const gone = await screen
        .getByText("Others")
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (!gone) break;
    }
  }

  // Return date + home details (bottom-up: every target stays above the
  // open keyboard). fillField verifies each value stuck (tap-focus-type).
  await pickDayOffset(screen, "Select return date...", RETURN_OFFSET);

  // Home details (bottom-up: every target stays above the open keyboard).
  // fillField verifies each value stuck (tap-focus-type).
  await fillField(screen, "contact", 3, HOME_PASS.parentContact);
  await fillField(screen, "parent", 2, HOME_PASS.parentName);
  await fillField(screen, "homeReason", 1, HOME_PASS.reasonForGoingHome);

  // Dismiss the keyboard, then submit (with banner-verified retries,
  // exactly as validated manually: return Sep 26, function / Aravind /
  // 1234567890).
  await tapText(screen, "New Gate Pass", { exact: true });
  await new Promise((r) => setTimeout(r, 1000));
  await submitForm(screen);
});

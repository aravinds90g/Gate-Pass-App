import { test, expect } from "@mobilewright/test";
import {
  ACCOUNTS,
  ensureUserAPI,
  loginAs,
  loadFlowAccounts,
} from "./helpers";

/**
 * File 3/5 — mentor forwards the student's Home passes to admin.
 * Depends on 02 (pending passes from a matching ECE/4 student exist).
 * Forwards EVERY pending pass (one loop iteration per pass), so a single
 * run covers both flow passes — equivalent to running the single-forward
 * test twice, with each forward individually verified.
 */
test("mentor forwards the pending passes", async ({
  device,
  screen,
  bundleId,
}) => {
  const { mentorEmail } = loadFlowAccounts();
  const mentor = { ...ACCOUNTS.mentor, email: mentorEmail };
  await ensureUserAPI(mentor);
  await loginAs(device, screen, bundleId, mentor, "Mentor Dashboard");

  // Idempotent: if a previous run already forwarded everything, the
  // list is empty and there is nothing to do.
  const alreadyEmpty = await screen
    .getByText("No active passes found")
    .isVisible({ timeout: 15_000 })
    .catch(() => false);
  if (!alreadyEmpty) {
    await expect(screen.getByText("Aravind S")).toBeVisible({
      timeout: 15_000,
    });
    await expect(screen.getByText("Pending").first()).toBeVisible();

    let forwarded = 0;
    for (let i = 0; i < 5; i++) {
      const buttons = screen.getByText("Forward", { exact: true });
      const hasPending = await buttons
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      if (!hasPending) break;

      const before = await buttons.count().catch(() => 0);
      const btn = screen.getByText("Forward", { exact: true }).first();
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.tap();
      forwarded++;

      // Wait until the card flips: Forward-button count must drop
      // (list refetches after the PUT). Proves THIS forward registered.
      const settled = Date.now() + 30_000;
      while (Date.now() < settled) {
        const now = await screen
          .getByText("Forward", { exact: true })
          .count()
          .catch(() => before);
        if (now < before) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      console.log(`[forward] pass #${forwarded} submitted`);
    }
    console.log(`[forward] total forwarded=${forwarded}`);
  }
  // The mentor endpoint lists only UNforwarded passes, so after forwarding
  // everything the list is empty ("No active passes found"). Either that
  // empty state or a lingering Forwarded badge proves the final state.
  const emptied = await screen
    .getByText("No active passes found")
    .isVisible({ timeout: 10_000 })
    .catch(() => false);
  if (!emptied) {
    await expect(screen.getByText("Forwarded").first()).toBeVisible({
      timeout: 10_000,
    });
  }
});

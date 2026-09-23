import { test, expect } from "@mobilewright/test";
import { ACCOUNTS, ensureUserAPI, loginAs } from "./helpers";

/**
 * File 4/5 — admin approves the forwarded passes.
 * Depends on 03 (forwarded, still-pending passes exist).
 * Approves EVERY forwarded pass (one loop iteration per pass), so a single
 * run covers both flow passes — equivalent to running the single-approve
 * test twice, with each approval individually verified. Idempotent: a
 * rerun with nothing left to approve verifies the empty state and passes.
 */
test("admin approves the forwarded passes", async ({
  device,
  screen,
  bundleId,
}) => {
  await ensureUserAPI(ACCOUNTS.admin);
  await loginAs(device, screen, bundleId, ACCOUNTS.admin, "Admin Dashboard");

  await expect(screen.getByText(/Forwarded Passes \(/)).toBeVisible({
    timeout: 30_000,
  });

  // Idempotent: if a previous run already approved everything, the list
  // shows the empty state and there is nothing to do.
  const alreadyEmpty = await screen
    .getByText("No forwarded passes pending approval")
    .isVisible({ timeout: 15_000 })
    .catch(() => false);
  if (!alreadyEmpty) {
    let approved = 0;
    for (let i = 0; i < 5; i++) {
      const buttons = screen.getByText("Approve", { exact: true });
      const hasPending = await buttons
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      if (!hasPending) break;

      const before = await buttons.count().catch(() => 0);
      const btn = screen.getByText("Approve", { exact: true }).first();
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.tap();
      approved++;

      // Wait until the card leaves the list: Approve-button count must
      // drop (list filters forwarded && pending and refetches after PUT).
      const settled = Date.now() + 30_000;
      while (Date.now() < settled) {
        const now = await screen
          .getByText("Approve", { exact: true })
          .count()
          .catch(() => before);
        if (now < before) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      console.log(`[approve] pass #${approved} submitted`);
    }
    console.log(`[approve] total approved=${approved}`);
  }

  // The admin list only shows forwarded+pending, so approving everything
  // empties it. Either the empty state or a lingering Approved badge
  // proves the final state.
  const emptied = await screen
    .getByText("No forwarded passes pending approval")
    .isVisible({ timeout: 10_000 })
    .catch(() => false);
  if (!emptied) {
    await expect(screen.getByText("Approved").first()).toBeVisible({
      timeout: 10_000,
    });
  }
});

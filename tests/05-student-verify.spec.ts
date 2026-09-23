import { test, expect } from "@mobilewright/test";
import {
  ACCOUNTS,
  HOME_PASS,
  ensureUserAPI,
  loginAs,
  tapText,
  loadFlowAccounts,
} from "./helpers";

/**
 * File 5/5 — student sees the approved Home pass.
 * Depends on 04 (the pass was approved and hasn't expired).
 */
test("student sees the approved pass", async ({
  device,
  screen,
  bundleId,
}) => {
  const { studentEmail } = loadFlowAccounts();
  const student = { ...ACCOUNTS.student, email: studentEmail };
  await ensureUserAPI(student);
  await loginAs(device, screen, bundleId, student, "Aravind S");
  await tapText(screen, "Approved Passes");
  await expect(screen.getByText("Your Active Passes")).toBeVisible({
    timeout: 60_000,
  });
  await expect(screen.getByText(HOME_PASS.destination)).toBeVisible({
    timeout: 15_000,
  });
});

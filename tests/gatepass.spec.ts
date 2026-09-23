import { test, expect } from "@mobilewright/test";
import { openApp, loginAs, ACCOUNTS } from "./helpers";

/**
 * Gate Pass App smoke + login flow on a real device (MobileNext Cloud)
 * or the local emulator (no MOBILENEXT_API_KEY).
 *
 * Cold start -> Login screen (or straight to profile when a session
 * persists) -> student login (aravind@gmail.com) -> student profile.
 */

test("app launches to the Login screen or profile", async ({
  device,
  screen,
  bundleId,
}) => {
  await openApp({ device, screen, bundleId });

  const loginVisible = await screen
    .getByText("Login")
    .isVisible({ timeout: 15_000 })
    .catch(() => false);
  const profileVisible = loginVisible
    ? false
    : await screen
        .getByText("Aravind S")
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
  expect(loginVisible || profileVisible).toBe(true);
  if (loginVisible) {
    // Login form rendered (positional: email first, password second).
    await expect(screen.getByRole("textfield").first()).toBeVisible();
    await expect(screen.getByRole("textfield").nth(1)).toBeVisible();
  }
});

test("student can log in and reaches the profile", async ({
  device,
  screen,
  bundleId,
}) => {
  await loginAs(device, screen, bundleId, ACCOUNTS.student, "Aravind S");
});

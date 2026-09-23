import { test, expect } from "@mobilewright/test";

/**
 * Gate Pass App smoke + login flow on a real device (MobileNext Cloud)
 * or the local emulator (no MOBILENEXT_API_KEY).
 *
 * Cold start -> Login screen (or straight to profile when a session
 * persists) -> student login (aravind@gmail.com) -> student profile.
 */

async function openApp({ device, screen, bundleId }: any) {
  await device.terminateApp(bundleId).catch(() => {});
  await device.launchApp(bundleId);

  // Local dev-client builds cold-start to the Expo dev launcher instead of
  // the app. Release builds (EAS preview / cloud) never show this, so this
  // branch is a no-op there.
  const devServer = screen.getByText("http://10.0.2.2:8081");
  if (await devServer.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await devServer.tap();
  }
}

async function ensureLoggedInAsStudent({ device, screen, bundleId }: any) {
  await openApp({ device, screen, bundleId });

  const loginTitle = screen.getByText("Login");
  const onLoginScreen = await loginTitle
    .isVisible({ timeout: 15_000 })
    .catch(() => false);

  if (onLoginScreen) {
    await screen
      .getByRole("textfield", { name: "Enter email" })
      .fill("aravind@gmail.com");
    await screen
      .getByRole("textfield", { name: "Enter password" })
      .fill("123456");
    await screen.getByRole("button", { name: "Login" }).tap();
  }

  // Student profile: name badge (backend on Render may cold-start).
  await expect(screen.getByText("Aravind S")).toBeVisible({ timeout: 90_000 });
}

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
  const profileVisible = await screen
    .getByText("Aravind S")
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  expect(loginVisible || profileVisible).toBe(true);
});

test("student can log in and reaches the profile", async ({
  device,
  screen,
  bundleId,
}) => {
  await ensureLoggedInAsStudent({ device, screen, bundleId });
});

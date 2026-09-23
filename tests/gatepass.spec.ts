import { test, expect } from "@mobilewright/test";

/**
 * Gate Pass App smoke + login flow on a real device (MobileNext Cloud)
 * or the local emulator (no MOBILENEXT_API_KEY).
 *
 * Cold start -> Login screen (or straight to profile when a session
 * persists) -> student login (aravind@gmail.com) -> student profile.
 */

export async function openApp({ device, screen, bundleId }: any) {
  await device.terminateApp(bundleId).catch(() => {});
  await device.launchApp(bundleId);

  // Local dev-client builds cold-start to the Expo dev launcher instead of
  // the app. Release builds (EAS preview / cloud) never show this, so these
  // branches are no-ops there.
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
    if (
      await visible(screen.getByText("http://10.0.2.2:8081"), 2_000)
    ) {
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

async function fillField(screen: any, name: string, index: number, value: string) {
  // Login inputs expose NO accessible name (verified via probe dump:
  // two textfields, both with empty text), so go straight positional:
  // email = 1st textfield, password = 2nd.
  await screen.getByRole("textfield").nth(index).fill(value);
}

async function tapLogin(screen: any) {
  // The Login submit TouchableOpacity is NOT exposed as role=button
  // (the only button on screen is the "Sign Up" link). Its label appears
  // as text alongside the "Login" title, so tap the second match, which
  // always lands inside the submit button.
  await screen.getByText("Login").nth(1).tap();
}

async function ensureLoggedInAsStudent({ device, screen, bundleId }: any) {
  await openApp({ device, screen, bundleId });

  const loginTitle = screen.getByText("Login");
  const onLoginScreen = await loginTitle
    .isVisible({ timeout: 15_000 })
    .catch(() => false);

  if (onLoginScreen) {
    await fillField(screen, "Enter email", 0, "aravind@gmail.com");
    await fillField(screen, "Enter password", 1, "123456");
    await tapLogin(screen);
  }

  // Student profile: name badge (backend on Render may cold-start).
  await expect(screen.getByText("Aravind S")).toBeVisible({ timeout: 60_000 });
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
  await ensureLoggedInAsStudent({ device, screen, bundleId });
});

import { test, expect } from "@playwright/test";

/**
 * Unauthenticated smoke test: the app must redirect to /login and the health
 * endpoint must respond. Authenticated flows require a seeded Supabase test
 * user and run separately (see README).
 */
test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("DoorPin")).toBeVisible();
});

test("health endpoint responds ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toMatchObject({ status: "ok" });
});

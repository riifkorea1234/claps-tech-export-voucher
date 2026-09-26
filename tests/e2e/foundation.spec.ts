import { expect, test } from "@playwright/test";
test("web readiness serves the API envelope and a generated request ID", async ({ request }) => {
  const response = await request.get("/api/health", { headers: { "X-Request-ID": "untrusted", "X-Claps-Locale": "en" } });
  expect(response.status()).toBe(200); expect(await response.json()).toEqual({ data: { status: "ok" } });
  expect(response.headers()["cache-control"]).toBe("private, no-store"); expect(response.headers()["x-request-id"]).toMatch(/^[a-f0-9-]{36}$/);
});
test("existing login screen renders and accepts an email without runtime errors", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/login");
  const email = page.locator('input[type="email"]'); await expect(email).toBeVisible();
  await email.fill("phase1@example.test"); await expect(email).toHaveValue("phase1@example.test"); expect(errors).toEqual([]);
});

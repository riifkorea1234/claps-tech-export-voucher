import { expect, test } from "@playwright/test";
import { createAccount, cleanupAccounts } from "../helpers/auth-fixture";
import { createProject, createSession, assetFixture } from "../helpers/workspace-fixture";
import sharp from "sharp";
test.beforeEach(async ({ page, baseURL }) => { await createAccount(page.request, baseURL!); await page.request.post("/api/locale", { headers: { Origin: baseURL! }, data: { locale: "en" } }); });
test.afterAll(cleanupAccounts);
test("creates projects with server IDs, preserves failures, searches, edits and restores archives", async ({ page }) => {
  await page.goto("/projects"); await page.getByRole("button", { name: "New project", exact: true }).click();
  const dialog = page.getByRole("dialog"); await dialog.locator("input").nth(0).fill("Persistent project"); await dialog.locator("input").nth(1).fill("Studio IP");
  await page.route("**/api/projects", route => route.request().method() === "POST" ? route.fulfill({ status: 503, json: { error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable", requestId: "fixture" } } }) : route.continue());
  await dialog.getByRole("button", { name: "Create project", exact: true }).click(); await expect(dialog.getByRole("alert")).toBeVisible(); await expect(dialog.locator("input").first()).toHaveValue("Persistent project");
  await page.unroute("**/api/projects"); await dialog.getByRole("button", { name: "Create project", exact: true }).click(); await expect(dialog).toHaveCount(0);
  await page.reload(); await page.getByRole("textbox", { name: "Search projects" }).fill("Persistent"); await page.getByText("Persistent project", { exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]{36}$/); await expect(page.getByRole("heading", { name: "Persistent project" })).toBeVisible();
  await page.getByRole("button", { name: "Rename", exact: true }).click(); await page.getByRole("textbox", { name: "Project name", exact: true }).fill("Renamed project"); await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Renamed project" })).toBeVisible(); await page.getByRole("button", { name: "Archive", exact: true }).click(); await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole("button", { name: "Archived", exact: true }).click(); await expect(page.getByText("Renamed project", { exact: true })).toBeVisible();
  const row = page.getByRole("button").filter({ has: page.getByText("Renamed project", { exact: true }) }); await row.locator('button[data-slot="dropdown-menu-trigger"]').last().click(); await page.getByRole("menuitem", { name: "Restore" }).click();
  await page.getByRole("button", { name: "Active", exact: true }).click(); await expect(page.getByText("Renamed project", { exact: true })).toBeVisible();
});
test("persists cover original/thumbnail and refuses wrong MIME without false success", async ({ page, baseURL }) => {
  const p = await createProject(page.request, baseURL!, "Cover project"); await page.goto(`/projects/${p.id}`);
  const png = await sharp({ create: { width: 600, height: 450, channels: 3, background: "pink" } }).png().toBuffer();
  await page.getByLabel("Upload cover image", { exact: true }).setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
  await expect(page.locator('img[src^="/api/files/"]')).toHaveCount(1); await page.reload(); await expect(page.locator('img[src^="/api/files/"]')).toHaveCount(1);
  await expect(page.getByText("Original IP", { exact: true })).toBeVisible();
  const afterCover = (await (await page.request.get(`/api/projects/${p.id}`)).json()).data; expect(afterCover.status).toBe("verifying");
  const src = await page.locator('img[src^="/api/files/"]').getAttribute("src"); expect((await page.request.get(src!)).headers()["content-type"]).toBe("image/webp");
  await page.getByLabel("Upload cover image", { exact: true }).setInputFiles({ name: "spoof.png", mimeType: "image/png", buffer: Buffer.from("not an image") }); await expect(page.getByRole("alert")).toBeVisible();
  await page.reload(); await expect(page.locator('img[src^="/api/files/"]')).toHaveCount(1);
});
test("creates and links a session, keeps one server title across all steps, adopts a synthetic asset", async ({ page, baseURL }) => {
  const p = await createProject(page.request, baseURL!, "Link target"); await page.goto("/assets"); await page.getByRole("button", { name: "Generate new assets", exact: true }).click();
  await expect(page).toHaveURL(/\/assets\/[a-f0-9-]{36}$/); const id = page.url().split("/").at(-1)!;
  await Promise.all([page.waitForResponse(r => r.url().includes("/api/asset-sessions/") && r.request().method() === "PATCH"), page.getByRole("combobox", { name: "Select project" }).selectOption(p.id)]); await page.reload(); await expect(page.getByRole("combobox", { name: "Select project" })).toHaveValue(p.id);
  await page.goto("/assets"); await page.getByRole("button", { name: "Rename", exact: true }).click(); await page.getByRole("textbox", { name: "Rename", exact: true }).fill("Saved session"); await page.getByRole("button", { name: "Save", exact: true }).click();
  const assetId = await assetFixture(page.request, baseURL!, p, id);
  for (const suffix of ["", "/verify", "/final"]) { await page.goto(`/assets/${id}${suffix}?title=Spoofed`); await expect(page.getByText("Saved session", { exact: true })).toBeVisible(); await expect(page.getByText("Spoofed", { exact: true })).toHaveCount(0); }
  await page.goto(`/assets/${id}`); await page.getByRole("button", { name: "Adopt", exact: true }).click(); await expect(page.getByRole("button", { name: "Adopt", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload(); await expect(page.getByRole("button", { name: "Adopt", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect((await (await page.request.get(`/api/assets/${assetId}`)).json()).data.adopted).toBe(true);
  await page.goto(`/projects/${p.id}/sessions`); await expect(page.getByText("Saved session", { exact: true })).toBeVisible();
});
test("forces API ownership, strict fields, origin, version conflicts and real missing pages", async ({ page, browser, baseURL }) => {
  const p = await createProject(page.request, baseURL!); const s = await createSession(page.request, baseURL!, p.id);
  const other = await browser.newContext(); await createAccount(other.request, baseURL!);
  for (const path of [`/api/projects/${p.id}`, `/api/asset-sessions/${s.id}`, `/api/projects/${p.id}/library`]) expect((await other.request.get(path)).status()).toBe(404);
  expect((await page.request.patch(`/api/projects/${p.id}`, { headers: { Origin: "https://example.invalid" }, data: { version: 1, name: "x" } })).status()).toBe(403);
  expect((await page.request.patch(`/api/projects/${p.id}`, { headers: { Origin: baseURL! }, data: { version: 1, ownerId: "x" } })).status()).toBe(422);
  const results = await Promise.all(["one", "two"].map(name => page.request.patch(`/api/projects/${p.id}`, { headers: { Origin: baseURL! }, data: { version: 1, name } }))); expect(results.map(r => r.status()).sort()).toEqual([200, 409]);
  for (const path of ["/projects/missing", "/assets/missing", "/assets/missing/final"]) { await page.goto(path); await expect(page.getByText("404", { exact: true })).toBeVisible(); }
  await other.close();
});
test("uses server pagination and ignores unowned browser data", async ({ page, baseURL }) => {
  for (let i = 0; i < 31; i++) await createProject(page.request, baseURL!, `Paged ${String(i).padStart(2, "0")}`);
  await page.addInitScript(() => localStorage.setItem("claps:projects", JSON.stringify([{ id: "fake", name: "Injected local project" }])));
  await page.goto("/projects"); await expect(page.getByText(/^Paged \d+$/)).toHaveCount(30); await expect(page.getByText("Injected local project")).toHaveCount(0);
  await page.getByRole("button", { name: "2", exact: true }).click(); await expect(page.getByText(/^Paged \d+$/)).toHaveCount(1);
  await page.getByRole("textbox", { name: "Search projects" }).fill("Paged 15"); await expect(page.getByText("Paged 15", { exact: true })).toBeVisible(); await expect(page.getByText(/^Paged \d+$/)).toHaveCount(1);
});
test("shows failed loads distinctly and works on mobile", async ({ page, baseURL }) => {
  await createProject(page.request, baseURL!, "Mobile project"); await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/projects?*", route => route.fulfill({ status: 503, json: { error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable", requestId: "fixture" } } }));
  await page.goto("/projects"); await expect(page.getByRole("alert")).toBeVisible(); await page.unroute("**/api/projects?*"); await page.getByRole("button", { name: "Reload", exact: true }).click(); await expect(page.getByText("Mobile project", { exact: true })).toBeVisible();
  await page.getByText("Mobile project", { exact: true }).click(); await expect(page.getByRole("heading", { name: "Mobile project" })).toBeVisible();
  expect((await page.getByRole("heading", { name: "Mobile project" }).boundingBox())!.width).toBeGreaterThan(150);
  await page.screenshot({ path: "md/evidence/phase4/project-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "md/evidence/phase4/project-desktop.png", fullPage: true });
});

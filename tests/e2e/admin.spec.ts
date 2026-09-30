import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
let originalEnglishEnabled = false;
const password = "eight888",
  reason = "Synthetic browser review";
const ids: string[] = [],
  partners: string[] = [],
  projects: string[] = [],
  guides: string[] = [];
const db = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
test.beforeAll(async () => {
  if (
    !process.env.TEST_DATABASE_URL ||
    new URL(process.env.TEST_DATABASE_URL).pathname !== "/claps_test"
  )
    throw new Error("Isolated DB required");
  originalEnglishEnabled = !!(
    await db.query("SELECT enabled FROM locales WHERE code='en'")
  ).rows[0]?.enabled;
  await db.query("UPDATE locales SET enabled=true WHERE code='en'");
});
async function fixture(admin = true) {
  if (
    !process.env.TEST_DATABASE_URL ||
    new URL(process.env.TEST_DATABASE_URL).pathname !== "/claps_test"
  )
    throw new Error("Isolated DB required");
  const id = randomUUID(),
    token = randomBytes(32).toString("hex");
  ids.push(id);
  await db.query(
    "INSERT INTO users(id,email,name,email_verified,status,app_role,profile_completed_at) VALUES($1,$2,'Browser fixture',true,'active',$3,now())",
    [id, `${id}@example.test`, admin ? "admin" : "member"],
  );
  await db.query(
    "INSERT INTO auth_accounts(id,user_id,account_id,provider_id,password) VALUES($1,$2,$2,'credential',$3)",
    [randomUUID(), id, await hashPassword(password)],
  );
  await db.query(
    "INSERT INTO auth_sessions(id,user_id,token,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",
    [randomUUID(), id, createHash("sha256").update(token).digest("hex")],
  );
  return { id, token };
}
async function login(
  page: import("@playwright/test").Page,
  baseURL: string,
  admin = true,
) {
  const a = await fixture(admin);
  await page.context().addCookies([
    { name: "claps-session", value: a.token, url: baseURL },
    { name: "claps-locale", value: "en", url: baseURL },
  ]);
  return a;
}
async function verify(page: import("@playwright/test").Page) {
  await page.goto("/admin");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reconfirm administrator password" }),
  ).toHaveCount(0);
  await expect(page.getByText("Requests in the last 30 days")).toBeVisible();
}
async function post(
  page: import("@playwright/test").Page,
  origin: string,
  path: string,
  data: unknown,
  method = "POST",
) {
  return page.request.fetch(`/api/admin/${path}`, {
    method,
    headers: { Origin: origin, "X-Claps-Locale": "en" },
    data,
  });
}
async function createPartner(
  page: import("@playwright/test").Page,
  origin: string,
  name = "Browser source",
) {
  const res = await post(page, origin, "partners", {
    name,
    description: "Source description",
    contactEmail: null,
    visibility: "public",
    tags: [],
    ipNames: ["Fixture IP"],
    reason,
  });
  expect(res.status()).toBe(200);
  const p = (await res.json()).data;
  partners.push(p.id);
  return p;
}
test.afterAll(async () => {
  await db.query("DELETE FROM storage_tickets WHERE owner_id=ANY($1)", [ids]);
  await db.query("DELETE FROM localized_contents WHERE resource_key=ANY($1)", [
    [...partners, ...guides],
  ]);
  await db.query("UPDATE projects SET active_guide_id=NULL WHERE id=ANY($1)", [
    projects,
  ]);
  await db.query("DELETE FROM brand_guides WHERE id=ANY($1)", [guides]);
  await db.query("DELETE FROM jobs WHERE owner_id=ANY($1)", [ids]);
  await db.query("DELETE FROM projects WHERE id=ANY($1)", [projects]);
  await db.query("DELETE FROM partners WHERE id=ANY($1)", [partners]);
  await db.query("DELETE FROM admin_audit_logs WHERE actor_id=ANY($1)", [ids]);
  for (const table of ["auth_sessions", "auth_accounts"])
    await db.query(`DELETE FROM ${table} WHERE user_id=ANY($1)`, [ids]);
  await db.query("DELETE FROM auth_rate_limits WHERE key=ANY($1)", [
    ids.map((id) =>
      createHash("sha256").update(`admin-reauth:${id}`).digest("hex"),
    ),
  ]);
  await db.query("DELETE FROM users WHERE id=ANY($1)", [ids]);
  await db.query("UPDATE locales SET enabled=$1 WHERE code='en'", [
    originalEnglishEnabled,
  ]);
  await db.end();
});
test("member cannot access any admin endpoint; same-origin and strict bodies required", async ({
  page,
  baseURL,
}) => {
  await login(page, baseURL!, false);
  for (const path of [
    "overview",
    "users",
    "projects",
    "partners",
    "jobs",
    "guides",
    "monitoring-records",
    "audit-logs",
    "locales",
  ])
    expect((await page.request.get(`/api/admin/${path}`)).status()).toBe(403);
  expect(
    (await post(page, baseURL!, "reauthenticate", { password })).status(),
  ).toBe(403);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  await login(page, baseURL!);
  expect(
    (
      await post(page, "https://wrong.example", "reauthenticate", { password })
    ).status(),
  ).toBe(403);
  expect(
    (
      await post(page, baseURL!, "reauthenticate", { password, role: "admin" })
    ).status(),
  ).toBe(422);
});
test("reauthentication, all five menus, mobile keyboard navigation and expiration", async ({
  page,
  baseURL,
}) => {
  const a = await login(page, baseURL!);
  await verify(page);
  await expect(
    page
      .getByRole("navigation", { name: "Admin navigation" })
      .getByRole("link"),
  ).toHaveCount(5);
  for (const [path, title] of [
    ["users", "Members"],
    ["projects", "Projects"],
    ["partners", "Partners"],
    ["jobs", "Jobs"],
    ["monitoring", "Monitoring"],
  ]) {
    await page.goto(`/admin/${path}`);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Members", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/admin\/users$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("table")).toBeVisible();
  await page.screenshot({
    path: "md/evidence/admin-fixes/admin-mobile.png",
    fullPage: true,
  });
  await db.query(
    "UPDATE auth_sessions SET admin_verified_until=now()-interval '1 second' WHERE user_id=$1",
    [a.id],
  );
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});
test("partner create, language switching preserves form and content language; draft and publish update real catalog", async ({
  page,
  baseURL,
}) => {
  await login(page, baseURL!);
  await verify(page);
  await page.goto("/admin/partners/new");
  await page.getByLabel("Name", { exact: true }).fill("Browser source");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Source description");
  await page.getByLabel("Reason", { exact: true }).fill(reason);
  await page.getByLabel("Visibility", { exact: true }).selectOption("public");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(page).toHaveURL(/admin\/partners\/[a-f0-9-]+$/);
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  partners.push(id);
  await page
    .getByRole("navigation", { name: "Page tabs" })
    .getByRole("link", { name: "Content translations" })
    .click();
  const region = page.getByRole("region", { name: "Content translations" });
  await expect(region.getByLabel("Name", { exact: true })).toBeVisible();
  await region.getByLabel("Name", { exact: true }).fill("Published English");
  await region.getByLabel("Reason", { exact: true }).fill(reason);
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await page.getByRole("menuitem", { name: "한국어" }).click();
  const korean = page.getByRole("region", { name: "콘텐츠 번역" });
  await expect(korean.getByLabel("이름", { exact: true })).toHaveValue(
    "Published English",
  );
  await expect(korean.getByLabel("콘텐츠 편집 언어")).toHaveValue("en");
  await korean.getByRole("button", { name: "초안 저장" }).click();
  await expect(page.getByRole("status").first()).toBeVisible();
  let catalog = await page.request.get("/api/partners", {
    headers: { "X-Claps-Locale": "en" },
  });
  expect(
    (await catalog.json()).data.items.find((p: { id: string }) => p.id === id)
      .name,
  ).toBe("Browser source");
  await korean.getByRole("button", { name: "게시", exact: true }).click();
  await expect
    .poll(async () => {
      catalog = await page.request.get("/api/partners", {
        headers: { "X-Claps-Locale": "en" },
      });
      return (await catalog.json()).data.items.find(
        (p: { id: string }) => p.id === id,
      ).name;
    })
    .toBe("Published English");
  await page.screenshot({
    path: "md/evidence/admin-fixes/translation-editor.png",
    fullPage: true,
  });
});
test("import preview/export, conflict handling, image decoding and private catalog boundary", async ({
  page,
  baseURL,
}) => {
  await login(page, baseURL!);
  await verify(page);
  const p = await createPartner(page, baseURL!);
  const entry = {
    resourceType: "partner",
    resourceKey: p.id,
    locale: "en",
    version: 0,
    sourceRevision: 1,
    content: {
      schemaVersion: 1,
      resourceType: "partner",
      name: "Import English",
      description: "Import description",
    },
  };
  const payload = { schemaVersion: 1, entries: [entry], reason };
  expect(
    (
      await post(page, baseURL!, "localized-contents/import-preview", payload)
    ).status(),
  ).toBe(200);
  let r = await page.request.get(
    `/api/admin/localized-contents/partner/${p.id}/en`,
  );
  expect((await r.json()).data.version).toBe(0);
  expect(
    (await post(page, baseURL!, "localized-contents/import", payload)).status(),
  ).toBe(200);
  expect(
    (await post(page, baseURL!, "localized-contents/import", payload)).status(),
  ).toBe(200);
  r = await page.request.get(
    `/api/admin/localized-contents/partner/${p.id}/en/export`,
  );
  expect((await r.json()).data.entries[0].content.name).toBe("Import English");
  await page.goto(`/admin/partners/${p.id}`);
  await page
    .getByRole("navigation", { name: "Page tabs" })
    .getByRole("link", { name: "Content translations" })
    .click();
  const editor = page.getByRole("region", { name: "Content translations" });
  await editor.getByLabel("Reason", { exact: true }).fill(reason);
  await editor.locator("summary").filter({ hasText: "Import JSON" }).click();
  await editor
    .getByLabel("JSON content", { exact: true })
    .fill(JSON.stringify(payload));
  await editor
    .getByRole("button", { name: "Preview changes", exact: true })
    .click();
  await expect(
    editor.getByRole("button", { name: "Import JSON", exact: true }),
  ).toBeEnabled();
  await editor
    .getByRole("button", { name: "Import JSON", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await editor
    .getByRole("button", { name: "Export JSON", exact: true })
    .click();
  expect((await downloadPromise).suggestedFilename()).toContain(".json");
  const malformed = new URLSearchParams({
    version: "1",
    reason,
    name: "invalid.png",
  });
  expect(
    (
      await page.request.post(
        `/api/admin/partners/${p.id}/images?${malformed}`,
        {
          headers: { Origin: baseURL!, "Content-Type": "image/png" },
          data: Buffer.from("invalid image"),
        },
      )
    ).status(),
  ).toBe(422);
  expect(
    (
      await post(page, baseURL!, "localized-contents/import", {
        ...payload,
        reason: "x".repeat(70000),
      })
    ).status(),
  ).toBe(400);
  const png = await sharp({
    create: { width: 50, height: 50, channels: 3, background: "#ee4499" },
  })
    .png()
    .toBuffer();
  const query = new URLSearchParams({
    version: "1",
    reason,
    name: "fixture.png",
  });
  r = await page.request.post(`/api/admin/partners/${p.id}/images?${query}`, {
    headers: { Origin: baseURL!, "Content-Type": "image/png" },
    data: png,
  });
  expect(r.status()).toBe(200);
  expect(
    (await page.request.get(`/api/partners/${p.id}/images/0`)).status(),
  ).toBe(200);
  const data = {
    name: "Browser source",
    description: "Source description",
    contactEmail: null,
    visibility: "private",
    tags: [],
    ipNames: ["Fixture IP"],
    reason,
    version: 2,
  };
  expect(
    (await post(page, baseURL!, `partners/${p.id}`, data, "PATCH")).status(),
  ).toBe(200);
  expect(
    (await page.request.get(`/api/partners/${p.id}/images/0`)).status(),
  ).toBe(404);
  expect(
    (await page.request.get(`/api/partners/${p.id}/images/0?admin=1`)).status(),
  ).toBe(200);
  expect(
    (await post(page, baseURL!, `partners/${p.id}`, data, "PATCH")).status(),
  ).toBe(409);
  const all = await page.request.get("/api/partners");
  expect(
    (await all.json()).data.items.some((r: { id: string }) => r.id === p.id),
  ).toBe(false);
});

test("preserves edit on reauthentication and executes the saved change exactly once", async ({
  page,
  baseURL,
}) => {
  const a = await login(page, baseURL!);
  await verify(page);
  const p = await createPartner(page, baseURL!);
  await page.goto(`/admin/partners/${p.id}`);
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Preserved after expiry");
  await page.getByLabel("Reason", { exact: true }).first().fill(reason);
  await db.query(
    "UPDATE auth_sessions SET admin_verified_until=now()-interval '1 second' WHERE user_id=$1",
    [a.id],
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Preserved after expiry",
  );
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeVisible();
  expect(
    (await db.query("SELECT name,version FROM partners WHERE id=$1", [p.id]))
      .rows[0],
  ).toMatchObject({ name: "Preserved after expiry", version: 2 });
  expect(
    (
      await db.query(
        "SELECT count(*)::int n FROM admin_audit_logs WHERE entity_id=$1 AND action='partner.update'",
        [p.id],
      )
    ).rows[0].n,
  ).toBe(1);
});
test("view/edit cancel, archive confirmation, return URL, restore and readonly history", async ({
  page,
  baseURL,
}) => {
  await login(page, baseURL!);
  await verify(page);
  const p = await createPartner(page, baseURL!, "Archive UI fixture");
  await page.goto("/admin/partners?q=Archive&pageSize=50&sort=name&order=asc");
  await page
    .getByRole("link", { name: "Archive UI fixture", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Unsaved value");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Reason", { exact: true }).fill(reason);
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(
    (await db.query("SELECT archived_at FROM partners WHERE id=$1", [p.id]))
      .rows[0].archived_at,
  ).toBeNull();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(page).toHaveURL(
    /admin\/partners\?q=Archive&pageSize=50&sort=name&order=asc/,
  );
  await expect(
    page.getByRole("link", { name: "Archive UI fixture", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Archived", { exact: true }).selectOption("archived");
  await page
    .getByRole("link", { name: "Archive UI fixture", exact: true })
    .click();
  await page.getByLabel("Reason", { exact: true }).fill(reason);
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await db.query(
            "SELECT visibility,archived_at FROM partners WHERE id=$1",
            [p.id],
          )
        ).rows[0],
    )
    .toEqual({ visibility: "private", archived_at: null });
});
test("loading is distinct from empty; local date bounds and pagination are URL state", async ({
  page,
  baseURL,
}) => {
  await login(page, baseURL!);
  await verify(page);
  await page.route("**/api/admin/users?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.goto("/admin/users");
  await expect(page.getByText("Loading…", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page.goto("/admin/jobs?page=3");
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/admin/jobs?")) requests.push(r.url());
  });
  await page.getByLabel("From", { exact: true }).fill("2026-09-30");
  await page.getByLabel("To", { exact: true }).fill("2026-09-30");
  await expect(page).toHaveURL(/page=1/);
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          new URL(url).searchParams.get("from") ===
            "2026-09-29T15:00:00.000Z" &&
          new URL(url).searchParams.get("to") === "2026-09-30T14:59:59.999Z",
      ),
    )
    .toBe(true);
  await page.getByLabel("From", { exact: true }).fill("2026-10-02");
  await expect(
    page.getByText("From date must be on or before the to date."),
  ).toBeVisible();
});
test("image removal and unpublish UI require confirmation and retain data contracts", async ({
  page,
  baseURL,
}) => {
  await login(page, baseURL!);
  await verify(page);
  const p = await createPartner(page, baseURL!);
  const png = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#ee4499" },
  })
    .png()
    .toBuffer();
  const query = new URLSearchParams({
    version: "1",
    reason,
    name: "fixture.png",
  });
  expect(
    (
      await page.request.post(`/api/admin/partners/${p.id}/images?${query}`, {
        headers: { Origin: baseURL!, "Content-Type": "image/png" },
        data: png,
      })
    ).status(),
  ).toBe(200);
  await page.goto(`/admin/partners/${p.id}?tab=images`);
  await page.getByLabel("Reason", { exact: true }).first().fill(reason);
  await page.getByRole("button", { name: "Delete image", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Delete image", exact: true }),
  ).toHaveCount(0);
  expect(
    (await page.request.get(`/api/partners/${p.id}/images/0`)).status(),
  ).toBe(404);
  const entry = {
    resourceType: "partner",
    resourceKey: p.id,
    locale: "en",
    version: 0,
    sourceRevision: 1,
    content: {
      schemaVersion: 1,
      resourceType: "partner",
      name: "Foreign publication",
      description: "Translated",
    },
  };
  await post(page, baseURL!, "localized-contents/import", {
    schemaVersion: 1,
    entries: [entry],
    reason,
  });
  await post(page, baseURL!, "localized-contents/publish", {
    ...entry,
    version: 1,
    reason,
  });
  await page.goto(`/admin/partners/${p.id}?tab=translations`);
  const editor = page.getByRole("region", { name: "Content translations" });
  await editor.getByLabel("Reason", { exact: true }).fill(reason);
  await editor.getByRole("button", { name: "Unpublish", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(
    editor.getByRole("button", { name: "Unpublish", exact: true }),
  ).toHaveCount(0);
  const r = await page.request.get(
    `/api/admin/localized-contents/partner/${p.id}/en`,
  );
  expect((await r.json()).data).toMatchObject({
    published: null,
    draft: { name: "Foreign publication" },
  });
});
test("language row editing and unsupported packs use a dialog without creating detail pages", async ({
  page,
  baseURL,
}) => {
  await login(page, baseURL!);
  await verify(page);
  await page.goto("/admin/locales");
  const ko = page.getByRole("row").filter({ hasText: "한국어" });
  await expect(
    ko.getByRole("button", { name: "Disable", exact: true }),
  ).toHaveCount(0);
  await ko.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByLabel("Fallback language code"),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add language", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Language code", { exact: true })
    .fill("fr");
  await expect(
    page.getByRole("dialog").getByLabel("Enabled", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "This language cannot be enabled until its interface pack is deployed.",
    ),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect(
    (
      await page.request.delete("/api/admin/locales/en", {
        headers: { Origin: baseURL! },
        data: { reason },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.patch("/api/admin/audit-logs/not-real", {
        headers: { Origin: baseURL! },
        data: { reason },
      })
    ).status(),
  ).toBe(404);
  expect(
    (await page.request.get("/api/admin/partners?sort=unsafe")).status(),
  ).toBe(422);
  expect(
    (await page.request.get("/api/admin/partners?archived=destroy")).status(),
  ).toBe(422);
});
test("admin entry is role-gated and login preserves only safe return paths", async ({
  page,
  baseURL,
}) => {
  await login(page, baseURL!);
  await page.goto("/projects");
  await expect(
    page.getByRole("link", { name: "Administration", exact: true }),
  ).toBeVisible();
  await page.context().clearCookies();
  await page
    .context()
    .addCookies([{ name: "claps-locale", value: "en", url: baseURL! }]);
  await page.goto("/admin/jobs");
  await expect(page).toHaveURL(/login\?next=%2Fadmin%2Fjobs/);
  const a = await fixture();
  await page.getByLabel("Email", { exact: true }).fill(`${a.id}@example.test`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/sign-in.*next=%2Fadmin%2Fjobs/);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/admin\/jobs$/);
  await page.context().clearCookies();
  await page
    .context()
    .addCookies([{ name: "claps-locale", value: "en", url: baseURL! }]);
  await page.goto(`/sign-in?email=${a.id}@example.test&next=//evil.example`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await login(page, baseURL!, false);
  await page.goto("/projects");
  await expect(
    page.getByRole("link", { name: "Administration", exact: true }),
  ).toHaveCount(0);
});
test("legacy guides redirect to project tabs, related jobs are scoped and archive is separate from editing", async ({
  page,
  baseURL,
}) => {
  const a = await login(page, baseURL!);
  await verify(page);
  const other = await fixture(false),
    project = randomUUID(),
    guide = randomUUID(),
    ruleId = randomUUID();
  projects.push(project);
  guides.push(guide);
  await db.query(
    "INSERT INTO projects(id,owner_id,name,ip_name) VALUES($1,$2,'Guide UI project','IP')",
    [project, a.id],
  );
  await db.query(
    "INSERT INTO brand_guides(id,project_id,version,file,rules) VALUES($1,$2,1,$3,$4)",
    [
      guide,
      project,
      {
        schemaVersion: 1,
        storageKey: "synthetic-guide-ui",
        originalName: "fixture.pdf",
        mimeType: "application/pdf",
        size: 1,
        checksum: "a".repeat(64),
      },
      {
        schemaVersion: 1,
        rules: [
          {
            ruleId,
            title: "Existing rule",
            description: "Description",
            condition: { field: "color", operator: "equals", value: "red" },
            evidence: { page: 1, excerpt: "Rule" },
          },
        ],
      },
    ],
  );
  await db.query("UPDATE projects SET active_guide_id=$2 WHERE id=$1", [
    project,
    guide,
  ]);
  await page.goto(`/admin/guides/${guide}`);
  await expect(page).toHaveURL(
    new RegExp(`admin/projects/${project}\\?tab=guides`),
  );
  await page
    .getByRole("button", { name: "Content translations", exact: true })
    .click();
  const region = page.getByRole("region", { name: "Content translations" });
  await expect(region.getByLabel("Name", { exact: true })).toHaveValue(
    "Existing rule",
  );
  await region
    .getByLabel("Name", { exact: true })
    .fill("Translated guide rule");
  await region.getByLabel("Reason", { exact: true }).fill(reason);
  await region.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.query(
            "SELECT draft FROM localized_contents WHERE resource_key=$1 AND locale_code='en'",
            [guide],
          )
        ).rows[0]?.draft.rules[0].title,
    )
    .toBe("Translated guide rule");
  for (const [owner, error] of [
    [a.id, "TRANSIENT"],
    [other.id, "TIMEOUT"],
  ])
    await db.query(
      "INSERT INTO jobs(id,owner_id,project_id,kind,status,input,request_hash,error_code) VALUES($1,$2,$3,'matching','failed',$4,$5,$6)",
      [
        randomUUID(),
        owner,
        owner === a.id ? project : null,
        {
          schemaVersion: 1,
          kind: "matching",
          outputLocale: "ko",
          preferences: { schemaVersion: 1 },
        },
        "a".repeat(64),
        error,
      ],
    );
  await page.goto(`/admin/users/${a.id}?tab=jobs`);
  await expect(
    page.getByRole("table").getByText("A temporary error occurred."),
  ).toBeVisible();
  await expect(
    page.getByRole("table").getByText("The job timed out."),
  ).toHaveCount(0);
  await page.goto(`/admin/projects/${project}`);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByLabel("Reason", { exact: true }).fill(reason);
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(page).toHaveURL(/admin\/projects\?/);
  expect(
    (
      await db.query("SELECT name,archived_at FROM projects WHERE id=$1", [
        project,
      ])
    ).rows[0],
  ).toMatchObject({ name: "Guide UI project", archived_at: expect.any(Date) });
});

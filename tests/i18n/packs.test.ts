import { expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { namespaces, variables, uiNamespaces } from "../../lib/i18n/core";
import { jobStatuses, jobFailureCodes } from "../../lib/contracts/jobs";
import { deployedLocales, readPack } from "../../lib/i18n/server";
it("ships all namespaces with equal keys and interpolation variables", async () => {
  expect(await deployedLocales()).toEqual(expect.arrayContaining(["ko", "en"]));
  const ko = await readPack("ko"),
    en = await readPack("en");
  expect(Object.keys(ko).length).toBeGreaterThan(400);
  expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort());
  for (const key of Object.keys(ko)) {
    expect(en[key].trim(), key).not.toBe("");
    expect(variables(en[key]), key).toEqual(variables(ko[key]));
  }
  for (const locale of ["ko", "en"])
    expect(readdirSync(`messages/${locale}`).sort()).toEqual(
      namespaces.map((ns) => `${ns}.json`).sort(),
    );
});
function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sourceFiles(path.join(root, e.name))
      : /\.tsx?$/.test(e.name)
        ? [path.join(root, e.name)]
        : [],
  );
}
it("resolves every static translation call and keeps business fixtures out of packs", async () => {
  const pack = await readPack("ko");
  let calls = 0;
  for (const file of [...sourceFiles("app"), ...sourceFiles("components")]) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: ts.Node) {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(source) === "t" &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        calls++;
        expect(
          pack[node.arguments[0].text],
          `${file}: ${node.arguments[0].text}`,
        ).toBeTruthy();
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(calls).toBeGreaterThan(400);
  expect(
    Object.values(pack).some(
      (v) => v.includes("brand@") || v === "헬로키티 굿즈",
    ),
  ).toBe(false);
});
it("supports loading only the requested namespace", async () => {
  const pack = await readPack("en", ["auth"]);
  expect(Object.keys(pack).every((key) => key.startsWith("auth."))).toBe(true);
  await expect(readPack("../ko")).rejects.toThrow();
});
it("covers every stable enum display key and cardinal plural variants", async () => {
  const pack = await readPack("en");
  for (const [prefix, codes] of Object.entries({
    "common.jobs.status": [...jobStatuses],
    "common.jobs.error": [...jobFailureCodes],
    "projects.status": [
      "preparing",
      "generating",
      "verifying",
      "needs_fix",
      "completed",
    ],
    "assets.stage": ["generated", "verify", "final"],
    "assets.verdict": ["all", "passed", "rejected"],
    "assets.style": [
      "none",
      "flat_vector",
      "line_art",
      "pastel",
      "kitsch",
      "chibi",
      "figure_3d",
      "watercolor",
    ],
    "auth.role": [
      "marketing",
      "design",
      "merchandising",
      "licensing",
      "management",
      "other",
    ],
    "partners.sort": ["overall", "world", "price", "fandom", "industry"],
    "monitoring.platform": ["google", "naver"],
  }))
    for (const code of codes) expect(pack[`${prefix}.${code}`]).toBeTruthy();
});
it("has no unextracted Korean UI literals outside documented business fixtures", () => {
  const exceptions: Record<string, readonly string[]> = {
    "app/(app)/assets/[id]/verify/page-content.tsx": [
      "헬로키티 굿즈",
      "브랜드 가이드 v2",
    ],
    "app/(app)/partners/criteria/page-content.tsx": [
      "산리오 2023",
      "디즈니 2022",
      "카카오 2021",
    ],
    "app/(app)/partners/page-content.tsx": [
      "세계관 적합",
      "가격 적합",
      "팬덤 중첩",
      "업종 연관",
    ],
    "app/(app)/monitoring/[id]/page-content.tsx": [
      "방금",
      "1분 전",
      "2분 전",
      "3분 전",
      "5분 전",
      "6분 전",
      "8분 전",
    ],
    "components/layout/language-switcher.tsx": ["한국어"],
  };
  const untranslated: string[] = [];
  for (const file of [
    ...sourceFiles("app"),
    ...sourceFiles("components/domain"),
    ...sourceFiles("components/layout"),
  ]) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: ts.Node) {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isJsxText(node)
      ) {
        const value = node.text.trim().replace(/\s+/g, " ");
        if (/[가-힣]/.test(value) && !exceptions[file]?.includes(value))
          untranslated.push(`${file}: ${value}`);
      }
      if (
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      )
        if (/[가-힣]/.test(node.text))
          untranslated.push(`${file}: ${node.text}`);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(untranslated).toEqual([]);
});

it("includes admin UI messages in the shared shell and locale-switch payload", async () => {
  expect(uiNamespaces).toContain("admin");
  for (const locale of ["ko", "en"]) {
    const pack = await readPack(locale, uiNamespaces);
    expect(pack["admin.reauth"]).toBeTruthy();
    expect(pack["admin.contentLanguage"]).toBeTruthy();
  }
});


it("delivers public errors to client renderers on initial load and language switches", async () => {
  expect(uiNamespaces).toContain("errors");
  expect(uiNamespaces).not.toContain("email");
  for (const locale of ["ko", "en"]) {
    const pack = await readPack(locale, uiNamespaces);
    expect(pack["errors.NOT_FOUND"]).toBeTruthy();
    expect(pack["errors.SERVICE_UNAVAILABLE"]).toBeTruthy();
  }
});
it("covers dynamic administration columns, tabs, resource types and audit actions", async () => {
  for (const locale of ["ko", "en"]) {
    const pack = await readPack(locale);
    for (const field of ["name","email","org_name","created_at","status","ip_name","archived_at","visibility","kind","attempt","error_code","latest_result_count","action","entity_type","reason","version","email_verified","profile_completed_at","contact_email","tags","ipNames","marketDescription","imageAlt"]) expect(pack[`admin.field.${field}`], field).toBeTruthy();
    for (const tab of ["basic","history","scans","images","translations","operations"]) expect(pack[`admin.${tab}`]).toBeTruthy();
    for (const action of ["admin.read","admin.reauthenticate","user.suspend","user.restore","user.revoke","project.update","partner.create","partner.update","partner.archive","partner.restore","partner.image.add","partner.image.remove","job.retry","job.cancel","monitoring.archive","monitoring.restore","monitoring.scan","locale.update","translation.read","translation.import","translation.publish","translation.unpublish"]) expect(pack[`admin.audit.${action}`]).toBeTruthy();
  }
});

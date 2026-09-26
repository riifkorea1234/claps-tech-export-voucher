import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { namespaces, variables, type Messages, type Namespace } from "./core";
const root = path.join(process.cwd(), "messages");
export async function readPack(
  locale: string,
  selected: readonly Namespace[] = namespaces,
): Promise<Messages> {
  if (!/^[a-zA-Z0-9-]+$/.test(locale)) throw new Error("Invalid language pack");
  const output: Messages = {};
  for (const ns of selected) {
    const content = JSON.parse(
      await readFile(path.join(root, locale, `${ns}.json`), "utf8"),
    );
    for (const [key, value] of Object.entries(content)) {
      if (typeof value !== "string" || !value.trim())
        throw new Error("Invalid language message");
      output[`${ns}.${key}`] = value;
    }
  }
  return output;
}
export async function deployedLocales() {
  const baseline = await readPack("ko");
  const result: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-zA-Z0-9-]+$/.test(entry.name)) continue;
    try {
      const pack = await readPack(entry.name);
      if (
        Object.keys(pack).length !== Object.keys(baseline).length ||
        Object.keys(baseline).some(
          (key) =>
            !pack[key] ||
            JSON.stringify(variables(pack[key])) !==
              JSON.stringify(variables(baseline[key])),
        )
      )
        continue;
      result.push(entry.name);
    } catch {
      /* Incomplete packs must not be selectable. */
    }
  }
  return result;
}

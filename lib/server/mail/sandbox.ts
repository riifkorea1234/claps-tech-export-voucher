import "server-only";
import { mkdir, writeFile, realpath } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readPack, deployedLocales } from "@/lib/i18n/packs";
import { matchLocale } from "@/lib/i18n/core";
import { AppError } from "@/lib/server/errors/http";
export type Mail = { to: string; kind: "verify" | "reset"; locale: string; url: string };
export type Mailer = (mail: Mail) => Promise<void>;
export const sandboxMail: Mailer = async (mail) => {
  if (process.env.MAIL_ADAPTER !== "sandbox" || !process.env.MAIL_SANDBOX_DIR) throw new AppError("SERVICE_UNAVAILABLE");
  const directory = path.resolve(process.env.MAIL_SANDBOX_DIR);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const resolved = await realpath(directory);
  if (["public", ".next", "app"].some(part => resolved === path.resolve(part) || resolved.startsWith(path.resolve(part) + path.sep))) throw new AppError("SERVICE_UNAVAILABLE");
  const locale = matchLocale(mail.locale, await deployedLocales()) ?? "ko";
  const pack = await readPack(locale, ["email"]);
  await writeFile(path.join(resolved, `${randomUUID()}.json`), JSON.stringify({
    ...mail, subject: pack[`email.${mail.kind}Subject`], text: pack[`email.${mail.kind}Body`].replace("{url}", mail.url),
  }), { mode: 0o600, flag: "wx" });
};

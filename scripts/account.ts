import { loadEnvConfig } from "@next/env";
import { authService } from "../lib/server/auth/service";
loadEnvConfig(process.cwd());
async function main() {
  const [action, email] = process.argv.slice(2);
  if ((action !== "promote" && action !== "suspend") || !email) throw new Error("INVALID_ACCOUNT_COMMAND");
  const service = authService();
  try {
    await service.manage(email, action);
    console.log("Account operation completed; sessions revoked and audit recorded.");
  } finally { await service.pool.end(); }
}
main().catch(() => {
  console.error("Account operation failed. Usage: pnpm account <promote|suspend> <email>. Check configuration and account status.");
  process.exitCode = 1;
});

import { AuthShell } from "@/components/layout/auth-shell";
import { AuthFlowForm } from "@/components/domain/auth-flow-form";
import { requirePage } from "@/lib/server/authorization/guards";
export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string; token?: string }> }) {
  await requirePage(false);
  const params = await searchParams;
  return <AuthShell><AuthFlowForm mode="change-password" initialEmail={typeof params.email === "string" ? params.email : ""} token={typeof params.token === "string" ? params.token : ""} /></AuthShell>;
}

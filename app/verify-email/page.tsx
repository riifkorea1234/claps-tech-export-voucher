import { AuthShell } from "@/components/layout/auth-shell";
import { AuthFlowForm } from "@/components/domain/auth-flow-form";
export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string; token?: string }> }) {
  const params = await searchParams;
  return <AuthShell><AuthFlowForm mode="verify-email" initialEmail={typeof params.email === "string" ? params.email : ""} token={typeof params.token === "string" ? params.token : ""} /></AuthShell>;
}

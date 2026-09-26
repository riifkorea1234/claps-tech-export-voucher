import { AuthShell } from "@/components/layout/auth-shell";
import { ProfileSetupForm } from "@/components/domain/profile-setup-form";
import { requirePage } from "@/lib/server/authorization/guards";
export default async function ProfileSetupPage() {
  const user = await requirePage(false);
  return <AuthShell><ProfileSetupForm email={user.email} /></AuthShell>;
}

import { requirePage } from "@/lib/server/authorization/guards";
import { ownedPage } from "@/lib/server/projects/page";
import Content from "./page-content";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePage(); await ownedPage("project", (await params).id);
  return <Content />;
}

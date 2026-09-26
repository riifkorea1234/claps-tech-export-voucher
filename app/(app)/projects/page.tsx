import { requirePage } from "@/lib/server/authorization/guards";
import Content from "./page-content";
export default async function Page() {
  await requirePage();
  return <Content />;
}

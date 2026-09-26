import { requirePage } from "@/lib/server/authorization/guards";
import Content from "./page-content";
export default async function Page(props: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; fromLabel?: string }> }) { await requirePage(); return <Content {...props} />; }

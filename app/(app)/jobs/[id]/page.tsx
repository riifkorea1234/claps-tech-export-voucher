import { JobStatusPanel } from "@/components/domain/job-status-panel";
export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobStatusPanel key={id} id={id} />;
}

"use client";
import Link from "next/link";
import { ExportDownload } from "./export-download";
import { useJob } from "@/lib/api/jobs";
import { useLanguage } from "@/lib/i18n/provider";
import { terminal } from "@/lib/contracts/jobs";
import { Button } from "@/components/ui/button";
export function JobStatusPanel({ id }: { id: string }) {
  const { locale, t } = useLanguage(), { job, error, canceling, cancel, refresh } = useJob(id, locale);
  return <section className="mx-auto max-w-xl space-y-4 p-6" aria-label={t("common.jobs.title")}>
    <h1 className="text-xl font-semibold">{t("common.jobs.title")}</h1>
    {error && <div role="alert"><p>{t("common.jobs.loadError")}</p><Button variant="outline" onClick={refresh}>{t("common.jobs.reload")}</Button></div>}
    {!job && !error && <p role="status">{t("common.jobs.loading")}</p>}
    {job && <>
      <p role="status">{t(`common.jobs.status.${job.status}`)}</p>
      {job.cancelRequested && job.status === "running" && <p>{t("common.jobs.cancelRequested")}</p>}
      {job.errorCode && <p>{t(`common.jobs.error.${job.errorCode}`)}</p>}
      {job.costState === "unknown" && <p>{t("common.jobs.costUnknown")}</p>}
      {job.canRetry && <p>{t("common.jobs.retryAvailable")}</p>}
      {job.retryJobId && <Link className="underline" href={`/jobs/${job.retryJobId}`}>{t("common.jobs.retryJob")}</Link>}
      {job.kind === "export" && job.status === "succeeded" && <ExportDownload id={job.id} />}
      {!terminal(job.status) && <Button variant="outline" disabled={canceling || job.cancelRequested} onClick={() => void cancel()}>{t("common.jobs.cancel")}</Button>}
    </>}
  </section>;
}

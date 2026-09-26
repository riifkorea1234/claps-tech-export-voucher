import "server-only";
import { exportRequest } from "../../contracts/exports";
import { parseJobInput } from "../../contracts/jobs";
import { AppError } from "../errors/http";
import { WorkspaceService } from "../projects/service";
import { JobService, jobDto } from "../jobs/service";
import type { JobRow } from "../jobs/types";
import { exportAssets } from "./guards";
import { issueFileUrl } from "../storage/service";
import { exportDownloadFile } from "./download";
export class ExportService {
  constructor(readonly workspace: WorkspaceService, readonly jobs: JobService) {}
  request(raw: string | undefined, data: unknown) {
    const d = exportRequest.parse(data), assetIds = [...d.assetIds].sort();
    return this.workspace.run(raw, async (c, owner) => {
      const { rows: [existing] } = await c.query<JobRow>("SELECT * FROM jobs WHERE owner_id=$1 AND kind='export' AND idempotency_key=$2", [owner, d.idempotencyKey]);
      if (existing) {
        if (existing.input.kind !== "export" || existing.input.outputLocale !== d.outputLocale || JSON.stringify(existing.input.assetIds) !== JSON.stringify(assetIds)) throw new AppError("IDEMPOTENCY_CONFLICT");
        return jobDto(existing, this.jobs.policy);
      }
      if (!this.jobs.registry.get("export")) throw new AppError("SERVICE_UNAVAILABLE");
      const assets = [];
      for (const id of assetIds) { const a = await this.workspace.assetRow(c, owner, id); assets.push({ id, version: a.version }); }
      const input = parseJobInput({ schemaVersion: 1, kind: "export", assetIds, assets, outputLocale: d.outputLocale });
      if (input.kind !== "export") throw new AppError("VALIDATION_ERROR");
      const { project } = await exportAssets(c, owner, input);
      return jobDto(await this.jobs.insert(c, owner, input, d.idempotencyKey, project), this.jobs.policy);
    });
  }
  download(raw: string | undefined, id: string) {
    return this.workspace.run(raw, async (c, owner) => {
      const { expiresAt } = await exportDownloadFile(c, owner, id);
      return { downloadUrl: `${await issueFileUrl(c, owner, "job", id, "original")}?download=1`, expiresAt };
    });
  }
}

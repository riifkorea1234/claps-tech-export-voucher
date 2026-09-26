import { workspaceRequest, queryString } from "./api/workspace";
import type { PageResult, ProjectDto, ProjectInput, ProjectPatch, ProjectStats, AssetDto } from "./contracts/workspace";
export const listProjects = (query = {}) => workspaceRequest<PageResult<ProjectDto>>(`/api/projects?${queryString(query)}`);
export const getProject = (id: string) => workspaceRequest<ProjectDto>(`/api/projects/${encodeURIComponent(id)}`);
export const addProject = (input: ProjectInput) => workspaceRequest<ProjectDto>("/api/projects", "POST", input);
export const updateProject = (id: string, patch: ProjectPatch) => workspaceRequest<ProjectDto>(`/api/projects/${id}`, "PATCH", patch);
export const deleteProject = (id: string, version: number) => workspaceRequest<ProjectDto>(`/api/projects/${id}`, "DELETE", { version });
export const getProjectStats = () => workspaceRequest<ProjectStats>("/api/projects/stats");
export const getProjectLibrary = (id: string) => workspaceRequest<AssetDto[]>(`/api/projects/${id}/library`);
// Selectors load all pages explicitly; list screens use listProjects pagination.
export async function getProjects() {
  const items: ProjectDto[] = []; let page = 1;
  for (;;) { const data = await listProjects({ page, pageSize: 100 }); items.push(...data.items); if (page >= data.totalPages) return items; page++; }
}
export async function uploadCover(id: string, version: number, file: File) {
  const ticket = await workspaceRequest<{ ticket: string; uploadUrl: string }>("/api/uploads", "POST", { projectId: id, name: file.name, size: file.size, mime: file.type });
  const response = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type, "X-Claps-Locale": document.documentElement.lang }, body: file, credentials: "same-origin" });
  if (!response.ok) { const body = await response.json(); throw new Error(body.error.message); }
  return updateProject(id, { version, cover: { kind: "upload", ticket: ticket.ticket } });
}

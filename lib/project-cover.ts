import type { ProjectCover } from "./mock/projects";
export { getProjectLibrary } from "./projects-store";
// Server resolves manual cover > latest final asset > default.
export function resolveProjectCover(_id: string, cover?: ProjectCover) { return cover; }

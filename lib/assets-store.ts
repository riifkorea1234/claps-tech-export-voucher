import { workspaceRequest, queryString } from "./api/workspace";
import type { PageResult, SessionDto, SessionPatch } from "./contracts/workspace";
export const listSessions = (query = {}) => workspaceRequest<PageResult<SessionDto>>(`/api/asset-sessions?${queryString(query)}`);
export const getSession = (id: string) => workspaceRequest<SessionDto>(`/api/asset-sessions/${id}`);
export const createSession = (title: string, projectId?: string) => workspaceRequest<SessionDto>("/api/asset-sessions", "POST", { title, projectId });
export const updateSession = (id: string, patch: SessionPatch) => workspaceRequest<SessionDto>(`/api/asset-sessions/${id}`, "PATCH", patch);
export const deleteSession = (id: string, version: number) => workspaceRequest<SessionDto>(`/api/asset-sessions/${id}`, "DELETE", { version });

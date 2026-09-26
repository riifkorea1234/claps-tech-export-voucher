"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { workspaceRequest } from "@/lib/api/workspace";
import { ApiClientError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
export function useRemote<T>(path: string) {
  const [state, setState] = useState<{ path: string; data?: T; error?: Error }>({ path });
  const [revision, refresh] = useState(0);
  useEffect(() => {
    let active = true;
    workspaceRequest<T>(path).then(data => { if (active) setState({ path, data }); }, error => { if (active) setState({ path, error }); });
    return () => { active = false; };
  }, [path, revision]);
  return { data: state.path === path ? state.data : undefined, error: state.path === path ? state.error : undefined, reload: useCallback(() => refresh(n => n + 1), []) };
}
export function useWorkspaceMutation(reload?: () => void) {
  const ref = useRef(false); const [pending, setPending] = useState(false); const [error, setError] = useState<Error>();
  async function run(action: () => Promise<unknown>) {
    if (ref.current) return false;
    ref.current = true; setPending(true); setError(undefined);
    try { await action(); reload?.(); return true; }
    catch (e) { setError(e instanceof Error ? e : new Error()); return false; }
    finally { ref.current = false; setPending(false); }
  }
  return { run, pending, error };
}
export function WorkspaceError({ error, retry }: { error?: Error; retry?: () => void }) {
  const t = useT(); if (!error) return null;
  const message = error instanceof ApiClientError ? t(`errors.${error.code}`) : error.message || t("errors.SERVICE_UNAVAILABLE");
  return <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"><span>{message}</span>{retry && <Button variant="outline" onClick={retry}>{t("common.retry")}</Button>}</div>;
}
export function WorkspaceLoading() { const t = useT(); return <p role="status" className="p-6 text-sm text-muted-foreground">{t("common.loading")}</p>; }

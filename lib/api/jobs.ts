"use client";
import { useEffect, useState, useCallback } from "react";
import { apiRequest, ApiClientError } from "./client";
import { jobDtoSchema, terminal, type JobDto } from "../contracts/jobs";
export function useJob(id: string, locale: string) {
  const [state, setState] = useState<{ id: string; job: JobDto | null; error: string | null; canceling: boolean }>({ id, job: null, error: null, canceling: false });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const { data } = await apiRequest(`/api/jobs/${encodeURIComponent(id)}`, { schema: jobDtoSchema, locale: locale, signal: controller.signal });
        if (controller.signal.aborted) return;
        setState({ id, job: data, error: null, canceling: false });
        if (!terminal(data.status)) timer = setTimeout(poll, 1500);
      } catch (error) {
        if (controller.signal.aborted) return;
        setState(old => ({ id, job: old.id === id ? old.job : null, error: error instanceof ApiClientError ? error.code : "SERVICE_UNAVAILABLE", canceling: false }));
        // Auth/ownership failures stop. Transient failures preserve the last state and back off.
        if (!(error instanceof ApiClientError) || ![401, 403, 404, 422].includes(error.status)) timer = setTimeout(poll, 5000);
      }
    }
    void poll(); return () => { controller.abort(); clearTimeout(timer); };
  }, [id, locale, revision]);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  async function cancel() {
    if (state.canceling) return;
    setState(old => ({ ...old, canceling: true, error: null }));
    try {
      const { data } = await apiRequest(`/api/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST", body: "{}", schema: jobDtoSchema, locale: locale });
      setState(old => old.id === id ? { id, job: data, error: null, canceling: false } : old); refresh();
    } catch (error) { setState(old => old.id === id ? { ...old, canceling: false, error: error instanceof ApiClientError ? error.code : "SERVICE_UNAVAILABLE" } : old); }
  }
  return { job: state.id === id ? state.job : null, error: state.id === id ? state.error : null, canceling: state.canceling, cancel, refresh };
}

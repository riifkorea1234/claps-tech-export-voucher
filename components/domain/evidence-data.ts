"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCertificate, getEvidence } from "@/lib/api/evidence";
import type { CertificateDto } from "@/lib/contracts/evidence";
import { mergeEvidence, type EvidenceEvent, type EvidencePage } from "@/lib/evidence-view";
export function useEvidence(sessionId: string, revision = 0) {
  const [state, setState] = useState<{ sessionId: string; revision: number; items: EvidenceEvent[]; history?: EvidencePage["history"]; nextCursor?: string | null; error?: Error; pending: boolean }>({ sessionId, revision, items: [], pending: true });
  const [retry, setRetry] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    const abort = new AbortController(); controller.current = abort; busy.current = true;
    getEvidence(sessionId, undefined, 30, abort.signal).then(page => {
      if (!abort.signal.aborted) setState({ sessionId, revision, ...page, pending: false });
    }, error => { if (!abort.signal.aborted) setState({ sessionId, revision, items: [], pending: false, error }); }).finally(() => { if (!abort.signal.aborted) busy.current = false; });
    return () => abort.abort();
  }, [sessionId, revision, retry]);
  const current = state.sessionId === sessionId && state.revision === revision ? state : { sessionId, revision, items: [], pending: true };
  const loadMore = useCallback(async () => {
    if (busy.current || !state.nextCursor || state.sessionId !== sessionId || state.revision !== revision) return;
    busy.current = true; const abort = controller.current!;
    setState(old => ({ ...old, pending: true, error: undefined }));
    try {
      const page = await getEvidence(sessionId, state.nextCursor, 30, abort.signal);
      if (!abort.signal.aborted) setState(old => ({ ...old, ...page, items: mergeEvidence(old.items, page), pending: false }));
    } catch (error) { if (!abort.signal.aborted) setState(old => ({ ...old, pending: false, error: error instanceof Error ? error : new Error() })); }
    finally { if (!abort.signal.aborted) busy.current = false; }
  }, [sessionId, revision, state]);
  return { ...current, loadMore, reload: () => { controller.current?.abort(); busy.current = false; setState({ sessionId, revision, items: [], pending: true }); setRetry(n => n + 1); } };
}
export type EvidenceResource = ReturnType<typeof useEvidence>;
export function useCertificate(assetId: string) {
  const [state, setState] = useState<{ id: string; data?: CertificateDto; error?: Error }>({ id: assetId });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!assetId) return;
    const abort = new AbortController();
    getCertificate(assetId, abort.signal).then(data => { if (!abort.signal.aborted) setState({ id: assetId, data }); }, error => { if (!abort.signal.aborted) setState({ id: assetId, error }); });
    return () => abort.abort();
  }, [assetId, retry]);
  return { ...(state.id === assetId ? state : { id: assetId }), reload: () => { setState({ id: assetId }); setRetry(n => n + 1); } };
}

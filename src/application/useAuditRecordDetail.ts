/**
 * application/useAuditRecordDetail — HU-AUD-005 E3 (GET /audit-records/{id}).
 *
 * Separate from the list hook on purpose: the detail fetch has its own
 * lifecycle (idle → loading → success/error) and is driven by row selection.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AuditRecord } from '../domain/audit.js';
import { AuditApiError, type AuditRepository } from './ports/audit-port.js';

export type AuditDetailStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseAuditRecordDetailResult {
  selectedId: string | null;
  record: AuditRecord | null;
  status: AuditDetailStatus;
  error: AuditApiError | null;
  select: (id: string | null) => void;
  close: () => void;
  retry: () => void;
}

export function useAuditRecordDetail(
  repository: AuditRepository,
): UseAuditRecordDetailResult {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [record, setRecord] = useState<AuditRecord | null>(null);
  const [status, setStatus] = useState<AuditDetailStatus>('idle');
  const [error, setError] = useState<AuditApiError | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const requestId = useRef(0);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const close = useCallback(() => {
    requestId.current += 1;
    setSelectedId(null);
    setRecord(null);
    setStatus('idle');
    setError(null);
  }, []);

  const retry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    const id = ++requestId.current;
    const controller = new AbortController();
    setStatus('loading');
    setError(null);
    void repository
      .getRecord(selectedId, { signal: controller.signal })
      .then((result) => {
        if (requestId.current !== id) return;
        setRecord(result);
        setStatus('success');
      })
      .catch((unknownError: unknown) => {
        if (requestId.current !== id) return;
        if (controller.signal.aborted) return;
        setError(
          unknownError instanceof AuditApiError
            ? unknownError
            : new AuditApiError('Error desconocido al cargar el registro.'),
        );
        setStatus('error');
      });
    return () => {
      controller.abort();
    };
  }, [repository, selectedId, retryToken]);

  return { selectedId, record, status, error, select, close, retry };
}

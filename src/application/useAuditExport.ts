/**
 * application/useAuditExport — HU-AUD-002 export mechanics (E4 states).
 *
 * Owns ONLY the export lifecycle (idle → exporting → success/error). It does
 * NOT own filter state: the caller passes the filters object owned by
 * useAuditRecordsQuery, so list and export can never diverge (E1).
 * Read-only like everything in this MFE: export never mutates records.
 */
import { useCallback, useRef, useState } from 'react';

import { DEFAULT_EXPORT_FORMAT, type AuditExportFormat } from '../domain/audit-export.js';
import type { AuditFilters } from '../domain/audit.js';
import { AuditApiError, type AuditRepository, type FileDownloader } from './ports/audit-port.js';

export type AuditExportStatus = 'idle' | 'exporting' | 'success' | 'error';

export interface UseAuditExportResult {
  status: AuditExportStatus;
  error: AuditApiError | null;
  /** Exports with the given (shared) filters; downloads on success. */
  exportNow: (
    filters: AuditFilters,
    format?: AuditExportFormat,
  ) => Promise<void>;
  reset: () => void;
}

export function useAuditExport(
  repository: AuditRepository,
  downloader: FileDownloader,
): UseAuditExportResult {
  const [status, setStatus] = useState<AuditExportStatus>('idle');
  const [error, setError] = useState<AuditApiError | null>(null);
  const requestId = useRef(0);

  const reset = useCallback(() => {
    requestId.current += 1;
    setStatus('idle');
    setError(null);
  }, []);

  const exportNow = useCallback(
    async (
      filters: AuditFilters,
      format: AuditExportFormat = DEFAULT_EXPORT_FORMAT,
    ): Promise<void> => {
      const id = ++requestId.current;
      setStatus('exporting');
      setError(null);
      try {
        const result = await repository.exportRecords({ filters, format });
        if (requestId.current !== id) return;
        downloader.save({
          filename: result.filename,
          mimeType: result.mimeType,
          text: result.text,
        });
        setStatus('success');
      } catch (unknownError: unknown) {
        if (requestId.current !== id) return;
        setError(
          unknownError instanceof AuditApiError
            ? unknownError
            : new AuditApiError('No se pudo exportar la auditoría.'),
        );
        setStatus('error');
      }
    },
    [repository, downloader],
  );

  return { status, error, exportNow, reset };
}

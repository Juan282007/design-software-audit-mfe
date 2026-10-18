/**
 * application/ports/audit-port — outbound port consumed by the use-case hooks.
 *
 * adapter/out provides the implementations (mock today, HTTP via
 * frontend-platform tomorrow). Components and hooks never touch fetch.
 */
import type {
  AuditFilters,
  AuditRecord,
  AuditRecordSummary,
  CursorPage,
} from '../../domain/audit.js';
import type { AuditExportFormat } from '../../domain/audit-export.js';

export interface AuditListParams {
  filters: AuditFilters;
  cursor?: string | null;
  limit: number;
  signal?: AbortSignal;
}

export interface AuditListResult {
  records: AuditRecordSummary[];
  pagination: CursorPage;
}

/** Read-only audit repository (audit_record is append-only). */
export interface AuditRepository {
  listRecords(params: AuditListParams): Promise<AuditListResult>;
  getRecord(id: string, options?: { signal?: AbortSignal }): Promise<AuditRecord>;
  exportRecords(params: AuditExportParams): Promise<AuditExportResult>;
}

export interface AuditExportParams {
  /** The SAME filter state object owned by useAuditRecordsQuery (E1). */
  filters: AuditFilters;
  format: AuditExportFormat;
  signal?: AbortSignal;
}

/** File content as text; the hook/downloader turns it into a Blob download. */
export interface AuditExportResult {
  format: AuditExportFormat;
  filename: string;
  mimeType: string;
  text: string;
}

/** Browser file save, implemented in adapter/out (stubbed in tests). */
export interface FileDownloader {
  save(download: { filename: string; mimeType: string; text: string }): void;
}

/** Typed HTTP failure surfaced by repository implementations. */
export class AuditApiError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = 'AuditApiError';
    this.status = options?.status;
    this.code = options?.code;
  }

  /** 401/403 = missing permission (RBAC feature AUDIT_LOG_VIEW), not a bug. */
  isForbidden(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/**
 * domain/audit-export — pure export rules (HU-AUD-002).
 *
 * No React, no fetch, no DOM. The export reuses the SAME filter state as the
 * listing (E1): params are derived from AuditFilters, never duplicated.
 */
import { toListQueryParams, type AuditFilters } from './audit.js';

/** Export formats confirmed in audit.yaml (default csv). */
export type AuditExportFormat = 'csv' | 'json';

export const DEFAULT_EXPORT_FORMAT: AuditExportFormat = 'csv';

export interface ExportQueryOptions {
  format: AuditExportFormat;
}

/**
 * Query params for GET /audit-records/export: exactly the listing filters
 * (same names, E1) plus `format`. No cursor/limit — export is uncursored.
 * Empty filters are omitted (E2: export without filters has no filter params).
 */
export function toExportQueryParams(
  filters: AuditFilters,
  options: ExportQueryOptions,
): Record<string, string> {
  // Same mapping as the listing (same names, E1); export takes no cursor.
  const params = toListQueryParams(filters, { limit: 1 });
  delete params['cursor'];
  delete params['limit'];
  return { format: options.format, ...params };
}

function toCompactDay(isoDate: string): string {
  return isoDate.replaceAll('-', '');
}

/**
 * Recognizable filename: domain + date range when it applies.
 * e.g. auditoria-desde-20260801-hasta-20260806.csv
 */
export function buildExportFilename(
  filters: AuditFilters,
  format: AuditExportFormat,
): string {
  const parts = ['auditoria'];
  if (filters.from !== '') parts.push(`desde-${toCompactDay(filters.from)}`);
  if (filters.to !== '') parts.push(`hasta-${toCompactDay(filters.to)}`);
  return `${parts.join('-')}.${format}`;
}

const CSV_COLUMNS = [
  'id',
  'event_id',
  'event_type',
  'source_service',
  'actor_id',
  'entity_type',
  'entity_id',
  'event_occurred_at',
  'received_at',
] as const;

export interface ExportableRecord {
  id: string;
  eventId: string;
  eventType: string;
  sourceService: string;
  actorId: string | null;
  entityType: string | null;
  entityId: string | null;
  eventOccurredAt: string | null;
  receivedAt: string;
}

function csvCell(value: string | null): string {
  if (value === null) return '';
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Builds the CSV body (header + one row per record). Pure, testable. */
export function buildExportCsv(records: ExportableRecord[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const record of records) {
    lines.push(
      [
        csvCell(record.id),
        csvCell(record.eventId),
        csvCell(record.eventType),
        csvCell(record.sourceService),
        csvCell(record.actorId),
        csvCell(record.entityType),
        csvCell(record.entityId),
        csvCell(record.eventOccurredAt),
        csvCell(record.receivedAt),
      ].join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

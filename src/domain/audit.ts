/**
 * domain/audit — pure audit-trail models and UI rules.
 *
 * No React, no fetch, no browser APIs. Safe to unit-test in isolation
 * (ADR-009 §3: domain never imports React or any HTTP client).
 */

/** Normalized audit_record row (no payload), camelCase for UI use. */
export interface AuditRecordSummary {
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

/** Full audit record including the opaque event payload. */
export interface AuditRecord extends AuditRecordSummary {
  payload: Record<string, unknown>;
}

/**
 * Combinable list filters. Field names are UI-side; the exact HTTP query-param
 * names (actor_id, event_type, …) are applied in `toListQueryParams`, so this
 * shape can be reused by HU-AUD-002 (export) without duplication.
 */
export interface AuditFilters {
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  sourceService: string;
  /** ISO date (yyyy-mm-dd) — start of the received_at range, inclusive. */
  from: string;
  /** ISO date (yyyy-mm-dd) — end of the received_at range, exclusive. */
  to: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  actorId: '',
  eventType: '',
  entityType: '',
  entityId: '',
  sourceService: '',
  from: '',
  to: '',
};

/** Cursor page metadata (mirrors contract CursorPagination). */
export interface CursorPage {
  nextCursor: string | null;
  limit: number;
  hasMore: boolean;
}

export const DEFAULT_AUDIT_LIMIT = 10;
export const AUDIT_LIMIT_OPTIONS = [10, 20, 50] as const;

/** Emitter services known to the platform (select options for the filter). */
export const AUDIT_SOURCE_SERVICES = [
  'scheduling-service',
  'iam-service',
  'document-service',
  'monitoring-service',
  'reference-data-service',
  'academic-management-service',
  'training-environment-service',
  'actors-service',
  'notification-service',
] as const;

export function hasActiveFilters(filters: AuditFilters): boolean {
  return Object.values(filters).some((value) => value.trim() !== '');
}

/**
 * A date range is valid when empty, half-open, or from <= to.
 * Day granularity: comparing yyyy-mm-dd strings is chronological.
 */
export function isValidDateRange(from: string, to: string): boolean {
  if (from === '' || to === '') return true;
  return from <= to;
}

const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Formats an ISO timestamp like the mockup: "06/08/2026, 08:45". */
export function formatAuditDateTime(iso: string | null): string {
  if (iso === null || iso === '') return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

/** Short display form of a UUID (first 8 chars). */
export function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export type ActorDirectory = Readonly<Record<string, string>>;

/**
 * Actor cell label. The contract only carries actor_id (UUID); human names
 * live in other domains and arrive via BFF/read-model composition, so an
 * optional directory resolves known UUIDs. Null actor = system action.
 */
export function actorLabel(
  actorId: string | null,
  directory?: ActorDirectory,
): string {
  if (actorId === null) return 'Sistema';
  const known = directory?.[actorId];
  if (known) return known;
  return `Actor ${shortId(actorId)}`;
}

/** Entity cell label ("type · short-id"), em dash when unknown. */
export function entityLabel(
  entityType: string | null,
  entityId: string | null,
): string {
  if (entityType === null && entityId === null) return '—';
  const type = entityType ?? '—';
  const id = entityId === null ? '—' : shortId(entityId);
  return `${type} · ${id}`;
}

export interface ListQueryOptions {
  cursor?: string | null;
  limit: number;
}

/**
 * Maps UI filters to the EXACT query-param names of
 * GET /audit-records (audit.yaml). Empty values are omitted.
 * NOTE: the contract has no correlation param (no correlation_id column),
 * so the mockup's "Correlación" filter is intentionally unsupported.
 */
export function toListQueryParams(
  filters: AuditFilters,
  options: ListQueryOptions,
): Record<string, string> {
  const params: Record<string, string> = {};
  const set = (key: string, value: string): void => {
    const trimmed = value.trim();
    if (trimmed !== '') params[key] = trimmed;
  };
  set('actor_id', filters.actorId);
  set('source_service', filters.sourceService);
  set('event_type', filters.eventType);
  set('entity_type', filters.entityType);
  set('entity_id', filters.entityId);
  if (filters.from !== '') params['from'] = startOfDayIso(filters.from);
  // `to` is exclusive per contract: send end-of-day so the whole Hasta day
  // is included, matching what the date picker promises.
  if (filters.to !== '') params['to'] = endOfDayIso(filters.to);
  if (options.cursor) params['cursor'] = options.cursor;
  params['limit'] = String(options.limit);
  return params;
}

function startOfDayIso(day: string): string {
  return `${day}T00:00:00.000Z`;
}

function endOfDayIso(day: string): string {
  return `${day}T23:59:59.999Z`;
}

/**
 * adapter/out/mock-audit-repository — burned-in data until audit-service exists.
 *
 * Implements the AuditRepository port with the SAME semantics the real
 * backend will expose (audit.yaml + audit-query-api contract):
 * - received_at DESC order, cursor pagination (cursor/limit)
 * - exact match on actor_id / entity_id / source_service
 * - contains (case-insensitive) on event_type / entity_type (mock leniency;
 *   the backend matches these exactly via B-Tree indexes)
 * - from inclusive / to exclusive over received_at
 *
 * Swap: resolveAuditRepository() in ./audit-repository-factory.js returns this
 * mock while VITE_AUDIT_API_URL is unset; setting that env var switches the
 * MFE to the real HTTP repository with zero UI changes.
 */
import type {
  ActorDirectory,
  AuditFilters,
  AuditRecord,
  AuditRecordSummary,
} from '../../domain/audit.js';
import { toListQueryParams } from '../../domain/audit.js';
import {
  buildExportCsv,
  buildExportFilename,
  type ExportableRecord,
} from '../../domain/audit-export.js';
import {
  AuditApiError,
  type AuditExportParams,
  type AuditExportResult,
  type AuditListParams,
  type AuditListResult,
  type AuditRepository,
} from '../../application/ports/audit-port.js';

export const ACTOR_MARIA_GARCIA = '11111111-1111-4111-8111-111111111111';
export const ACTOR_CARLOS_RAMIREZ = '22222222-2222-4222-8222-222222222222';
export const ACTOR_JUAN_PEREZ = '33333333-3333-4333-8333-333333333333';
export const ACTOR_ANA_TORRES = '44444444-4444-4444-8444-444444444444';
export const ACTOR_DIEGO_CASTRO = '55555555-5555-4555-8555-555555555555';

/**
 * Stand-in for the BFF/read-model join that will resolve actor UUIDs to
 * display names (names live in iam/actors domains, not in audit_record).
 * Delete this directory when the composition layer provides names.
 */
export const BURNED_ACTOR_DIRECTORY: ActorDirectory = {
  [ACTOR_MARIA_GARCIA]: 'María García',
  [ACTOR_CARLOS_RAMIREZ]: 'Carlos Ramírez',
  [ACTOR_JUAN_PEREZ]: 'Juan Pérez',
  [ACTOR_ANA_TORRES]: 'Ana Torres',
  [ACTOR_DIEGO_CASTRO]: 'Diego Castro',
};

function summary(
  id: string,
  eventId: string,
  eventType: string,
  sourceService: string,
  actorId: string | null,
  entityType: string | null,
  entityId: string | null,
  eventOccurredAt: string | null,
  receivedAt: string,
): AuditRecordSummary {
  return {
    id,
    eventId,
    eventType,
    sourceService,
    actorId,
    entityType,
    entityId,
    eventOccurredAt,
    receivedAt,
  };
}

interface BurnedRow extends AuditRecordSummary {
  payload: Record<string, unknown>;
}

function row(
  base: AuditRecordSummary,
  payload: Record<string, unknown>,
): BurnedRow {
  return { ...base, payload };
}

/** Burned rows, newest first (received_at DESC, as the API orders them). */
export const MOCK_AUDIT_RECORDS: BurnedRow[] = [
  row(
    summary(
      'a0000000-0000-4000-8000-000000000001',
      'e0000000-0000-4000-8000-000000000001',
      'SCHEDULE_PUBLISHED',
      'scheduling-service',
      ACTOR_MARIA_GARCIA,
      'schedule',
      '90000000-0000-4000-8000-000000000003',
      '2026-08-06T08:45:00-05:00',
      '2026-08-06T08:45:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000001',
      event_type: 'SCHEDULE_PUBLISHED',
      entity_type: 'schedule',
      entity_id: '90000000-0000-4000-8000-000000000003',
      actor_id: ACTOR_MARIA_GARCIA,
      changes: { status: ['UNDER_REVIEW', 'PUBLISHED'] },
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000002',
      'e0000000-0000-4000-8000-000000000002',
      'USER_ROLE_ASSIGNED',
      'iam-service',
      ACTOR_CARLOS_RAMIREZ,
      'user',
      '90000000-0000-4000-8000-000000000002',
      '2026-08-05T16:02:00-05:00',
      '2026-08-05T16:02:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000002',
      event_type: 'USER_ROLE_ASSIGNED',
      entity_type: 'user',
      entity_id: '90000000-0000-4000-8000-000000000002',
      actor_id: ACTOR_CARLOS_RAMIREZ,
      changes: { role: [null, 'COORDINATOR'] },
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000003',
      'e0000000-0000-4000-8000-000000000003',
      'DOCUMENT_GENERATION_FAILED',
      'document-service',
      null,
      'document',
      '90000000-0000-4000-8000-000000000003',
      '2026-08-05T15:32:00-05:00',
      '2026-08-05T15:32:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000003',
      event_type: 'DOCUMENT_GENERATION_FAILED',
      entity_type: 'document',
      entity_id: '90000000-0000-4000-8000-000000000003',
      error_code: 'RENDER_TIMEOUT',
      trace_id: 'b3f1c2a4-9e21-4d3a-8f0c-1a2b3c4d5e6f',
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000004',
      'e0000000-0000-4000-8000-000000000004',
      'CONFLICT_RESOLVED',
      'scheduling-service',
      ACTOR_MARIA_GARCIA,
      'scheduling_conflict',
      '90000000-0000-4000-8000-000000000004',
      '2026-08-04T12:18:00-05:00',
      '2026-08-04T12:18:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000004',
      event_type: 'CONFLICT_RESOLVED',
      entity_type: 'scheduling_conflict',
      entity_id: '90000000-0000-4000-8000-000000000004',
      actor_id: ACTOR_MARIA_GARCIA,
      resolution: {
        reason: 'Se reprogramó la sesión al viernes y se notificó a la ficha.',
      },
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000005',
      'e0000000-0000-4000-8000-000000000005',
      'CLASS_SESSION_CANCELLED',
      'scheduling-service',
      ACTOR_JUAN_PEREZ,
      'class_session',
      '90000000-0000-4000-8000-000000000005',
      '2026-08-03T17:38:00-05:00',
      '2026-08-03T17:40:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000005',
      event_type: 'CLASS_SESSION_CANCELLED',
      entity_type: 'class_session',
      entity_id: '90000000-0000-4000-8000-000000000005',
      actor_id: ACTOR_JUAN_PEREZ,
      changes: { status: ['ACTIVE', 'CANCELLED'] },
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000006',
      'e0000000-0000-4000-8000-000000000006',
      'DOCUMENT_GENERATED',
      'document-service',
      null,
      'document',
      '90000000-0000-4000-8000-000000000001',
      '2026-08-03T09:05:00-05:00',
      '2026-08-03T09:05:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000006',
      event_type: 'DOCUMENT_GENERATED',
      entity_type: 'document',
      entity_id: '90000000-0000-4000-8000-000000000001',
      output_type: 'PDF',
      version_number: 3,
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000007',
      'e0000000-0000-4000-8000-000000000007',
      'USER_DEACTIVATED',
      'iam-service',
      ACTOR_ANA_TORRES,
      'user',
      '90000000-0000-4000-8000-000000000005',
      '2026-08-01T11:20:00-05:00',
      '2026-08-01T11:20:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000007',
      event_type: 'USER_DEACTIVATED',
      entity_type: 'user',
      entity_id: '90000000-0000-4000-8000-000000000005',
      actor_id: ACTOR_ANA_TORRES,
      changes: { is_active: [true, false] },
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000008',
      'e0000000-0000-4000-8000-000000000008',
      'KPI_THRESHOLD_BREACHED',
      'monitoring-service',
      null,
      null,
      null,
      null,
      '2026-07-31T22:14:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000008',
      event_type: 'KPI_THRESHOLD_BREACHED',
      kpi: 'ATTENDANCE_RATE',
      threshold: 0.85,
      observed: 0.79,
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000009',
      'e0000000-0000-4000-8000-000000000009',
      'CATALOG_UPDATED',
      'reference-data-service',
      ACTOR_ANA_TORRES,
      'catalog',
      '90000000-0000-4000-8000-000000000009',
      '2026-07-30T15:00:00-05:00',
      '2026-07-30T15:00:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000009',
      event_type: 'CATALOG_UPDATED',
      entity_type: 'catalog',
      entity_id: '90000000-0000-4000-8000-000000000009',
      actor_id: ACTOR_ANA_TORRES,
      changes: { code: 'SHIFT', values_added: ['MIXTA'] },
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000010',
      'e0000000-0000-4000-8000-000000000010',
      'AVAILABILITY_CHANGED',
      'training-environment-service',
      ACTOR_DIEGO_CASTRO,
      'environment',
      '90000000-0000-4000-8000-000000000010',
      '2026-07-29T10:26:00-05:00',
      '2026-07-29T10:26:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000010',
      event_type: 'AVAILABILITY_CHANGED',
      entity_type: 'environment',
      entity_id: '90000000-0000-4000-8000-000000000010',
      actor_id: ACTOR_DIEGO_CASTRO,
      changes: { available: [true, false] },
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000011',
      'e0000000-0000-4000-8000-000000000011',
      'SCHEDULE_CREATED',
      'scheduling-service',
      ACTOR_MARIA_GARCIA,
      'schedule',
      '90000000-0000-4000-8000-000000000001',
      '2026-07-28T08:12:00-05:00',
      '2026-07-28T08:12:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000011',
      event_type: 'SCHEDULE_CREATED',
      entity_type: 'schedule',
      entity_id: '90000000-0000-4000-8000-000000000001',
      actor_id: ACTOR_MARIA_GARCIA,
      changes: { status: [null, 'DRAFT'] },
    },
  ),
  row(
    summary(
      'a0000000-0000-4000-8000-000000000012',
      'e0000000-0000-4000-8000-000000000012',
      'LEARNER_ENROLLED',
      'actors-service',
      ACTOR_CARLOS_RAMIREZ,
      'learner',
      '90000000-0000-4000-8000-000000000012',
      '2026-07-27T14:55:00-05:00',
      '2026-07-27T14:55:00-05:00',
    ),
    {
      event_id: 'e0000000-0000-4000-8000-000000000012',
      event_type: 'LEARNER_ENROLLED',
      entity_type: 'learner',
      entity_id: '90000000-0000-4000-8000-000000000012',
      actor_id: ACTOR_CARLOS_RAMIREZ,
      ficha: '2874412',
    },
  ),
];

export interface MockAuditRepositoryOptions {
  /** Simulated latency per call (ms). Use 0 in tests. Default 120. */
  latencyMs?: number;
  /** When set, the next call fails with this error (then clears). */
  failNext?: AuditApiError | null;
}

export function encodeCursor(receivedAt: string, id: string): string {
  return btoa(`${receivedAt}|${id}`);
}

function decodeCursor(cursor: string): { receivedAt: string; id: string } | null {
  try {
    const decoded = atob(cursor);
    const separator = decoded.lastIndexOf('|');
    if (separator < 0) return null;
    return {
      receivedAt: decoded.slice(0, separator),
      id: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function contains(haystack: string | null, needle: string): boolean {
  if (needle === '') return true;
  if (haystack === null) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Shared filter semantics for listRecords and exportRecords (E1). */
function filterRecords(rows: BurnedRow[], filters: AuditFilters): BurnedRow[] {
  const query = toListQueryParams(filters, { limit: 1 });
  const fromTime = query['from'] ? Date.parse(query['from']) : null;
  const toTime = query['to'] ? Date.parse(query['to']) : null;
  return rows.filter((record) => {
    if (filters.actorId.trim() !== '' && record.actorId !== filters.actorId.trim()) {
      return false;
    }
    if (
      filters.sourceService !== '' &&
      record.sourceService !== filters.sourceService
    ) {
      return false;
    }
    if (!contains(record.eventType, filters.eventType.trim())) return false;
    if (!contains(record.entityType, filters.entityType.trim())) return false;
    if (filters.entityId.trim() !== '' && record.entityId !== filters.entityId.trim()) {
      return false;
    }
    const receivedTime = Date.parse(record.receivedAt);
    if (fromTime !== null && receivedTime < fromTime) return false;
    if (toTime !== null && receivedTime >= toTime) return false;
    return true;
  });
}

export function createMockAuditRepository(
  options?: MockAuditRepositoryOptions,
): AuditRepository & { failNext(error: AuditApiError): void } {
  let failNext: AuditApiError | null = options?.failNext ?? null;
  const latencyMs = options?.latencyMs ?? 120;

  async function wait(signal?: AbortSignal): Promise<void> {
    if (latencyMs <= 0) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, latencyMs);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
    });
  }

  function takeFailure(): AuditApiError | null {
    const failure = failNext;
    failNext = null;
    return failure;
  }

  return {
    failNext(error: AuditApiError): void {
      failNext = error;
    },

    async listRecords(params: AuditListParams): Promise<AuditListResult> {
      const failure = takeFailure();
      await wait(params.signal);
      if (params.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (failure) throw failure;

      const { filters, cursor, limit } = params;
      let matches = filterRecords(MOCK_AUDIT_RECORDS, filters);

      matches = [...matches].sort((a, b) =>
        a.receivedAt < b.receivedAt ? 1 : a.receivedAt > b.receivedAt ? -1 : 0,
      );

      let start = 0;
      if (cursor) {
        const decoded = decodeCursor(cursor);
        if (decoded) {
          const index = matches.findIndex(
            (record) =>
              record.receivedAt === decoded.receivedAt && record.id === decoded.id,
          );
          start = index < 0 ? matches.length : index + 1;
        } else {
          start = matches.length;
        }
      }

      const page = matches.slice(start, start + limit);
      const hasMore = start + page.length < matches.length;
      const last = page[page.length - 1];
      return {
        records: page.map((item) => ({
          id: item.id,
          eventId: item.eventId,
          eventType: item.eventType,
          sourceService: item.sourceService,
          actorId: item.actorId,
          entityType: item.entityType,
          entityId: item.entityId,
          eventOccurredAt: item.eventOccurredAt,
          receivedAt: item.receivedAt,
        })),
        pagination: {
          nextCursor: hasMore && last ? encodeCursor(last.receivedAt, last.id) : null,
          limit,
          hasMore,
        },
      };
    },

    async exportRecords(params: AuditExportParams): Promise<AuditExportResult> {
      const failure = takeFailure();
      await wait(params.signal);
      if (params.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (failure) throw failure;

      const { filters, format } = params;
      const matches = filterRecords(MOCK_AUDIT_RECORDS, filters);
      const filename = buildExportFilename(filters, format);
      if (format === 'json') {
        return {
          format,
          filename,
          mimeType: 'application/json',
          text: `${JSON.stringify(matches, null, 2)}\n`,
        };
      }
      const rows: ExportableRecord[] = matches.map((item) => ({
        id: item.id,
        eventId: item.eventId,
        eventType: item.eventType,
        sourceService: item.sourceService,
        actorId: item.actorId,
        entityType: item.entityType,
        entityId: item.entityId,
        eventOccurredAt: item.eventOccurredAt,
        receivedAt: item.receivedAt,
      }));
      return {
        format,
        filename,
        mimeType: 'text/csv',
        text: buildExportCsv(rows),
      };
    },

    async getRecord(id: string, options?: { signal?: AbortSignal }): Promise<AuditRecord> {
      const failure = takeFailure();
      await wait(options?.signal);
      if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (failure) throw failure;
      const found = MOCK_AUDIT_RECORDS.find((record) => record.id === id);
      if (!found) {
        throw new AuditApiError('Registro de auditoría no encontrado.', {
          status: 404,
          code: 'AUDIT_RECORD_NOT_FOUND',
        });
      }
      return { ...found, payload: { ...found.payload } };
    },
  };
}

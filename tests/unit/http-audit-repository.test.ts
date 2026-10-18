import { describe, expect, it } from 'vitest';

import {
  buildListUrl,
  createHttpAuditRepository,
  type PlatformHttpClient,
} from '../../src/adapter/out/http-audit-repository.js';
import { EMPTY_AUDIT_FILTERS } from '../../src/domain/audit.js';

/** Minimal summary DTO with optional keys ABSENT, as the backend may send. */
const SUMMARY_DTO = {
  id: 'a0000000-0000-4000-8000-000000000001',
  event_id: 'e0000000-0000-4000-8000-000000000001',
  event_type: 'SCHEDULE_PUBLISHED',
  source_service: 'scheduling-service',
  received_at: '2026-08-06T08:45:00-05:00',
};

describe('http audit repository (backend wiring)', () => {
  it('builds the exact contract query string', () => {
    const url = buildListUrl(
      'https://audit.qa.internal/api/v1/',
      {
        ...EMPTY_AUDIT_FILTERS,
        actorId: '11111111-1111-4111-8111-111111111111',
        from: '2026-08-01',
        to: '2026-08-06',
      },
      { limit: 10 },
    );
    expect(url).toBe(
      'https://audit.qa.internal/api/v1/audit-records' +
        '?actor_id=11111111-1111-4111-8111-111111111111' +
        '&from=2026-08-01T00%3A00%3A00.000Z' +
        '&to=2026-08-06T23%3A59%3A59.999Z' +
        '&limit=10',
    );
  });

  it('maps absent optional keys to null', async () => {
    const client: PlatformHttpClient = {
      get: async () => ({
        data: [SUMMARY_DTO],
        pagination: { limit: 10, has_more: false },
      }),
      getText: async () => ({ body: '', contentType: 'text/csv' }),
    };
    const repo = createHttpAuditRepository({
      baseUrl: 'https://audit.qa.internal/api/v1',
      client,
    });
    const result = await repo.listRecords({ filters: EMPTY_AUDIT_FILTERS, limit: 10 });
    expect(result.records[0]).toMatchObject({
      id: 'a0000000-0000-4000-8000-000000000001',
      actorId: null,
      entityType: null,
      entityId: null,
      eventOccurredAt: null,
    });
    expect(result.pagination).toEqual({ nextCursor: null, limit: 10, hasMore: false });
  });

  it('fetches detail by id from /audit-records/{id}', async () => {
    let seenUrl = '';
    const client: PlatformHttpClient = {
      get: async (url: string) => {
        seenUrl = url;
        return { ...SUMMARY_DTO, payload: { event_type: 'SCHEDULE_PUBLISHED' } };
      },
      getText: async () => ({ body: '', contentType: 'text/csv' }),
    };
    const repo = createHttpAuditRepository({
      baseUrl: 'https://audit.qa.internal/api/v1',
      client,
    });
    const record = await repo.getRecord('a0000000-0000-4000-8000-000000000001');
    expect(seenUrl).toBe(
      'https://audit.qa.internal/api/v1/audit-records/a0000000-0000-4000-8000-000000000001',
    );
    expect(record.payload).toEqual({ event_type: 'SCHEDULE_PUBLISHED' });
  });

  it('exports with the listing filters plus format (no cursor/limit)', async () => {
    let seenUrl = '';
    const client: PlatformHttpClient = {
      get: async () => ({
        data: [],
        pagination: { limit: 10, has_more: false },
      }),
      getText: async (url: string) => {
        seenUrl = url;
        return { body: 'id,event_id\n', contentType: 'text/csv' };
      },
    };
    const repo = createHttpAuditRepository({
      baseUrl: 'https://audit.qa.internal/api/v1',
      client,
    });
    const result = await repo.exportRecords({
      filters: { ...EMPTY_AUDIT_FILTERS, sourceService: 'iam-service' },
      format: 'csv',
    });
    expect(seenUrl).toBe(
      'https://audit.qa.internal/api/v1/audit-records/export' +
        '?format=csv&source_service=iam-service',
    );
    expect(result).toMatchObject({
      format: 'csv',
      filename: 'auditoria.csv',
      mimeType: 'text/csv',
    });
  });

  it('surfaces HTTP failures as AuditApiError with status', async () => {
    const fetchFn: typeof fetch = async () =>
      new Response(
        JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Sin permiso' } }),
        { status: 403 },
      );
    const repo = createHttpAuditRepository({
      baseUrl: 'https://audit.qa.internal/api/v1',
      fetchFn,
    });
    const failure = await repo
      .listRecords({ filters: EMPTY_AUDIT_FILTERS, limit: 10 })
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({ status: 403, message: 'Sin permiso' });
  });

  it('sends the bearer token when the shell provides one', async () => {
    let seenHeaders: Record<string, string> = {};
    const fetchFn: typeof fetch = async (_url, init) => {
      seenHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response(
        JSON.stringify({ data: [], pagination: { limit: 10, has_more: false } }),
        { status: 200 },
      );
    };
    const repo = createHttpAuditRepository({
      baseUrl: 'https://audit.qa.internal/api/v1',
      fetchFn,
      getToken: () => 'jwt-token',
    });
    await repo.listRecords({ filters: EMPTY_AUDIT_FILTERS, limit: 10 });
    expect(seenHeaders['Authorization']).toBe('Bearer jwt-token');
  });
});

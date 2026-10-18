import { describe, expect, it } from 'vitest';

import { AuditApiError } from '../../src/application/ports/audit-port.js';
import { EMPTY_AUDIT_FILTERS } from '../../src/domain/audit.js';
import {
  ACTOR_MARIA_GARCIA,
  createMockAuditRepository,
} from '../../src/adapter/out/mock-audit-repository.js';

describe('mock audit repository', () => {
  it('lists newest first with cursor pagination', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const first = await repo.listRecords({ filters: EMPTY_AUDIT_FILTERS, limit: 10 });
    expect(first.records).toHaveLength(10);
    expect(first.pagination.hasMore).toBe(true);
    expect(first.pagination.nextCursor).not.toBeNull();
    expect(first.records[0]?.eventType).toBe('SCHEDULE_PUBLISHED');

    const second = await repo.listRecords({
      filters: EMPTY_AUDIT_FILTERS,
      cursor: first.pagination.nextCursor,
      limit: 10,
    });
    expect(second.records).toHaveLength(2);
    expect(second.pagination.hasMore).toBe(false);
    expect(second.pagination.nextCursor).toBeNull();
  });

  it('filters by source service and actor', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const byService = await repo.listRecords({
      filters: { ...EMPTY_AUDIT_FILTERS, sourceService: 'iam-service' },
      limit: 50,
    });
    expect(byService.records.length).toBeGreaterThan(0);
    expect(
      byService.records.every((record) => record.sourceService === 'iam-service'),
    ).toBe(true);

    const byActor = await repo.listRecords({
      filters: { ...EMPTY_AUDIT_FILTERS, actorId: ACTOR_MARIA_GARCIA },
      limit: 50,
    });
    expect(
      byActor.records.every((record) => record.actorId === ACTOR_MARIA_GARCIA),
    ).toBe(true);
  });

  it('applies the received_at range (from inclusive, whole Hasta day)', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const result = await repo.listRecords({
      filters: { ...EMPTY_AUDIT_FILTERS, from: '2026-08-05', to: '2026-08-05' },
      limit: 50,
    });
    // Only the two 2026-08-05 rows (16:02 and 15:32 UTC-5) fall in range.
    expect(result.records).toHaveLength(2);
  });

  it('returns the full payload on getRecord and 404s unknown ids', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const record = await repo.getRecord('a0000000-0000-4000-8000-000000000001');
    expect(record.eventType).toBe('SCHEDULE_PUBLISHED');
    expect(record.payload['event_type']).toBe('SCHEDULE_PUBLISHED');

    await expect(repo.getRecord('00000000-0000-4000-8000-000000000000')).rejects.toMatchObject(
      { status: 404 },
    );
  });

  it('supports injected failures', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    repo.failNext(new AuditApiError('Boom', { status: 500 }));
    await expect(
      repo.listRecords({ filters: EMPTY_AUDIT_FILTERS, limit: 10 }),
    ).rejects.toThrow('Boom');
    // Failure is one-shot: the next call succeeds.
    const result = await repo.listRecords({ filters: EMPTY_AUDIT_FILTERS, limit: 10 });
    expect(result.records.length).toBeGreaterThan(0);
  });
});

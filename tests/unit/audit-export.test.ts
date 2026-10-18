import { describe, expect, it } from 'vitest';

import {
  buildExportCsv,
  buildExportFilename,
  toExportQueryParams,
} from '../../src/domain/audit-export.js';
import { EMPTY_AUDIT_FILTERS } from '../../src/domain/audit.js';

describe('audit export domain (HU-AUD-002)', () => {
  it('reuses the exact listing filter names plus format, no cursor/limit', () => {
    expect(
      toExportQueryParams(
        {
          ...EMPTY_AUDIT_FILTERS,
          actorId: '11111111-1111-4111-8111-111111111111',
          eventType: 'SCHEDULE_PUBLISHED',
          sourceService: 'iam-service',
        },
        { format: 'csv' },
      ),
    ).toEqual({
      format: 'csv',
      actor_id: '11111111-1111-4111-8111-111111111111',
      event_type: 'SCHEDULE_PUBLISHED',
      source_service: 'iam-service',
    });
  });

  it('E2: no filters means no filter params (only format)', () => {
    expect(toExportQueryParams(EMPTY_AUDIT_FILTERS, { format: 'csv' })).toEqual({
      format: 'csv',
    });
  });

  it('builds recognizable filenames with range when it applies', () => {
    expect(buildExportFilename(EMPTY_AUDIT_FILTERS, 'csv')).toBe('auditoria.csv');
    expect(
      buildExportFilename(
        { ...EMPTY_AUDIT_FILTERS, from: '2026-08-01', to: '2026-08-06' },
        'csv',
      ),
    ).toBe('auditoria-desde-20260801-hasta-20260806.csv');
    expect(
      buildExportFilename({ ...EMPTY_AUDIT_FILTERS, from: '2026-08-01' }, 'json'),
    ).toBe('auditoria-desde-20260801.json');
  });

  it('builds CSV with header, nulls as empty and quoting', () => {
    const csv = buildExportCsv([
      {
        id: 'a1',
        eventId: 'e1',
        eventType: 'SCHEDULE_PUBLISHED',
        sourceService: 'scheduling-service',
        actorId: null,
        entityType: 'schedule',
        entityId: null,
        eventOccurredAt: null,
        receivedAt: '2026-08-06T08:45:00-05:00',
      },
      {
        id: 'a2',
        eventId: 'e2',
        eventType: 'NOTE "QUOTED", X',
        sourceService: 'iam-service',
        actorId: '11111111-1111-4111-8111-111111111111',
        entityType: null,
        entityId: null,
        eventOccurredAt: null,
        receivedAt: '2026-08-05T16:02:00-05:00',
      },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'id,event_id,event_type,source_service,actor_id,entity_type,entity_id,event_occurred_at,received_at',
    );
    expect(lines[1]).toBe(
      'a1,e1,SCHEDULE_PUBLISHED,scheduling-service,,schedule,,,2026-08-06T08:45:00-05:00',
    );
    expect(lines[2]).toContain('"NOTE ""QUOTED"", X"');
  });
});

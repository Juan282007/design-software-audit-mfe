import { describe, expect, it } from 'vitest';

import {
  actorLabel,
  EMPTY_AUDIT_FILTERS,
  entityLabel,
  formatAuditDateTime,
  hasActiveFilters,
  isValidDateRange,
  shortId,
  toListQueryParams,
} from '../../src/domain/audit.js';

describe('audit domain', () => {
  it('detects active filters', () => {
    expect(hasActiveFilters(EMPTY_AUDIT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_AUDIT_FILTERS, from: '2026-08-01' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_AUDIT_FILTERS, sourceService: '  ' })).toBe(false);
  });

  it('validates the received_at date range', () => {
    expect(isValidDateRange('', '')).toBe(true);
    expect(isValidDateRange('2026-08-01', '')).toBe(true);
    expect(isValidDateRange('2026-08-01', '2026-08-06')).toBe(true);
    expect(isValidDateRange('2026-08-06', '2026-08-06')).toBe(true);
    expect(isValidDateRange('2026-08-07', '2026-08-06')).toBe(false);
  });

  it('labels a null actor as system action', () => {
    expect(actorLabel(null)).toBe('Sistema');
  });

  it('resolves known actors via the directory, shortens unknown UUIDs', () => {
    const uuid = '12345678-1234-4234-8234-123456789012';
    expect(actorLabel(uuid, { [uuid]: 'María García' })).toBe('María García');
    expect(actorLabel(uuid)).toBe('Actor 12345678');
  });

  it('labels entities, with an em dash when unknown', () => {
    expect(entityLabel(null, null)).toBe('—');
    expect(entityLabel('schedule', 'abcdefab-0000-4000-8000-000000000000')).toBe(
      'schedule · abcdefab',
    );
  });

  it('shortens ids to 8 chars', () => {
    expect(shortId('abcdefab-0000')).toBe('abcdefab');
    expect(shortId('abc')).toBe('abc');
  });

  it('formats timestamps like the mockup and guards nulls', () => {
    const formatted = formatAuditDateTime('2026-08-06T08:45:00-05:00');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('08:45');
    expect(formatAuditDateTime(null)).toBe('—');
    expect(formatAuditDateTime('not-a-date')).toBe('—');
  });

  it('maps filters to the EXACT contract query-param names', () => {
    const params = toListQueryParams(
      {
        actorId: '11111111-1111-4111-8111-111111111111',
        eventType: 'SCHEDULE_PUBLISHED',
        entityType: 'schedule',
        entityId: '',
        sourceService: 'scheduling-service',
        from: '2026-08-01',
        to: '2026-08-06',
      },
      { limit: 10 },
    );
    expect(params).toEqual({
      actor_id: '11111111-1111-4111-8111-111111111111',
      event_type: 'SCHEDULE_PUBLISHED',
      entity_type: 'schedule',
      source_service: 'scheduling-service',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-06T23:59:59.999Z',
      limit: '10',
    });
  });

  it('omits empty filters and forwards the cursor', () => {
    const params = toListQueryParams(EMPTY_AUDIT_FILTERS, {
      cursor: 'opaque-cursor',
      limit: 20,
    });
    expect(params).toEqual({ cursor: 'opaque-cursor', limit: '20' });
  });
});

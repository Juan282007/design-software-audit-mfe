import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuditApiError } from '../../src/application/ports/audit-port.js';
import { useAuditRecordDetail } from '../../src/application/useAuditRecordDetail.js';
import { useAuditRecordsQuery } from '../../src/application/useAuditRecordsQuery.js';
import { EMPTY_AUDIT_FILTERS } from '../../src/domain/audit.js';
import { createMockAuditRepository } from '../../src/adapter/out/mock-audit-repository.js';

describe('useAuditRecordsQuery', () => {
  it('loads the first page on mount', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const { result } = renderHook(() =>
      useAuditRecordsQuery(repo, { debounceMs: 0 }),
    );
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current.records).toHaveLength(10);
    expect(result.current.pagination?.hasMore).toBe(true);
  });

  it('refetches when filters change and resets on resetFilters', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const spy = vi.spyOn(repo, 'listRecords');
    const { result } = renderHook(() =>
      useAuditRecordsQuery(repo, { debounceMs: 0 }),
    );
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    const callsBefore = spy.mock.calls.length;

    result.current.setFilter('sourceService', 'iam-service');    await waitFor(() => {
      expect(
        result.current.records.every(
          (record) => record.sourceService === 'iam-service',
        ),
      ).toBe(true);
    });
    expect(spy.mock.calls.length).toBeGreaterThan(callsBefore);

    result.current.resetFilters();
    await waitFor(() => {
      expect(result.current.filters).toEqual(EMPTY_AUDIT_FILTERS);
    });
    await waitFor(() => {
      expect(result.current.records).toHaveLength(10);
    });
  });

  it('appends rows on loadMore', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const { result } = renderHook(() =>
      useAuditRecordsQuery(repo, { debounceMs: 0 }),
    );
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    result.current.loadMore();
    await waitFor(() => {
      expect(result.current.records).toHaveLength(12);
    });
    expect(result.current.pagination?.hasMore).toBe(false);
  });

  it('reports empty when nothing matches', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const { result } = renderHook(() =>
      useAuditRecordsQuery(repo, { debounceMs: 0 }),
    );
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    result.current.setFilter('eventType', 'EVENT_THAT_DOES_NOT_EXIST');
    await waitFor(() => {
      expect(result.current.status).toBe('empty');
    });
    expect(result.current.records).toHaveLength(0);
  });

  it('reports error and recovers on retry', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    repo.failNext(new AuditApiError('Backend caído', { status: 500 }));
    const { result } = renderHook(() =>
      useAuditRecordsQuery(repo, { debounceMs: 0 }),
    );
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.error?.message).toBe('Backend caído');

    result.current.retry();
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
  });

  it('skips the request while the date range is invalid', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const spy = vi.spyOn(repo, 'listRecords');
    const { result } = renderHook(() =>
      useAuditRecordsQuery(repo, { debounceMs: 0 }),
    );
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    const callsBefore = spy.mock.calls.length;

    act(() => {
      result.current.setFilters({ from: '2026-08-07', to: '2026-08-06' });
    });
    expect(result.current.dateRangeValid).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(spy.mock.calls.length).toBe(callsBefore);
  });
});

describe('useAuditRecordDetail', () => {
  it('starts idle and loads on select', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const { result } = renderHook(() => useAuditRecordDetail(repo));
    expect(result.current.status).toBe('idle');

    act(() => {
      result.current.select('a0000000-0000-4000-8000-000000000001');
    });
    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current.record?.eventType).toBe('SCHEDULE_PUBLISHED');
    expect(result.current.record?.payload).toBeDefined();
  });

  it('reports 404 for unknown ids and resets on close', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const { result } = renderHook(() => useAuditRecordDetail(repo));

    act(() => {
      result.current.select('00000000-0000-4000-8000-000000000000');
    });
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.error?.status).toBe(404);

    act(() => {
      result.current.close();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.selectedId).toBeNull();
    expect(result.current.record).toBeNull();
  });
});

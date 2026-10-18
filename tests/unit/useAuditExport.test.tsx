import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FileDownloader } from '../../src/application/ports/audit-port.js';
import { AuditApiError } from '../../src/application/ports/audit-port.js';
import { useAuditExport } from '../../src/application/useAuditExport.js';
import { createMockAuditRepository } from '../../src/adapter/out/mock-audit-repository.js';
import { EMPTY_AUDIT_FILTERS } from '../../src/domain/audit.js';

function stubDownloader() {
  const saved: { filename: string; mimeType: string; text: string }[] = [];
  const downloader: FileDownloader = {
    save: (download: { filename: string; mimeType: string; text: string }): void => {
      saved.push(download);
    },
  };
  return { saved, downloader };
}

describe('useAuditExport', () => {
  it('E1: exports with the shared filters and downloads the file', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const spy = vi.spyOn(repo, 'exportRecords');
    const { saved, downloader } = stubDownloader();
    const { result } = renderHook(() => useAuditExport(repo, downloader));

    const filters = { ...EMPTY_AUDIT_FILTERS, sourceService: 'iam-service' };
    await act(async () => {
      await result.current.exportNow(filters);
    });

    // Same filter object values reach the repository (never a duplicate state).
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toMatchObject({ filters, format: 'csv' });
    expect(result.current.status).toBe('success');
    expect(saved).toHaveLength(1);
    expect(saved[0]?.filename).toBe('auditoria.csv');
    expect(saved[0]?.mimeType).toBe('text/csv');
    expect(saved[0]?.text).toContain('USER_ROLE_ASSIGNED');
    expect(saved[0]?.text).not.toContain('SCHEDULE_PUBLISHED');
  });

  it('E2: exports the whole visible universe without filters', async () => {
    const repo = createMockAuditRepository({ latencyMs: 0 });
    const spy = vi.spyOn(repo, 'exportRecords');
    const { saved, downloader } = stubDownloader();
    const { result } = renderHook(() => useAuditExport(repo, downloader));

    await act(async () => {
      await result.current.exportNow(EMPTY_AUDIT_FILTERS);
    });

    expect(spy.mock.calls[0]?.[0]).toMatchObject({
      filters: EMPTY_AUDIT_FILTERS,
      format: 'csv',
    });
    expect(saved[0]?.text).toContain('SCHEDULE_PUBLISHED');
  });

  it('E4: reports exporting state then explicit error without downloading', async () => {
    const repo = createMockAuditRepository({ latencyMs: 60 });
    const { saved, downloader } = stubDownloader();
    const { result } = renderHook(() => useAuditExport(repo, downloader));

    repo.failNext(new AuditApiError('Exportación muy grande', { status: 413 }));
    act(() => {
      void result.current.exportNow(EMPTY_AUDIT_FILTERS);
    });
    expect(result.current.status).toBe('exporting');

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.error?.message).toBe('Exportación muy grande');
    expect(saved).toHaveLength(0);

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe('idle');
  });
});

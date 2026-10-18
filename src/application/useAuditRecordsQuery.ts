/**
 * application/useAuditRecordsQuery — HU-AUD-005 list + filters + cursor paging.
 *
 * Owns the filter state (actor, action/event type, entity, origin service,
 * date range) and cursor pagination. HU-AUD-002 (export) MUST reuse this
 * hook's `filters` instead of duplicating filter state — e.g.:
 *
 *   const query = useAuditRecordsQuery(repository);
 *   // export reads query.filters + query.toExportParams()
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_AUDIT_LIMIT,
  EMPTY_AUDIT_FILTERS,
  isValidDateRange,
  type AuditFilters,
  type AuditRecordSummary,
  type CursorPage,
} from '../domain/audit.js';
import { AuditApiError, type AuditRepository } from './ports/audit-port.js';

export type AuditListStatus = 'loading' | 'success' | 'empty' | 'error';
export type AuditFilterKey = keyof AuditFilters;

export interface UseAuditRecordsQueryOptions {
  initialFilters?: AuditFilters;
  initialLimit?: number;
  /** Debounce for keystroke-driven refetch. Default 200ms. */
  debounceMs?: number;
}

export interface UseAuditRecordsQueryResult {
  filters: AuditFilters;
  setFilter: (key: AuditFilterKey, value: string) => void;
  setFilters: (patch: Partial<AuditFilters>) => void;
  resetFilters: () => void;
  limit: number;
  setLimit: (limit: number) => void;
  records: AuditRecordSummary[];
  pagination: CursorPage | null;
  status: AuditListStatus;
  error: AuditApiError | null;
  dateRangeValid: boolean;
  loadingMore: boolean;
  reload: () => void;
  retry: () => void;
  loadMore: () => void;
}

export function useAuditRecordsQuery(
  repository: AuditRepository,
  options?: UseAuditRecordsQueryOptions,
): UseAuditRecordsQueryResult {
  const [filters, setFiltersState] = useState<AuditFilters>(
    options?.initialFilters ?? EMPTY_AUDIT_FILTERS,
  );
  const [limit, setLimitState] = useState<number>(
    options?.initialLimit ?? DEFAULT_AUDIT_LIMIT,
  );
  const [records, setRecords] = useState<AuditRecordSummary[]>([]);
  const [pagination, setPagination] = useState<CursorPage | null>(null);
  const [status, setStatus] = useState<AuditListStatus>('loading');
  const [error, setError] = useState<AuditApiError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const debounceMs = options?.debounceMs ?? 200;
  const dateRangeValid = isValidDateRange(filters.from, filters.to);
  const requestId = useRef(0);

  const setFilter = useCallback((key: AuditFilterKey, value: string) => {
    setFiltersState((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((patch: Partial<AuditFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(EMPTY_AUDIT_FILTERS);
  }, []);

  const setLimit = useCallback((next: number) => {
    setLimitState(next);
  }, []);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const retry = reload;

  // Debounce keystroke-driven refetch so typing a UUID does not fire
  // one GET /audit-records per keystroke against the cursor API.
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(filters);
  useEffect(() => {
    if (debounceMs <= 0) {
      setAppliedFilters(filters);
      return;
    }
    const timer = setTimeout(() => {
      setAppliedFilters(filters);
    }, debounceMs);
    return () => {
      clearTimeout(timer);
    };
  }, [filters, debounceMs]);

  // Page 1 (replace) whenever applied filters / limit / manual reload change.
  useEffect(() => {
    if (!isValidDateRange(appliedFilters.from, appliedFilters.to)) return;
    const id = ++requestId.current;
    const controller = new AbortController();
    setStatus('loading');
    setError(null);
    setLoadingMore(false);
    void repository
      .listRecords({
        filters: appliedFilters,
        limit,
        signal: controller.signal,
      })
      .then((result) => {
        if (requestId.current !== id) return;
        setRecords(result.records);
        setPagination(result.pagination);
        setStatus(result.records.length === 0 ? 'empty' : 'success');
      })
      .catch((unknownError: unknown) => {
        if (requestId.current !== id) return;
        if (controller.signal.aborted) return;
        setError(toAuditApiError(unknownError));
        setStatus('error');
      });
    return () => {
      controller.abort();
    };
  }, [repository, appliedFilters, limit, reloadToken]);

  const loadMore = useCallback(() => {
    if (loadingMore || status === 'loading' || status === 'error') return;
    const nextCursor = pagination?.nextCursor ?? null;
    if (!pagination || !pagination.hasMore || nextCursor === null) return;
    const id = ++requestId.current;
    setLoadingMore(true);
    void repository
      .listRecords({ filters: appliedFilters, cursor: nextCursor, limit })
      .then((result) => {
        if (requestId.current !== id) return;
        setRecords((prev) => [...prev, ...result.records]);
        setPagination(result.pagination);
        setLoadingMore(false);
      })
      .catch((unknownError: unknown) => {
        if (requestId.current !== id) return;
        setError(toAuditApiError(unknownError));
        setStatus('error');
        setLoadingMore(false);
      });
  }, [repository, appliedFilters, limit, loadingMore, pagination, status]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    limit,
    setLimit,
    records,
    pagination,
    status,
    error,
    dateRangeValid,
    loadingMore,
    reload,
    retry,
    loadMore,
  };
}

function toAuditApiError(unknownError: unknown): AuditApiError {
  if (unknownError instanceof AuditApiError) return unknownError;
  if (unknownError instanceof Error) return new AuditApiError(unknownError.message);
  return new AuditApiError('Error desconocido al consultar la auditoría.');
}

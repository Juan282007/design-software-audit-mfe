/**
 * adapter/out/http-audit-repository — real GET /audit-records implementation.
 *
 * Dormant until audit-service ships: resolveAuditRepository() only builds this
 * when VITE_AUDIT_API_URL is set. DTO→domain mapping lives here so generated
 * contract types never leak into components.
 *
 * frontend-platform wiring: pass its HttpClient as `client` (structural type
 * below matches `frontend-platform`'s HttpClient.get). Until that package is
 * published, the default fetch-based client is used with an injected token.
 */
import type {
  components,
  operations,
} from '../../contracts/generated/audit.js';
import type { AuditFilters, AuditRecord, AuditRecordSummary } from '../../domain/audit.js';
import { toListQueryParams } from '../../domain/audit.js';
import {
  buildExportFilename,
  toExportQueryParams,
  type AuditExportFormat,
} from '../../domain/audit-export.js';
import {
  AuditApiError,
  type AuditExportParams,
  type AuditExportResult,
  type AuditListParams,
  type AuditListResult,
  type AuditRepository,
} from '../../application/ports/audit-port.js';

/** Minimal structural surface required from frontend-platform's HttpClient. */
export interface PlatformHttpClient {
  get<T>(url: string, options?: { signal?: AbortSignal }): Promise<T>;
  /** Raw-text GET (exports answer text/csv or application/json as text). */
  getText(
    url: string,
    options?: { signal?: AbortSignal },
  ): Promise<{ body: string; contentType: string | null }>;
}

export interface HttpAuditRepositoryOptions {
  /** e.g. https://audit-service.qa.horarios-sena.internal/api/v1 */
  baseUrl: string;
  client?: PlatformHttpClient;
  getToken?: () => string | null;
  fetchFn?: typeof fetch;
}

/** DTOs derived from the generated contract — never hand-written shapes. */
type AuditRecordSummaryDto = components['schemas']['AuditRecordSummary'];
type AuditRecordDto = components['schemas']['AuditRecord'];
type ListResponseBody =
  operations['listAuditRecords']['responses'][200]['content']['application/json'];
type GetResponseBody =
  operations['getAuditRecord']['responses'][200]['content']['application/json'];

export function buildListUrl(
  baseUrl: string,
  filters: AuditFilters,
  options: { cursor?: string | null; limit: number },
): string {
  const params = toListQueryParams(filters, options);
  const search = new URLSearchParams(params).toString();
  return `${stripTrailingSlash(baseUrl)}/audit-records${search === '' ? '' : `?${search}`}`;
}

export function buildExportUrl(
  baseUrl: string,
  filters: AuditFilters,
  format: AuditExportFormat,
): string {
  const params = toExportQueryParams(filters, { format });
  const search = new URLSearchParams(params).toString();
  return `${stripTrailingSlash(baseUrl)}/audit-records/export?${search}`;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function mapSummary(dto: AuditRecordSummaryDto): AuditRecordSummary {
  // Nullable contract fields are also optional: absent key => null in domain.
  return {
    id: dto.id,
    eventId: dto.event_id,
    eventType: dto.event_type,
    sourceService: dto.source_service,
    actorId: dto.actor_id ?? null,
    entityType: dto.entity_type ?? null,
    entityId: dto.entity_id ?? null,
    eventOccurredAt: dto.event_occurred_at ?? null,
    receivedAt: dto.received_at,
  };
}

function mapRecord(dto: AuditRecordDto): AuditRecord {
  return { ...mapSummary(dto), payload: dto.payload ?? {} };
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

async function throwForStatus(response: Response): Promise<never> {
  let code: string | undefined;
  let message = `La consulta de auditoría falló (${response.status}).`;
  try {
    const body = (await response.json()) as ErrorBody;
    if (body?.error?.message) message = body.error.message;
    code = body?.error?.code;
  } catch {
    // Non-JSON error body: keep the default message.
  }
  throw new AuditApiError(message, { status: response.status, code });
}

function defaultClient(
  getToken: (() => string | null) | undefined,
  fetchFn: typeof fetch | undefined,
): PlatformHttpClient {
  const runFetch = fetchFn ?? fetch;
  async function raw(
    url: string,
    accept: string,
    signal?: AbortSignal,
  ): Promise<Response> {
    const headers: Record<string, string> = { Accept: accept };
    const token = getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await runFetch(url, { headers, signal });
    if (!response.ok) await throwForStatus(response);
    return response;
  }
  return {
    async get<T>(url: string, options?: { signal?: AbortSignal }): Promise<T> {
      const response = await raw(url, 'application/json', options?.signal);
      return (await response.json()) as T;
    },
    async getText(
      url: string,
      options?: { signal?: AbortSignal },
    ): Promise<{ body: string; contentType: string | null }> {
      const response = await raw(url, 'text/csv, application/json', options?.signal);
      return {
        body: await response.text(),
        contentType: response.headers.get('content-type'),
      };
    },
  };
}

export function createHttpAuditRepository(
  options: HttpAuditRepositoryOptions,
): AuditRepository {
  const client = options.client ?? defaultClient(options.getToken, options.fetchFn);
  const baseUrl = stripTrailingSlash(options.baseUrl);

  return {
    async listRecords(params: AuditListParams): Promise<AuditListResult> {
      const url = buildListUrl(baseUrl, params.filters, {
        cursor: params.cursor,
        limit: params.limit,
      });
      const body = await client.get<ListResponseBody>(url, { signal: params.signal });
      return {
        records: body.data.map(mapSummary),
        pagination: {
          nextCursor: body.pagination.next_cursor ?? null,
          limit: body.pagination.limit,
          hasMore: body.pagination.has_more,
        },
      };
    },

    async getRecord(id: string, request?: { signal?: AbortSignal }): Promise<AuditRecord> {
      const body = await client.get<GetResponseBody>(
        `${baseUrl}/audit-records/${encodeURIComponent(id)}`,
        { signal: request?.signal },
      );
      return mapRecord(body);
    },

    async exportRecords(params: AuditExportParams): Promise<AuditExportResult> {
      const url = buildExportUrl(baseUrl, params.filters, params.format);
      const { body, contentType } = await client.getText(url, {
        signal: params.signal,
      });
      const isJson =
        params.format === 'json' || (contentType ?? '').includes('application/json');
      const format = isJson ? 'json' : 'csv';
      return {
        format,
        filename: buildExportFilename(params.filters, format),
        mimeType: isJson ? 'application/json' : 'text/csv',
        text: body,
      };
    },
  };
}

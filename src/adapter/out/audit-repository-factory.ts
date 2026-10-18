/**
 * adapter/out/audit-repository-factory — THE backend connection switch.
 *
 * - Default (today, no backend): shared mock repository with burned-in data.
 * - With backend: set VITE_AUDIT_API_URL (e.g. in .env.qa / .env.staging /
 *   .env.production) and this factory returns the real HTTP repository.
 *   No UI, hook, or test changes are needed for the switch.
 * - Host/tests can force a repository via configureAuditRepository()
 *   (takes precedence over the env var).
 *
 * When design-software-frontend-platform ships, pass its HttpClient here:
 *
 *   import { HttpClient } from 'design-software-frontend-platform';
 *   configureAuditRepository(createHttpAuditRepository({
 *     baseUrl: config.auditApiUrl,
 *     client: HttpClient, // structural match: get<T>(url, { signal })
 *   }));
 */
import type { AuditRepository } from '../../application/ports/audit-port.js';
import { createHttpAuditRepository } from './http-audit-repository.js';
import { createMockAuditRepository } from './mock-audit-repository.js';

let configured: AuditRepository | null = null;
let sharedMock: AuditRepository | null = null;

export function configureAuditRepository(repository: AuditRepository | null): void {
  configured = repository;
}

export function resolveAuditRepository(): AuditRepository {
  if (configured) return configured;
  const baseUrl = import.meta.env.VITE_AUDIT_API_URL;
  if (typeof baseUrl === 'string' && baseUrl.trim() !== '') {
    return createHttpAuditRepository({ baseUrl: baseUrl.trim() });
  }
  if (!sharedMock) sharedMock = createMockAuditRepository();
  return sharedMock;
}

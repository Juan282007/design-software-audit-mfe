import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import { describe, expect, it } from 'vitest';

import { createHttpAuditRepository } from '../../adapter/out/http-audit-repository.js';
import { EMPTY_AUDIT_FILTERS } from '../../domain/audit.js';

const pact = new PactV3({
  consumer: 'audit-mfe',
  provider: 'audit-query-api',
  dir: 'pacts',
  logLevel: 'warn',
});

describe('audit-query-api consumer contract', () => {
  it('lists audit records for an authorized reader', async () => {
    await pact
      .uponReceiving('a paginated audit-record listing request')
      .withRequest({
        method: 'GET',
        path: '/api/v1/audit-records',
        query: { limit: '10' },
        headers: {
          Accept: 'application/json',
          Authorization: MatchersV3.regex('^Bearer .+$', 'Bearer pact-contract-token'),
        },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          data: MatchersV3.eachLike({
            id: MatchersV3.uuid('10000000-0000-4000-8000-000000000001'),
            event_id: MatchersV3.uuid('10000000-0000-4000-8000-000000000002'),
            event_type: MatchersV3.string('USER_LOGIN'),
            source_service: MatchersV3.string('iam-service'),
            actor_id: null,
            entity_type: null,
            entity_id: null,
            event_occurred_at: null,
            received_at: MatchersV3.datetime("yyyy-MM-dd'T'HH:mm:ssX", '2026-10-18T12:00:00Z'),
          }),
          pagination: {
            next_cursor: null,
            limit: MatchersV3.integer(10),
            has_more: MatchersV3.boolean(false),
          },
        },
      })
      .executeTest(async (mockServer) => {
        const repository = createHttpAuditRepository({
          baseUrl: `${mockServer.url}/api/v1`,
          getToken: () => 'pact-contract-token',
        });

        const result = await repository.listRecords({
          filters: EMPTY_AUDIT_FILTERS,
          cursor: null,
          limit: 10,
        });

        expect(result.pagination).toEqual({ nextCursor: null, limit: 10, hasMore: false });
        expect(result.records).toHaveLength(1);
        expect(result.records[0]).toMatchObject({
          id: '10000000-0000-4000-8000-000000000001',
          eventId: '10000000-0000-4000-8000-000000000002',
          eventType: 'USER_LOGIN',
          sourceService: 'iam-service',
        });
      });
  });
});

/**
 * adapter/in/pages/AuditTrailPage — container of HU-AUD-005 + HU-AUD-002.
 *
 * Composes the application hooks with presentational components.
 * Holds no fetch, no mapping, no business rules — only wiring.
 * The export button reads query.filters (same object, E1) via useAuditExport.
 */
import type { FC } from 'react';

import type { AuditRepository } from '../../../application/ports/audit-port.js';
import { useAuditExport } from '../../../application/useAuditExport.js';
import { useAuditRecordDetail } from '../../../application/useAuditRecordDetail.js';
import { useAuditRecordsQuery } from '../../../application/useAuditRecordsQuery.js';
import { resolveAuditRepository } from '../../out/audit-repository-factory.js';
import { BURNED_ACTOR_DIRECTORY } from '../../out/mock-audit-repository.js';
import { browserFileDownloader } from '../../out/file-download.js';
import AuditFiltersPanel from '../components/AuditFiltersPanel.js';
import {
  AuditEmptyState,
  AuditErrorState,
  AuditLoadingSkeleton,
} from '../components/AuditFeedback.js';
import AuditRecordDetailModal from '../components/AuditRecordDetailModal.js';
import AuditRecordsTable from '../components/AuditRecordsTable.js';
import styles from './AuditTrailPage.module.css';

interface AuditTrailPageProps {
  /** Injected port (tests/host). Defaults to resolveAuditRepository(). */
  repository?: AuditRepository;
}

const AuditTrailPage: FC<AuditTrailPageProps> = ({ repository }) => {
  const repo = repository ?? resolveAuditRepository();
  const query = useAuditRecordsQuery(repo);
  const detail = useAuditRecordDetail(repo);
  const expo = useAuditExport(repo, browserFileDownloader);

  const showTable = query.status === 'success' && query.records.length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Auditoría</h1>
          <p>Registro de solo lectura de las acciones del sistema.</p>
        </div>
      </header>

      <AuditFiltersPanel
        filters={query.filters}
        onChange={query.setFilter}
        dateRangeValid={query.dateRangeValid}
        onExport={() => {
          void expo.exportNow(query.filters);
        }}
        exportStatus={expo.status}
        exportError={expo.error?.message ?? null}
      />

      {query.status === 'loading' && !query.loadingMore && <AuditLoadingSkeleton />}

      {query.status === 'empty' && <AuditEmptyState onReset={query.resetFilters} />}

      {query.status === 'error' && (
        <AuditErrorState
          isForbidden={query.error?.isForbidden() ?? false}
          onRetry={query.retry}
        />
      )}

      {showTable && (
        <AuditRecordsTable
          records={query.records}
          actorDirectory={BURNED_ACTOR_DIRECTORY}
          onView={detail.select}
          hasMore={query.pagination?.hasMore ?? false}
          loadingMore={query.loadingMore}
          limit={query.limit}
          onLoadMore={query.loadMore}
          onLimitChange={query.setLimit}
        />
      )}

      <p className={styles.retention}>
        Registro append-only · retención mínima 7 años · particionado mensual · datos
        de más de 2 años se archivan en frío.
      </p>

      <AuditRecordDetailModal
        record={detail.record}
        status={detail.status}
        isForbidden={detail.error?.isForbidden() ?? false}
        actorDirectory={BURNED_ACTOR_DIRECTORY}
        onClose={detail.close}
        onRetry={detail.retry}
      />
    </div>
  );
};

export default AuditTrailPage;

/**
 * adapter/in/components/AuditRecordsTable — presentational audit rows.
 *
 * Markup mirrors the mockup helper C().table(): .panel > .data-table-wrap >
 * table.data-table with per-cell data-label (mobile card layout), the
 * .status-badge.status-info service pill and the cursor .table-footer.
 */
import type { FC } from 'react';

import {
  AUDIT_LIMIT_OPTIONS,
  actorLabel,
  entityLabel,
  formatAuditDateTime,
  type ActorDirectory,
  type AuditRecordSummary,
} from '../../../domain/audit.js';
import AuditIcon from './AuditIcon.js';
import styles from './AuditRecordsTable.module.css';

interface AuditRecordsTableProps {
  records: AuditRecordSummary[];
  actorDirectory?: ActorDirectory;
  onView: (id: string) => void;
  /** Cursor footer (same .panel, like the mockup table helper). */
  hasMore: boolean;
  loadingMore: boolean;
  limit: number;
  onLoadMore: () => void;
  onLimitChange: (limit: number) => void;
}

const AuditRecordsTable: FC<AuditRecordsTableProps> = ({
  records,
  actorDirectory,
  onView,
  hasMore,
  loadingMore,
  limit,
  onLoadMore,
  onLimitChange,
}) => (
  <div className={styles.panel}>
    <div className={styles.dataTableWrap}>
      <table className={styles.dataTable}>
        <caption className={styles.srOnly}>Eventos de auditoría</caption>
        <thead>
          <tr>
            <th scope="col">Recibido</th>
            <th scope="col">Ocurrido en origen</th>
            <th scope="col">Evento</th>
            <th scope="col">Servicio origen</th>
            <th scope="col">Actor</th>
            <th scope="col">Entidad</th>
            <th scope="col">Acción</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td data-label="Recibido">{formatAuditDateTime(record.receivedAt)}</td>
              <td data-label="Ocurrido en origen">
                {formatAuditDateTime(record.eventOccurredAt)}
              </td>
              <td data-label="Evento">{record.eventType}</td>
              <td data-label="Servicio origen">
                <span className={styles.statusBadge} title={record.sourceService}>
                  <AuditIcon name="info" />
                  {record.sourceService}
                </span>
              </td>
              <td
                data-label="Actor"
                title={record.actorId ?? 'Acción del sistema'}
              >
                {actorLabel(record.actorId, actorDirectory)}
              </td>
              <td
                data-label="Entidad"
                title={record.entityId ?? record.entityType ?? 'Sin entidad asociada'}
              >
                {entityLabel(record.entityType, record.entityId)}
              </td>
              <td data-label="Acción">
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                  onClick={() => onView(record.id)}
                >
                  Ver payload
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className={styles.tableFooter}>
      <span>
        Mostrando {records.length} {records.length === 1 ? 'registro' : 'registros'}
        {hasMore ? ' · hay más' : ''}
      </span>
      {hasMore && (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
      <label className={styles.pageSize}>
        <select
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          aria-label="Registros por carga"
        >
          {AUDIT_LIMIT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span>por carga</span>
      </label>
    </div>
  </div>
);

export default AuditRecordsTable;

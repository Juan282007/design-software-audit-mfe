/**
 * adapter/in/components/AuditFiltersPanel — presentational filter bar.
 *
 * Markup mirrors the mockup helper C().filters() (form.card.filters with
 * .form-field children and a .btn.btn-secondary action). Fields follow the
 * contract (audit.yaml): intentionally NO "Correlación" input — audit_record
 * has no correlation_id column.
 *
 * The Exportar button (HU-AUD-002) only READS the shared filter state owned
 * by useAuditRecordsQuery — it never duplicates it. Loading/error states are
 * local to the button so the rest of the screen stays interactive (E4).
 */
import type { FC, FormEvent } from 'react';

import type { AuditExportStatus } from '../../../application/useAuditExport.js';
import type { AuditFilterKey } from '../../../application/useAuditRecordsQuery.js';
import {
  AUDIT_SOURCE_SERVICES,
  type AuditFilters,
} from '../../../domain/audit.js';
import AuditIcon from './AuditIcon.js';
import styles from './AuditFiltersPanel.module.css';

interface AuditFiltersPanelProps {
  filters: AuditFilters;
  onChange: (key: AuditFilterKey, value: string) => void;
  dateRangeValid: boolean;
  onExport: () => void;
  exportStatus: AuditExportStatus;
  exportError: string | null;
}

const AuditFiltersPanel: FC<AuditFiltersPanelProps> = ({
  filters,
  onChange,
  dateRangeValid,
  onExport,
  exportStatus,
  exportError,
}) => {
  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
  };

  return (
    <form
      className={`${styles.card} ${styles.filters}`}
      data-filter-form
      onSubmit={onSubmit}
      aria-label="Filtros de auditoría"
    >
      <label className={styles.formField}>
        <span>Actor (UUID)</span>
        <input
          className={styles.input}
          type="text"
          placeholder="UUID"
          value={filters.actorId}
          onChange={(event) => onChange('actorId', event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className={styles.formField}>
        <span>Tipo de entidad</span>
        <input
          className={styles.input}
          type="text"
          placeholder="schedule"
          value={filters.entityType}
          onChange={(event) => onChange('entityType', event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className={styles.formField}>
        <span>Tipo de evento</span>
        <input
          className={styles.input}
          type="text"
          placeholder="SCHEDULE_PUBLISHED"
          value={filters.eventType}
          onChange={(event) => onChange('eventType', event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className={styles.formField}>
        <span>ID de entidad (UUID)</span>
        <input
          className={styles.input}
          type="text"
          placeholder="UUID"
          value={filters.entityId}
          onChange={(event) => onChange('entityId', event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className={styles.formField}>
        <span>Servicio origen</span>
        <select
          className={styles.select}
          value={filters.sourceService}
          onChange={(event) => onChange('sourceService', event.target.value)}
        >
          <option value="">Todos</option>
          {AUDIT_SOURCE_SERVICES.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.formField}>
        <label htmlFor="audit-from">
          <span>Desde</span>
        </label>
        <input
          id="audit-from"
          className={styles.input}
          type="date"
          value={filters.from}
          onChange={(event) => onChange('from', event.target.value)}
        />
      </div>
      <div className={styles.formField}>
        <label htmlFor="audit-to">
          <span>Hasta</span>
        </label>
        <input
          id="audit-to"
          className={styles.input}
          type="date"
          value={filters.to}
          onChange={(event) => onChange('to', event.target.value)}
        />
      </div>
      {!dateRangeValid && (
        <p className={styles.fieldError} role="alert">
          <AuditIcon name="warning" />
          El rango de fechas es inválido: “Desde” no puede ser posterior a “Hasta”.
        </p>
      )}
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={onExport}
        disabled={exportStatus === 'exporting' || !dateRangeValid}
        title="Exporta lo que ves filtrado (CSV)."
      >
        <AuditIcon name="filter" />
        {exportStatus === 'exporting' ? 'Exportando…' : 'Exportar'}
      </button>
      {exportStatus === 'error' && exportError && (
        <p className={styles.exportError} role="alert">
          {exportError}
        </p>
      )}
    </form>
  );
};

export default AuditFiltersPanel;

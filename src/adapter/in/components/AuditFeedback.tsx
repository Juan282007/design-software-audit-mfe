/**
 * adapter/in/components/AuditFeedback — loading / empty / error states (E4).
 *
 * Markup mirrors the mockup helper C().state(): .panel > state sections with
 * .state-icon, h2/p copy and .btn actions. Never an unexplained blank table.
 */
import type { FC } from 'react';

import AuditIcon from './AuditIcon.js';
import styles from './AuditFeedback.module.css';

export const AuditLoadingSkeleton: FC = () => (
  <section
    className={`${styles.panel} ${styles.loadingState}`}
    aria-label="Cargando"
  >
    <div style={{ width: '100%' }}>
      <div className={styles.skeleton} style={{ height: 28, width: '35%', marginBottom: 20 }} />
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className={`${styles.skeleton} ${styles.skeletonRow}`} />
      ))}
    </div>
  </section>
);

interface AuditEmptyStateProps {
  onReset: () => void;
}

export const AuditEmptyState: FC<AuditEmptyStateProps> = ({ onReset }) => (
  <section className={`${styles.panel} ${styles.emptyState}`}>
    <div>
      <span className={styles.stateIcon}>
        <AuditIcon name="search" />
      </span>
      <h2>No hay eventos que coincidan con los filtros.</h2>
      <p>Prueba con otros criterios o limpia los filtros para consultar nuevamente.</p>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={onReset}
      >
        Limpiar filtros
      </button>
    </div>
  </section>
);

interface AuditErrorStateProps {
  isForbidden: boolean;
  onRetry: () => void;
}

export const AuditErrorState: FC<AuditErrorStateProps> = ({
  isForbidden,
  onRetry,
}) => (
  <section className={`${styles.panel} ${styles.errorState}`}>
    <div>
      <span className={styles.stateIcon}>
        <AuditIcon name="warning" />
      </span>
      <h2>
        {isForbidden
          ? 'No tienes permiso para ver la auditoría.'
          : 'Algo salió mal de nuestro lado.'}
      </h2>
      <p>
        {isForbidden
          ? 'Esta pantalla requiere el permiso AUDIT_LOG_VIEW. Contacta a tu administrador.'
          : 'Ocurrió un error inesperado. Intenta de nuevo en unos minutos.'}
      </p>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={onRetry}
      >
        <AuditIcon name="refresh" />
        Reintentar
      </button>
    </div>
  </section>
);

export default AuditLoadingSkeleton;

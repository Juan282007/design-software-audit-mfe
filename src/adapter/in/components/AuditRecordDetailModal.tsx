/**
 * adapter/in/components/AuditRecordDetailModal — read-only record viewer (E3).
 *
 * Markup mirrors the mockup auditModal(): .modal-backdrop > section.modal.modal-lg
 * with dl.detail-grid identification blocks and a pre.code-view payload.
 * Append-only rule: never edits or deletes. Null when idle.
 */
import { useEffect, useState, type FC, type MouseEvent, type ReactElement } from 'react';

import type { AuditDetailStatus } from '../../../application/useAuditRecordDetail.js';
import {
  actorLabel,
  entityLabel,
  formatAuditDateTime,
  type ActorDirectory,
  type AuditRecord,
} from '../../../domain/audit.js';
import AuditIcon from './AuditIcon.js';
import { AuditErrorState, AuditLoadingSkeleton } from './AuditFeedback.js';
import styles from './AuditRecordDetailModal.module.css';

interface AuditRecordDetailModalProps {
  record: AuditRecord | null;
  status: AuditDetailStatus;
  isForbidden: boolean;
  actorDirectory?: ActorDirectory;
  onClose: () => void;
  onRetry: () => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    return true;
  } catch {
    return false;
  }
}

function CopyIconButton({ text, label }: { text: string; label: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copyIconBtn}
      aria-label={copied ? 'Copiado' : label}
      title={copied ? 'Copiado' : label}
      onClick={() => {
        void copyText(text).then((ok) => {
          if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        });
      }}
    >
      <AuditIcon name="copy" />
    </button>
  );
}

const AuditRecordDetailModal: FC<AuditRecordDetailModalProps> = ({
  record,
  status,
  isForbidden,
  actorDirectory,
  onClose,
  onRetry,
}) => {
  const [jsonCopied, setJsonCopied] = useState(false);

  useEffect(() => {
    if (status === 'idle') return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [status, onClose]);

  useEffect(() => {
    setJsonCopied(false);
  }, [record?.id]);

  if (status === 'idle') return null;

  const onBackdropClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className={styles.backdrop} onClick={onBackdropClick}>
      <section
        className={`${styles.modal} ${styles.modalLg}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className={styles.modalHeader}>
          <h2 id="modal-title">Detalle de registro de auditoría</h2>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <AuditIcon name="x" />
          </button>
        </header>
        <div className={styles.modalBody}>
          {status === 'loading' && <AuditLoadingSkeleton />}
          {status === 'error' && (
            <AuditErrorState isForbidden={isForbidden} onRetry={onRetry} />
          )}
          {status === 'success' && record && (
            <>
              <div className={styles.summary}>
                <div>
                  <p className={styles.eventName}>{record.eventType}</p>
                  <span className={styles.statusBadge}>
                    <AuditIcon name="info" />
                    {record.sourceService}
                  </span>
                </div>
                <dl className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <dt>Recibido</dt>
                    <dd>{formatAuditDateTime(record.receivedAt)}</dd>
                  </div>
                  <div className={styles.detailItem}>
                    <dt>Ocurrido en origen</dt>
                    <dd>{formatAuditDateTime(record.eventOccurredAt)}</dd>
                  </div>
                </dl>
              </div>
              <h3 className={styles.sectionTitle}>Identificación</h3>
              <dl className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <dt>ID de evento</dt>
                  <dd>
                    {record.eventId}{' '}
                    <CopyIconButton text={record.eventId} label="Copiar ID de evento" />
                  </dd>
                </div>
                <div className={styles.detailItem}>
                  <dt>Actor</dt>
                  <dd>{actorLabel(record.actorId, actorDirectory)}</dd>
                </div>
                <div className={styles.detailItem}>
                  <dt>Entidad</dt>
                  <dd>{entityLabel(record.entityType, record.entityId)}</dd>
                </div>
              </dl>
              <h3 className={styles.sectionTitle}>Payload</h3>
              <pre className={styles.codeView}>
                {JSON.stringify(record.payload, null, 2)}
              </pre>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary} ${styles.copyJson}`}
                onClick={() => {
                  void copyText(JSON.stringify(record.payload, null, 2)).then((ok) => {
                    if (ok) {
                      setJsonCopied(true);
                      setTimeout(() => setJsonCopied(false), 1500);
                    }
                  });
                }}
              >
                <AuditIcon name="copy" />
                {jsonCopied ? 'Copiado' : 'Copiar JSON'}
              </button>
            </>
          )}
        </div>
        <footer className={styles.modalFooter}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onClose}
          >
            Cerrar
          </button>
        </footer>
      </section>
    </div>
  );
};

export default AuditRecordDetailModal;

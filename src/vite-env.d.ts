/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When set, the MFE calls the real audit-service instead of burned-in data. */
  readonly VITE_AUDIT_API_URL?: string;
}

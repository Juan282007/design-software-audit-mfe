import type { FC } from 'react';

import AuditTrailPage from './adapter/in/pages/AuditTrailPage.js';
import type { AuditMfeProps } from './contracts/remote-props.js';
import styles from './App.module.css';

/**
 * auditMfe remote entry (./App). Mounted by the shell under /audit/*.
 * The shell owns BrowserRouter/history; this remote never creates one.
 */
const App: FC<AuditMfeProps> = () => (
  <div className={styles.root} data-mfe="audit">
    <AuditTrailPage />
  </div>
);

export default App;

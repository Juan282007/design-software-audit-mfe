import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.js';
import styles from './App.module.css';

const container = document.getElementById('root');

// Standalone dev only: the shell owns body styles in production.
document.body.style.margin = '0';
document.body.style.background = '#f8fafc';

if (container) {
  createRoot(container).render(
    <StrictMode>
      <div className={styles.standalone}>
        <div className={styles.standaloneInner}>
          <App />
        </div>
      </div>
    </StrictMode>,
  );
}

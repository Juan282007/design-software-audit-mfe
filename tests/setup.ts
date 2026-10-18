import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs with `globals: false`, so Testing Library's auto-cleanup
// (which hooks the global afterEach) never fires. Register it explicitly
// to keep every test file isolated.
afterEach(() => {
  cleanup();
});

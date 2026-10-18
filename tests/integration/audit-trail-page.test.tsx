import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuditApiError } from '../../src/application/ports/audit-port.js';
import AuditTrailPage from '../../src/adapter/in/pages/AuditTrailPage.js';
import { createMockAuditRepository } from '../../src/adapter/out/mock-audit-repository.js';

/** jsdom has no object URLs: stub the download mechanics, assert the intent. */
const downloads: { href: string; download: string }[] = [];
let clickSpy: ReturnType<typeof vi.spyOn> | null = null;

afterEach(() => {
  downloads.length = 0;
  clickSpy?.mockRestore();
  clickSpy = null;
});

function stubDownload(): void {
  URL.createObjectURL = vi.fn(() => 'blob:mock-export') as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
  clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ href: this.href, download: this.download });
    });
}

function renderPage() {
  return render(
    <AuditTrailPage repository={createMockAuditRepository({ latencyMs: 0 })} />,
  );
}

describe('AuditTrailPage (HU-AUD-005)', () => {
  it('E1: lists paged records with actor, action, origin service and date', async () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Auditoría' }),
    ).toBeInTheDocument();

    const firstRow = await screen.findByText('SCHEDULE_PUBLISHED');
    expect(firstRow).toBeInTheDocument();
    expect((await screen.findAllByText('María García')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('scheduling-service')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Mostrando 10 registros/)).toBeInTheDocument();

    // Cursor paging: load the remaining burned rows.
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
    await waitFor(() => {
      expect(screen.getByText(/Mostrando 12 registros/)).toBeInTheDocument();
    });
  });

  it('E2: combinable filters re-query without reloading the page', async () => {
    renderPage();
    await screen.findByText('SCHEDULE_PUBLISHED');

    const serviceSelect = screen.getByLabelText('Servicio origen');
    fireEvent.change(serviceSelect, { target: { value: 'iam-service' } });

    await waitFor(() => {
      expect(screen.queryByText('SCHEDULE_PUBLISHED')).not.toBeInTheDocument();
    });
    expect(screen.getByText('USER_ROLE_ASSIGNED')).toBeInTheDocument();
    expect(screen.getByText('USER_DEACTIVATED')).toBeInTheDocument();
  });

  it('E3: clicking a row opens the detail with the full payload', async () => {
    renderPage();
    await screen.findByText('SCHEDULE_PUBLISHED');

    const row = screen.getByText('SCHEDULE_PUBLISHED').closest('tr');
    if (!row) throw new Error('expected row');
    fireEvent.click(within(row).getByRole('button', { name: /Ver payload/ }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Detalle de registro de auditoría',
    });
    expect(
      within(dialog).getByText('e0000000-0000-4000-8000-000000000001'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Payload')).toBeInTheDocument();
    expect(within(dialog).getByText(/UNDER_REVIEW/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByText('Cerrar'));
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Detalle de registro de auditoría' }),
      ).not.toBeInTheDocument();
    });
  });

  it('E4: shows an explicit empty state when filters match nothing', async () => {
    renderPage();
    await screen.findByText('SCHEDULE_PUBLISHED');

    fireEvent.change(screen.getByLabelText('Tipo de evento'), {
      target: { value: 'EVENT_THAT_DOES_NOT_EXIST' },
    });
    expect(
      await screen.findByText('No hay eventos que coincidan con los filtros.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('E4: shows an explicit error state on backend failure, with retry', async () => {
    const repository = createMockAuditRepository({ latencyMs: 0 });
    repository.failNext(new AuditApiError('Backend caído', { status: 500 }));
    render(<AuditTrailPage repository={repository} />);

    expect(await screen.findByText('Algo salió mal de nuestro lado.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('SCHEDULE_PUBLISHED');
  });

  it('HU-AUD-002 E1/E3: Exportar downloads the filtered view as CSV', async () => {
    stubDownload();
    renderPage();
    await screen.findByText('SCHEDULE_PUBLISHED');

    fireEvent.change(screen.getByLabelText('Servicio origen'), {
      target: { value: 'iam-service' },
    });
    await waitFor(() => {
      expect(screen.queryByText('SCHEDULE_PUBLISHED')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    await waitFor(() => {
      expect(downloads).toHaveLength(1);
    });
    expect(downloads[0]?.href).toBe('blob:mock-export');
    expect(downloads[0]?.download).toBe('auditoria.csv');
  });

  it('HU-AUD-002 E4: export error shows inline without blocking the screen', async () => {
    stubDownload();
    const repository = createMockAuditRepository({ latencyMs: 0 });
    render(<AuditTrailPage repository={repository} />);
    await screen.findByText('SCHEDULE_PUBLISHED');

    repository.failNext(new AuditApiError('Exportación fallida', { status: 500 }));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    expect(await screen.findByText('Exportación fallida')).toBeInTheDocument();
    // The listing behind stays interactive.
    expect(screen.getByText('SCHEDULE_PUBLISHED')).toBeInTheDocument();
    expect(downloads).toHaveLength(0);
  });

  it('flags an invalid date range instead of querying', async () => {
    renderPage();
    await screen.findByText('SCHEDULE_PUBLISHED');

    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-08-07' },
    });
    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-08-06' },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no puede ser posterior/i,
    );
  });
});

/**
 * adapter/out/file-download — browser file save for exports (HU-AUD-002).
 *
 * Implements the FileDownloader port from application/ports/audit-port.
 * Only adapter/in (pages) imports this; application/ only knows the port.
 */
import type { FileDownloader } from '../../application/ports/audit-port.js';

export const browserFileDownloader: FileDownloader = {
  save(download: { filename: string; mimeType: string; text: string }): void {
    const blob = new Blob([download.text], { type: `${download.mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = download.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  },
};

/**
 * adapter/in/components/AuditIcon — stroke icons copied from the v2 mockup
 * (design-software-pages/v2/assets/icons.js). Same 24px viewBox, same paths,
 * same stroke styling; only the delivery changes (inline React SVG).
 */
import type { FC } from 'react';

export type AuditIconName =
  | 'info'
  | 'x'
  | 'filter'
  | 'copy'
  | 'search'
  | 'warning'
  | 'refresh'
  | 'check';

const PATHS: Record<AuditIconName, string> = {
  info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path>',
  x: '<path d="M6 6l12 12M18 6 6 18"></path>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"></path>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>',
  search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>',
  warning:
    '<path d="M10.3 3.5 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4M12 17h.01"></path>',
  check: '<circle cx="12" cy="12" r="9"></circle><path d="m8.5 12 2.5 2.5 4.5-5"></path>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"></path><path d="M20 4v7h-7"></path>',
};

interface AuditIconProps {
  name: AuditIconName;
}

const AuditIcon: FC<AuditIconProps> = ({ name }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    dangerouslySetInnerHTML={{ __html: PATHS[name] }}
  />
);

export default AuditIcon;

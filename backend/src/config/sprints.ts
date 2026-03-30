export interface PiWindow {
  key: string;
  label: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// Calendar currently hardcoded from KPI feature spec.
// Keeping a short historical tail (24-25 PI4..PI6) helps trend readability.
export const PI_WINDOWS: PiWindow[] = [
  { key: 'PI4', label: '24-25 PI4', start: '2025-02-03', end: '2025-04-04' },
  { key: 'PI5', label: '24-25 PI5', start: '2025-04-07', end: '2025-06-06' },
  { key: 'PI6', label: '24-25 PI6', start: '2025-06-09', end: '2025-08-01' },
  { key: 'PI1', label: '25-26 PI1', start: '2025-08-04', end: '2025-10-03' },
  { key: 'PI2', label: '25-26 PI2', start: '2025-10-06', end: '2025-12-05' },
  { key: 'PI3', label: '25-26 PI3', start: '2025-12-08', end: '2026-02-06' },
  { key: 'PI4', label: '25-26 PI4', start: '2026-02-09', end: '2026-04-10' },
  { key: 'PI5', label: '25-26 PI5', start: '2026-04-13', end: '2026-06-12' },
  { key: 'PI6', label: '25-26 PI6', start: '2026-06-15', end: '2026-08-14' },
];


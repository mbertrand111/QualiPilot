export interface PiWindow {
  key: string;
  label: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// Fallback PI windows used when no sprint calendar is available.
// Source: planning ADO 24-25 / 25-26.
export const PI_WINDOWS: PiWindow[] = [
  { key: '24_25_PI1', label: '24-25 PI1', start: '2024-07-22', end: '2024-09-20' },
  { key: '24_25_PI2', label: '24-25 PI2', start: '2024-09-23', end: '2024-11-22' },
  { key: '24_25_PI3', label: '24-25 PI3', start: '2024-11-25', end: '2025-01-24' },
  { key: '24_25_PI4', label: '24-25 PI4', start: '2025-01-27', end: '2025-03-28' },
  { key: '24_25_PI5', label: '24-25 PI5', start: '2025-03-31', end: '2025-05-23' },
  { key: '24_25_PI6', label: '24-25 PI6', start: '2025-05-26', end: '2025-08-01' },
  { key: '25_26_PI1', label: '25-26 PI1', start: '2025-08-04', end: '2025-10-17' },
  { key: '25_26_PI2', label: '25-26 PI2', start: '2025-09-29', end: '2025-12-05' },
  { key: '25_26_PI3', label: '25-26 PI3', start: '2025-12-08', end: '2026-02-06' },
  { key: '25_26_PI4', label: '25-26 PI4', start: '2026-02-03', end: '2026-04-10' },
  { key: '25_26_PI5', label: '25-26 PI5', start: '2026-04-13', end: '2026-06-12' },
  { key: '25_26_PI6', label: '25-26 PI6', start: '2026-06-15', end: '2026-08-14' },
];

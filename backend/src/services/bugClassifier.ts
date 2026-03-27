// ─── Bug type classification ───────────────────────────────────────────────
// See CLAUDE.md §"Classification des bugs" for the full business rules.

export type BugType = 'live' | 'onpremise' | 'hors_version' | 'uncategorized';

function isLiveVersion(v: string): boolean {
  const s = v.replace(/^FAH_/i, '').trim();
  // 13.99.xx is Live
  if (/^13\.99([.\d]*)$/.test(s)) return true;
  // Extract leading 1–2 digit major: old FAH 14–17, modern FAH 24+
  const m = s.match(/^(\d{1,2})\./);
  if (m) {
    const n = parseInt(m[1], 10);
    if ((n >= 14 && n <= 17) || n >= 24) return true;
  }
  return false;
}

function isOnPremiseVersion(v: string): boolean {
  const s = v.replace(/^FAH_/i, '').trim();
  // 11.xx or 12.xx
  if (/^1[12]\./.test(s)) return true;
  // 13.xx but NOT 13.99
  const m = s.match(/^13\.(\d+)/);
  if (m && parseInt(m[1], 10) < 99) return true;
  return false;
}

/**
 * Classifies a bug as Live / OnPremise / Hors Version / Uncategorized.
 * Priority: version_souhaitee → found_in (fallback when vs is empty).
 * "Migration" in found_in forces Live regardless.
 */
export function classifyBug(
  versionSouhaitee: string | null,
  foundIn: string | null,
): BugType {
  const vs = versionSouhaitee?.trim() ?? '';
  const fi = foundIn?.trim() ?? '';

  if (vs === 'Non concerné') return 'hors_version';
  if (/migration/i.test(fi)) return 'live';
  if (/\/\s*live/i.test(fi)) return 'live'; // bug histo volontairement requalifié en live

  if (vs) {
    if (isLiveVersion(vs))      return 'live';
    if (isOnPremiseVersion(vs)) return 'onpremise';
  }

  if (fi) {
    if (isLiveVersion(fi))      return 'live';
    if (isOnPremiseVersion(fi)) return 'onpremise';
  }

  return 'uncategorized';
}

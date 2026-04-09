// Bug type classification
// See CLAUDE.md section "Classification des bugs" for business rules.

export type BugType = 'live' | 'onpremise' | 'hors_version' | 'uncategorized';

function normalizeToken(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function isHorsVersionSignal(v: string): boolean {
  const token = normalizeToken(v);
  if (!token) return false;
  return token === 'NONCONCERNE' || token.includes('ISACUVEWEB');
}

function isLiveSignal(v: string): boolean {
  const token = normalizeToken(v);
  if (!token) return false;
  return token.includes('TPVLIVE');
}

function isLiveVersion(v: string): boolean {
  const s = v.replace(/^FAH_/i, '').trim();
  // 13.99.xx is Live
  if (/^13\.99([.\d]*)$/.test(s)) return true;
  // Extract leading 1-2 digit major: old FAH 14-17, modern FAH 24+
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
 * Priority: version_souhaitee -> found_in (fallback when vs is empty).
 * "Migration" in found_in forces Live regardless.
 */
export function classifyBug(
  versionSouhaitee: string | null,
  foundIn: string | null,
  integrationBuild?: string | null,
  raisonOrigine?: string | null,
  title?: string | null,
): BugType {
  const vs = versionSouhaitee?.trim() ?? '';
  const fi = foundIn?.trim() ?? '';
  const ib = integrationBuild?.trim() ?? '';
  const ro = raisonOrigine?.trim() ?? '';
  const ti = title?.trim() ?? '';

  if (isHorsVersionSignal(vs) || isHorsVersionSignal(fi) || isHorsVersionSignal(ib) || isHorsVersionSignal(ro)) {
    return 'hors_version';
  }
  if (isLiveSignal(vs) || isLiveSignal(fi) || isLiveSignal(ib) || isLiveSignal(ro) || isLiveSignal(ti)) {
    return 'live';
  }
  if (/migration/i.test(fi)) return 'live';
  if (/\/\s*live/i.test(fi)) return 'live'; // historical bug intentionally requalified as live

  if (vs) {
    if (isLiveVersion(vs)) return 'live';
    if (isOnPremiseVersion(vs)) return 'onpremise';
  }

  if (fi) {
    if (isLiveVersion(fi)) return 'live';
    if (isOnPremiseVersion(fi)) return 'onpremise';
  }

  return 'uncategorized';
}

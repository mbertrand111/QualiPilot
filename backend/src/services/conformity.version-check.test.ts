import { describe, expect, it } from 'vitest';
import { evalVersionCheck, type BugRow } from './conformity';

function bug(overrides: Partial<BugRow>): BugRow {
  return {
    id: 1,
    state: 'Closed',
    priority: 2,
    area_path: null,
    found_in: null,
    integration_build: null,
    version_souhaitee: null,
    raison_origine: null,
    resolved_reason: 'Corrigé',
    created_date: '2026-01-01',
    ...overrides,
  };
}

describe('VERSION_CHECK OnPremise format', () => {
  it('flags "13.87.200 V7" as invalid', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.87.200 V6', version_souhaitee: '13.87.200 V7' }),
    )).toBe(true);
  });

  it('accepts plain 13.87.xxx when xxx is a multiple of 50', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.87.200', version_souhaitee: '13.87.250' }),
    )).toBe(false);
  });

  it('accepts plain 13.86.xxx when xxx is a multiple of 50', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.86.700', version_souhaitee: '13.86.750' }),
    )).toBe(false);
  });

  it('accepts 13.87.xxx even when xxx is not a multiple of 50', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.87.200', version_souhaitee: '13.87.230' }),
    )).toBe(false);
  });

  it('accepts 13.86.xxx even when xxx is not a multiple of 50', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.86.700', version_souhaitee: '13.86.730' }),
    )).toBe(false);
  });

  it('accepts OnPremise patch format with numeric patch id', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.87.200', version_souhaitee: '13.87.300 Patch 2' }),
    )).toBe(false);
  });

  it('accepts 13.86 patch format with numeric patch id', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.86.700', version_souhaitee: '13.86.750 Patch 7' }),
    )).toBe(false);
  });

  it('flags patch keyword without numeric patch id', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.87.200', version_souhaitee: '13.87.300 Patch V7' }),
    )).toBe(true);
  });

  it('flags 13.86 patch keyword without numeric patch id', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.86.700', version_souhaitee: '13.86.750 Patch V7' }),
    )).toBe(true);
  });

  it('accepts "13.86" (major-only legacy) in version_souhaitee', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.85.108', version_souhaitee: '13.86' }),
    )).toBe(false);
  });

  it('accepts "13.85" (major-only legacy) in version_souhaitee', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.85.108', version_souhaitee: '13.85' }),
    )).toBe(false);
  });

  it('accepts "12.50" (legacy 12.x) in version_souhaitee', () => {
    expect(evalVersionCheck(
      bug({ found_in: '12.80', version_souhaitee: '12.50' }),
    )).toBe(false);
  });

  it('accepts "14.10" (ancien FAH) in version_souhaitee', () => {
    expect(evalVersionCheck(
      bug({ found_in: '14.10', version_souhaitee: '14.10' }),
    )).toBe(false);
  });

  it('accepts "13." (just major prefix per CLAUDE.md spec) in version_souhaitee', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.85.108', version_souhaitee: '13.' }),
    )).toBe(false);
  });

  it('accepts "13.86" with empty found_in (skip when found_in vide)', () => {
    // Cas marginal : version legacy doit être OK même sans found_in
    expect(evalVersionCheck(
      bug({ found_in: null, version_souhaitee: '13.86' }),
    )).toBe(false);
  });

  it('accepts "13.86.500 Export" in version_souhaitee', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.86.500', version_souhaitee: '13.86.500 Export' }),
    )).toBe(false);
  });

  it('accepts "13.87.200 Export" in version_souhaitee', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.87.200', version_souhaitee: '13.87.200 Export' }),
    )).toBe(false);
  });

  it('accepts "13.86.530 Export" même si xxx non multiple de 50', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.86.500', version_souhaitee: '13.86.530 Export' }),
    )).toBe(false);
  });

  it('accepts 13.87.xxx for Active when found_in is 13.x', () => {
    expect(evalVersionCheck(
      bug({ state: 'Active', found_in: '13.86.700', version_souhaitee: '13.87.230' }),
    )).toBe(false);
  });

  it('accepts 13.87.xxx for New when found_in is 13.x', () => {
    expect(evalVersionCheck(
      bug({ state: 'New', found_in: '13.87.200', version_souhaitee: '13.87.230' }),
    )).toBe(false);
  });

  it('accepts placeholder "13.87.XXX" for Active when found_in is 13.x', () => {
    expect(evalVersionCheck(
      bug({ state: 'Active', found_in: '13.85.108', version_souhaitee: '13.87.XXX' }),
    )).toBe(false);
  });

  it('accepts placeholder "13.87.XXX" for New when found_in is 13.x', () => {
    expect(evalVersionCheck(
      bug({ state: 'New', found_in: '13.86.300', version_souhaitee: '13.87.XXX' }),
    )).toBe(false);
  });

  it('flags placeholder "13.87.XXX" for Closed (version non remplie)', () => {
    expect(evalVersionCheck(
      bug({ state: 'Closed', found_in: '13.86.300', version_souhaitee: '13.87.XXX' }),
    )).toBe(true);
  });

  it('flags placeholder "13.87.XXX" for Resolved (version non remplie)', () => {
    expect(evalVersionCheck(
      bug({ state: 'Resolved', found_in: '13.85.108', version_souhaitee: '13.87.XXX' }),
    )).toBe(true);
  });

  it('flags 13.87.xxx for Active when found_in is Live', () => {
    expect(evalVersionCheck(
      bug({ state: 'Active', found_in: '26.10', version_souhaitee: '13.87.230' }),
    )).toBe(true);
  });

  it('still flags 13.87.xxx for Closed when found_in is Live', () => {
    expect(evalVersionCheck(
      bug({ state: 'Closed', found_in: '26.10', version_souhaitee: '13.87.230' }),
    )).toBe(true);
  });
});

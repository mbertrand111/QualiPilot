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

  it('flags 13.87.xxx when xxx is not a multiple of 50', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.87.200', version_souhaitee: '13.87.230' }),
    )).toBe(true);
  });

  it('accepts OnPremise patch format with numeric patch id', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.87.200', version_souhaitee: '13.87.300 Patch 2' }),
    )).toBe(false);
  });

  it('flags patch keyword without numeric patch id', () => {
    expect(evalVersionCheck(
      bug({ found_in: '13.87.200', version_souhaitee: '13.87.300 Patch V7' }),
    )).toBe(true);
  });
});

/**
 * Unit tests for WRITABLE_FIELDS whitelist — no mocking needed.
 */
import { describe, it, expect } from 'vitest';
import { WRITABLE_FIELDS } from './adoWrite';

describe('WRITABLE_FIELDS whitelist', () => {
  it('contient exactement area_path, priority, integration_build, version_souhaitee', () => {
    expect(Object.keys(WRITABLE_FIELDS).sort()).toEqual(
      ['area_path', 'integration_build', 'priority', 'version_souhaitee'],
    );
  });

  it('priority accepte 1, 2, 3, 4 et refuse les autres', () => {
    const { validate } = WRITABLE_FIELDS.priority;
    expect(validate(1)).toBe(true);
    expect(validate(2)).toBe(true);
    expect(validate(3)).toBe(true);
    expect(validate(4)).toBe(true);
    expect(validate(0)).toBe(false);
    expect(validate(5)).toBe(false);
    expect(validate(2.5)).toBe(false);
    expect(validate('2')).toBe(false);
    expect(validate(null)).toBe(false);
  });

  it('version_souhaitee accepte les strings ≤255 chars et refuse le reste', () => {
    const { validate } = WRITABLE_FIELDS.version_souhaitee;
    expect(validate('FAH_26.20')).toBe(true);
    expect(validate('-')).toBe(true);
    expect(validate('')).toBe(true);
    expect(validate('a'.repeat(255))).toBe(true);
    expect(validate('a'.repeat(256))).toBe(false);
    expect(validate(2)).toBe(false);
    expect(validate(null)).toBe(false);
  });

  it('integration_build accepte les strings ≤255 chars et refuse le reste', () => {
    const { validate } = WRITABLE_FIELDS.integration_build;
    expect(validate('26.11.003')).toBe(true);
    expect(validate('-')).toBe(true);
    expect(validate('')).toBe(true);
    expect(validate('a'.repeat(255))).toBe(true);
    expect(validate('a'.repeat(256))).toBe(false);
    expect(validate(0)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { classifyBug } from './bugClassifier';

describe('classifyBug — hors_version', () => {
  it('Non concerné dans version_souhaitee → hors_version', () => {
    expect(classifyBug('Non concerné', null)).toBe('hors_version');
  });

  it('Non concerné (casse variée) dans found_in → hors_version', () => {
    expect(classifyBug(null, 'non concerné')).toBe('hors_version');
  });
});

describe('classifyBug — live (version_souhaitee)', () => {
  it('FAH_26.20 → live', () => {
    expect(classifyBug('FAH_26.20', null)).toBe('live');
  });

  it('26.20 (sans préfixe FAH) → live', () => {
    expect(classifyBug('26.20', null)).toBe('live');
  });

  it('FAH_25.10 → live', () => {
    expect(classifyBug('FAH_25.10', null)).toBe('live');
  });

  it('FAH_24.30 → live', () => {
    expect(classifyBug('FAH_24.30', null)).toBe('live');
  });

  it('17.xx (ancienne FAH) → live', () => {
    expect(classifyBug('17.20', null)).toBe('live');
  });

  it('14.xx (ancienne FAH) → live', () => {
    expect(classifyBug('14.10', null)).toBe('live');
  });

  it('13.99.xx → live', () => {
    expect(classifyBug('13.99.100', null)).toBe('live');
  });
});

describe('classifyBug — onpremise (version_souhaitee)', () => {
  it('13.87.200 → onpremise', () => {
    expect(classifyBug('13.87.200', null)).toBe('onpremise');
  });

  it('13.86.150 → onpremise', () => {
    expect(classifyBug('13.86.150', null)).toBe('onpremise');
  });

  it('12.xx → onpremise', () => {
    expect(classifyBug('12.50', null)).toBe('onpremise');
  });

  it('11.xx → onpremise', () => {
    expect(classifyBug('11.10', null)).toBe('onpremise');
  });
});

describe('classifyBug — fallback sur found_in', () => {
  it('version_souhaitee vide → utilise found_in Live', () => {
    expect(classifyBug('', '26.10')).toBe('live');
  });

  it('version_souhaitee null → utilise found_in OnPremise', () => {
    expect(classifyBug(null, '13.87.200')).toBe('onpremise');
  });

  it('Migration dans found_in → live', () => {
    expect(classifyBug(null, 'Migration')).toBe('live');
  });

  it('Migration (casse variée) dans found_in → live', () => {
    expect(classifyBug('', 'migration vers Live')).toBe('live');
  });
});

describe('classifyBug — uncategorized', () => {
  it('tous les champs vides → uncategorized', () => {
    expect(classifyBug(null, null)).toBe('uncategorized');
  });

  it('valeur inconnue → uncategorized', () => {
    expect(classifyBug('xyz-unknown', null)).toBe('uncategorized');
  });
});

describe('classifyBug — priorité version_souhaitee sur found_in', () => {
  it('version_souhaitee Live prime sur found_in OnPremise', () => {
    expect(classifyBug('FAH_26.20', '13.87.200')).toBe('live');
  });

  it('version_souhaitee OnPremise prime sur found_in Live', () => {
    expect(classifyBug('13.87.200', '26.10')).toBe('onpremise');
  });
});

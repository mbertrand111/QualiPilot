import { describe, it, expect } from 'vitest';
import { normalizeTeamName, extractTeamFromAreaPath, extractSprintFromIterationPath } from './sync';

const PROJECT = 'Isagri_Dev_GC_GestionCommerciale';
const area = (path: string) => `${PROJECT}\\${path}`;
const iter = (path: string) => `${PROJECT}\\${path}`;

describe('normalizeTeamName', () => {
  it('laisse les noms canoniques intacts', () => {
    expect(normalizeTeamName('COCO')).toBe('COCO');
    expect(normalizeTeamName('PIXELS')).toBe('PIXELS');
    expect(normalizeTeamName('LACE')).toBe('LACE');
  });

  it('normalise les underscores ADO → espaces/ponctuation', () => {
    expect(normalizeTeamName('GO_FAHST')).toBe('GO FAHST');
    expect(normalizeTeamName('MELI_MELO')).toBe('MELI MELO');
    expect(normalizeTeamName('MAGIC_SYSTEM')).toBe('MAGIC SYSTEM');
    expect(normalizeTeamName('JURASSIC_BACK')).toBe('JURASSIC BACK');
    expect(normalizeTeamName('NULL_REF')).toBe('NULL.REF');
    expect(normalizeTeamName('NULLREF')).toBe('NULL.REF');
  });

  it('ignore la casse pour les clés connues', () => {
    expect(normalizeTeamName('go_fahst')).toBe('GO FAHST');
    expect(normalizeTeamName('Null_Ref')).toBe('NULL.REF');
  });

  it('retourne la valeur trimée si inconnue', () => {
    expect(normalizeTeamName('  UNKNOWN_TEAM  ')).toBe('UNKNOWN_TEAM');
  });
});

describe('extractTeamFromAreaPath', () => {
  it('retourne null si areaPath vide ou null', () => {
    expect(extractTeamFromAreaPath(null)).toBeNull();
    expect(extractTeamFromAreaPath('')).toBeNull();
  });

  it('retourne null si pas de segment après le projet', () => {
    expect(extractTeamFromAreaPath(PROJECT)).toBeNull();
  });

  it('extrait le nom d\'équipe simple', () => {
    expect(extractTeamFromAreaPath(area('COCO'))).toBe('COCO');
    expect(extractTeamFromAreaPath(area('PIXELS'))).toBe('PIXELS');
  });

  it('normalise les noms d\'équipe avec underscores', () => {
    expect(extractTeamFromAreaPath(area('GO_FAHST'))).toBe('GO FAHST');
    expect(extractTeamFromAreaPath(area('NULL_REF'))).toBe('NULL.REF');
  });

  it('mappe Bugs à corriger\\Versions LIVE', () => {
    expect(extractTeamFromAreaPath(area('Bugs à corriger\\Versions LIVE'))).toBe('Bugs à corriger LIVE');
  });

  it('mappe Bugs à corriger\\Versions historiques', () => {
    expect(extractTeamFromAreaPath(area('Bugs à corriger\\Versions historiques'))).toBe('Bugs à corriger OnPremise');
  });

  it('mappe Bugs à corriger\\Hors versions', () => {
    expect(extractTeamFromAreaPath(area('Bugs à corriger\\Hors versions'))).toBe('Bugs à corriger Hors versions');
  });

  it('retourne Bugs à corriger sans sous-dossier si niveau 1 seulement', () => {
    expect(extractTeamFromAreaPath(area('Bugs à corriger'))).toBe('Bugs à corriger');
  });
});

describe('extractSprintFromIterationPath', () => {
  it('retourne null si iterationPath null ou vide', () => {
    expect(extractSprintFromIterationPath(null)).toBeNull();
    expect(extractSprintFromIterationPath('')).toBeNull();
  });

  it('retourne null si pas de pattern PI', () => {
    expect(extractSprintFromIterationPath(iter('2025-2026'))).toBeNull();
  });

  it('extrait sprint avec exercice', () => {
    expect(extractSprintFromIterationPath(iter('2025-2026\\PI2\\PI2-SP4'))).toBe('2025-2026 · PI2-SP4');
    expect(extractSprintFromIterationPath(iter('2025-2026\\PI1\\PI1-SP1'))).toBe('2025-2026 · PI1-SP1');
  });

  it('extrait sprint IP (sans SP)', () => {
    expect(extractSprintFromIterationPath(iter('2025-2026\\PI3\\PI3'))).toBe('2025-2026 · PI3');
  });

  it('préfixe Archive pour les chemins archivés', () => {
    expect(extractSprintFromIterationPath(iter('Z_Archives\\2024-2025\\PI5\\PI5-SP2'))).toBe('Archive · PI5-SP2');
  });

  it('retourne juste le sprint si pas d\'exercice détecté', () => {
    expect(extractSprintFromIterationPath(iter('PI2\\PI2-SP3'))).toBe('PI2-SP3');
  });
});

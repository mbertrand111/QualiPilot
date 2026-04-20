/**
 * Unit tests for conformity rule evaluators (pure functions, no mocking needed).
 *
 * Note : l'implémentation actuelle regroupe plusieurs règles métier sous des helpers
 * "agrégés" — par exemple evalTriageAreaCheck couvre à la fois CLOSED_BUG_IN_TRIAGE_AREA
 * et AREA_PATH_PRODUCT_COHERENCE de la spec CLAUDE.md. Les tests ci-dessous testent les
 * fonctions exportées telles qu'elles existent dans conformity.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  evalPriorityCheck,
  evalVersionCheck,
  evalBuildCheck,
  evalVersionBuildCoherence,
  evalIntegrationBuildNotEmptied,
  evalClosedBugCoherence,
  evalFahVersionRequired,
  evalTriageAreaCheck,
  evalNonClosedTransverseArea,
} from './conformity';
import type { BugRow } from './conformity';

// ─── Test fixture ─────────────────────────────────────────────────────────────

function bug(overrides: Partial<BugRow> = {}): BugRow {
  return {
    id: 1,
    state: 'Active',
    priority: 2,
    area_path: null,
    found_in: null,
    integration_build: null,
    version_souhaitee: null,
    raison_origine: null,
    resolved_reason: null,
    created_date: null,
    ...overrides,
  };
}

const ADO         = 'Isagri_Dev_GC_GestionCommerciale';
const CORRIGER    = `${ADO}\\Bugs à corriger`;
const PRIORISER   = `${ADO}\\Bugs à prioriser`;
const LIVE_PATH   = `${CORRIGER}\\Versions LIVE`;
const HISTO_PATH  = `${CORRIGER}\\Versions historiques`;
const HORS_PATH   = `${CORRIGER}\\Hors versions`;
const EMPTY_CFG   = '{}';

// ─── PRIORITY_CHECK ───────────────────────────────────────────────────────────

describe('evalPriorityCheck', () => {
  it('priority=2 → no violation',  () => expect(evalPriorityCheck(bug({ priority: 2 }))).toBe(false));
  it('priority=1 → violation',     () => expect(evalPriorityCheck(bug({ priority: 1 }))).toBe(true));
  it('priority=3 → violation',     () => expect(evalPriorityCheck(bug({ priority: 3 }))).toBe(true));
  it('priority=null → violation',  () => expect(evalPriorityCheck(bug({ priority: null }))).toBe(true));
});

// ─── VERSION_CHECK (ex VERSION_SOUHAITEE_CHECK) ───────────────────────────────
// Note : si found_in est vide, la règle ne peut pas déterminer le type de bug
// et renvoie false (skip silencieux). Idem pour version vide.

describe('evalVersionCheck', () => {
  it('version vide → skip (no violation)',
    () => expect(evalVersionCheck(bug({ found_in: '26.10', version_souhaitee: null }))).toBe(false));

  it('Live FAH_26.20, found_in=26.10 → no violation',
    () => expect(evalVersionCheck(bug({ found_in: '26.10', version_souhaitee: 'FAH_26.20' }))).toBe(false));

  it('Live FAH_26.21, found_in=26.10 → violation (yy non multiple de 5)',
    () => expect(evalVersionCheck(bug({ found_in: '26.10', version_souhaitee: 'FAH_26.21' }))).toBe(true));

  it('OnPremise 13.87.150, found_in=13.87 → no violation',
    () => expect(evalVersionCheck(bug({ found_in: '13.87.100', version_souhaitee: '13.87.150' }))).toBe(false));

  it('valeur "-" → no violation (cas spécial accepté)',
    () => expect(evalVersionCheck(bug({ found_in: '26.10', version_souhaitee: '-' }))).toBe(false));

  it('"Outil Jbeg" → no violation (cas spécial accepté)',
    () => expect(evalVersionCheck(bug({ found_in: '26.10', version_souhaitee: 'Outil Jbeg' }))).toBe(false));

  it('found_in absent → skip (no violation)',
    () => expect(evalVersionCheck(bug({ found_in: null, version_souhaitee: 'garbage' }))).toBe(false));

  it('Live garbage version → violation',
    () => expect(evalVersionCheck(bug({ found_in: '26.10', version_souhaitee: 'garbage' }))).toBe(true));
});

// ─── BUILD_CHECK (ex INTEGRATION_BUILD_REQUIRED) ──────────────────────────────

describe('evalBuildCheck', () => {
  it('Closed, build vide, créé après 2025 → violation',
    () => expect(evalBuildCheck(bug({ state: 'Closed', integration_build: null, created_date: '2025-06-01' }), EMPTY_CFG)).toBe(true));

  it('Closed, build vide, créé avant 2025 → no violation (toléré)',
    () => expect(evalBuildCheck(bug({ state: 'Closed', integration_build: null, created_date: '2024-12-01' }), EMPTY_CFG)).toBe(false));

  it('Closed, build "-" → no violation',
    () => expect(evalBuildCheck(bug({ state: 'Closed', integration_build: '-' }), EMPTY_CFG)).toBe(false));

  it('Closed, build "Non concerné" → no violation',
    () => expect(evalBuildCheck(bug({ state: 'Closed', integration_build: 'Non concerné' }), EMPTY_CFG)).toBe(false));

  it('Closed, build "26.11.003" → no violation (préfixe valide)',
    () => expect(evalBuildCheck(bug({ state: 'Closed', integration_build: '26.11.003' }), EMPTY_CFG)).toBe(false));

  it('Closed, build "garbage" → violation',
    () => expect(evalBuildCheck(bug({ state: 'Closed', integration_build: 'garbage', created_date: '2025-06-01' }), EMPTY_CFG)).toBe(true));

  it('Active, build null → no violation (règle Closed-only)',
    () => expect(evalBuildCheck(bug({ state: 'Active', integration_build: null }), EMPTY_CFG)).toBe(false));

  it('Closed, build "Build non renseigné*" → traité comme vide → violation',
    () => expect(evalBuildCheck(bug({ state: 'Closed', integration_build: 'Build non renseigné*', created_date: '2025-06-01' }), EMPTY_CFG)).toBe(true));

  it('Closed, version_souhaitee "13.86" (legacy major-only) → no violation même si build vide / placeholder',
    () => expect(evalBuildCheck(bug({ state: 'Closed', version_souhaitee: '13.86', integration_build: 'Build non renseigné*', created_date: '2025-06-01' }), EMPTY_CFG)).toBe(false));

  it('Closed, version_souhaitee "13.85" (legacy major-only) + build vide → no violation',
    () => expect(evalBuildCheck(bug({ state: 'Closed', version_souhaitee: '13.85', integration_build: null, created_date: '2025-06-01' }), EMPTY_CFG)).toBe(false));
});

// ─── VERSION_BUILD_COHERENCE — Live ───────────────────────────────────────────
// La règle vérifie aussi la cohérence found_in OnPremise + version Live (tous états).

describe('evalVersionBuildCoherence — Live', () => {
  it('FAH_26.20, build 26.20.001 patch suffix → violation (build patch non déclaré)',
    () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: 'FAH_26.20', integration_build: '26.20.001-2' }))).toBe(true));

  it('FAH_26.20, patch déclaré dans version + build cohérent → no violation',
    () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: 'FAH_26.20 Patch 2', integration_build: '26.20.001-2' }))).toBe(false));

  it('FAH_26.20 Patch 2, build sans suffixe -2 → violation',
    () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: 'FAH_26.20 Patch 2', integration_build: '26.20.001' }))).toBe(true));

  it('Active, version FAH + build numérique → no violation (Closed-only sauf inco produit)',
    () => expect(evalVersionBuildCoherence(bug({ state: 'Active', version_souhaitee: 'FAH_26.20', integration_build: '26.20.001' }))).toBe(false));
});

// ─── VERSION_BUILD_COHERENCE — Cohérence produit ─────────────────────────────

describe('evalVersionBuildCoherence — produit', () => {
  it('found_in OnPremise + version Live FAH (sans /live) → violation tous états',
    () => expect(evalVersionBuildCoherence(bug({ state: 'Active', found_in: '13.87.150', version_souhaitee: 'FAH_26.20' }))).toBe(true));

  it('found_in OnPremise requalifié "/live" + version FAH → no violation',
    () => expect(evalVersionBuildCoherence(bug({ state: 'Active', found_in: '13.87.150 / live', version_souhaitee: 'FAH_26.20' }))).toBe(false));
});

// ─── INTEGRATION_BUILD_NOT_EMPTIED ────────────────────────────────────────────

describe('evalIntegrationBuildNotEmptied', () => {
  it('Active, build null → no violation',    () => expect(evalIntegrationBuildNotEmptied(bug({ state: 'Active', integration_build: null }))).toBe(false));
  it('Active, build filled → violation',     () => expect(evalIntegrationBuildNotEmptied(bug({ state: 'Active', integration_build: '26.11.001' }))).toBe(true));
  it('Closed, build filled → no violation',  () => expect(evalIntegrationBuildNotEmptied(bug({ state: 'Closed', integration_build: '26.11.001' }))).toBe(false));
  it('New, build filled → violation',        () => expect(evalIntegrationBuildNotEmptied(bug({ state: 'New', integration_build: 'some build' }))).toBe(true));
});

// ─── CLOSED_BUG_COHERENCE ─────────────────────────────────────────────────────

describe('evalClosedBugCoherence', () => {
  it('Closed, Corrigé, valeurs quelconques → no violation',
    () => expect(evalClosedBugCoherence(bug({ state: 'Closed', resolved_reason: 'Corrigé', version_souhaitee: 'garbage', integration_build: 'garbage' }))).toBe(false));

  it('Closed, Réalisé → no violation',
    () => expect(evalClosedBugCoherence(bug({ state: 'Closed', resolved_reason: 'Réalisé', version_souhaitee: 'FAH_26.20', integration_build: '26.11.001' }))).toBe(false));

  it('Closed, Abandon, version="-" et build="-" → no violation',
    () => expect(evalClosedBugCoherence(bug({ state: 'Closed', resolved_reason: 'Abandon', version_souhaitee: '-', integration_build: '-' }))).toBe(false));

  it('Closed, Abandon, version != "-" → violation',
    () => expect(evalClosedBugCoherence(bug({ state: 'Closed', resolved_reason: 'Abandon', version_souhaitee: 'FAH_26.20', integration_build: '-' }))).toBe(true));

  it('Closed, Abandon, build != "-" → violation',
    () => expect(evalClosedBugCoherence(bug({ state: 'Closed', resolved_reason: 'Abandon', version_souhaitee: '-', integration_build: '26.11.001' }))).toBe(true));

  it('Active → no violation',
    () => expect(evalClosedBugCoherence(bug({ state: 'Active' }))).toBe(false));
});

// ─── FAH_VERSION_REQUIRED ─────────────────────────────────────────────────────

describe('evalFahVersionRequired', () => {
  it('found_in=26.10, version contient "FAH" → no violation',
    () => expect(evalFahVersionRequired(bug({ found_in: '26.10', version_souhaitee: 'FAH_26.20' }))).toBe(false));

  it('found_in=26.10, version=13.87.200 → violation (pas de "FAH")',
    () => expect(evalFahVersionRequired(bug({ found_in: '26.10', version_souhaitee: '13.87.200' }))).toBe(true));

  it('found_in=14.10, version=13.87.200 → violation (année ≥ 14 inclut anciennes Live)',
    () => expect(evalFahVersionRequired(bug({ found_in: '14.10', version_souhaitee: '13.87.200' }))).toBe(true));

  it('found_in=24.10, version="-" → no violation (exception)',
    () => expect(evalFahVersionRequired(bug({ found_in: '24.10', version_souhaitee: '-' }))).toBe(false));

  it('found_in=25.20, version="Outil Jbeg" → no violation (exception)',
    () => expect(evalFahVersionRequired(bug({ found_in: '25.20', version_souhaitee: 'Outil Jbeg' }))).toBe(false));

  it('found_in=null → no violation (pas de signal Live)',
    () => expect(evalFahVersionRequired(bug({ found_in: null }))).toBe(false));

  it('found_in=25.10, version=null → violation',
    () => expect(evalFahVersionRequired(bug({ found_in: '25.10', version_souhaitee: null }))).toBe(true));
});

// ─── TRIAGE_AREA_CHECK (combine plusieurs règles métier) ──────────────────────

describe('evalTriageAreaCheck', () => {
  it('Closed dans Bugs à prioriser, version="-" et build="-" → no violation',
    () => expect(evalTriageAreaCheck(bug({ state: 'Closed', area_path: PRIORISER, version_souhaitee: '-', integration_build: '-' }))).toBe(false));

  it('Closed dans Bugs à prioriser avec version FAH + build → violation',
    () => expect(evalTriageAreaCheck(bug({ state: 'Closed', area_path: PRIORISER, version_souhaitee: 'FAH_26.20', integration_build: '26.11.001' }))).toBe(true));

  it('Closed dans une équipe (hors triage) → no violation',
    () => expect(evalTriageAreaCheck(bug({ state: 'Closed', area_path: `${ADO}\\COCO`, version_souhaitee: 'FAH_26.20' }))).toBe(false));

  it('Active à la racine "Bugs à corriger" → violation (doit être en sous-dossier)',
    () => expect(evalTriageAreaCheck(bug({ state: 'Active', area_path: CORRIGER }))).toBe(true));

  it('found_in=26.10 (Live), area="Versions historiques" → violation',
    () => expect(evalTriageAreaCheck(bug({ state: 'Active', area_path: HISTO_PATH, found_in: '26.10' }))).toBe(true));

  it('found_in=26.10 (Live), area="Versions LIVE" → no violation',
    () => expect(evalTriageAreaCheck(bug({ state: 'Active', area_path: LIVE_PATH, found_in: '26.10' }))).toBe(false));

  it('found_in=13.87.150 (OnPremise), area="Versions LIVE" → violation',
    () => expect(evalTriageAreaCheck(bug({ state: 'Active', area_path: LIVE_PATH, found_in: '13.87.150' }))).toBe(true));

  it('found_in=13.87.150 (OnPremise), area="Versions historiques" → no violation',
    () => expect(evalTriageAreaCheck(bug({ state: 'Active', area_path: HISTO_PATH, found_in: '13.87.150' }))).toBe(false));

  it('signal Hors version + area="Hors versions" → no violation',
    () => expect(evalTriageAreaCheck(bug({ state: 'Active', area_path: HORS_PATH, version_souhaitee: 'Non concerné' }))).toBe(false));

  it('signal Hors version mais area=LIVE → violation',
    () => expect(evalTriageAreaCheck(bug({ state: 'Active', area_path: LIVE_PATH, version_souhaitee: 'Non concerné' }))).toBe(true));
});

// ─── BUGS_TRANSVERSE_AREA ─────────────────────────────────────────────────────

describe('evalNonClosedTransverseArea', () => {
  it('Active dans area transverse "Performance" → violation',
    () => expect(evalNonClosedTransverseArea(bug({ state: 'Active', area_path: `${ADO}\\Performance` }))).toBe(true));

  it('Closed dans area transverse → no violation',
    () => expect(evalNonClosedTransverseArea(bug({ state: 'Closed', area_path: `${ADO}\\Performance` }))).toBe(false));

  it('Active dans area équipe → no violation',
    () => expect(evalNonClosedTransverseArea(bug({ state: 'Active', area_path: `${ADO}\\COCO` }))).toBe(false));

  it('Active sans area → no violation',
    () => expect(evalNonClosedTransverseArea(bug({ state: 'Active', area_path: null }))).toBe(false));
});

/**
 * Unit tests for conformity rule evaluators — pure functions, no mocking needed.
 */
import { describe, it, expect } from 'vitest';
import {
  evalPriorityCheck,
  evalVersionSouhaiteeCheck,
  evalIntegrationBuildRequired,
  evalVersionBuildCoherence,
  evalIntegrationBuildNotEmptied,
  evalClosedBugCoherence,
  evalNonConcerneCoherence,
  evalFahVersionRequired,
  evalClosedBugInTriageArea,
  evalAreaPathProductCoherence,
} from './conformity';
import type { BugRow } from './conformity';

// ─── Test fixture ─────────────────────────────────────────────────────────────

function bug(overrides: Partial<BugRow> = {}): BugRow {
  return {
    id: 1, state: 'Active', priority: 2, area_path: null,
    found_in: null, integration_build: null, version_souhaitee: null, resolved_reason: null,
    ...overrides,
  };
}

const ADO = 'Isagri_Dev_GC_GestionCommerciale';
const CORRIGER    = `${ADO}\\Bugs à corriger`;
const PRIORISER   = `${ADO}\\Bugs à prioriser`;
const LIVE_PATH   = `${CORRIGER}\\Versions LIVE`;
const HISTO_PATH  = `${CORRIGER}\\Versions historiques`;

// ─── PRIORITY_CHECK ───────────────────────────────────────────────────────────

describe('PRIORITY_CHECK', () => {
  it('priority=2 → no violation',  () => expect(evalPriorityCheck(bug({ priority: 2 }))).toBe(false));
  it('priority=1 → violation',     () => expect(evalPriorityCheck(bug({ priority: 1 }))).toBe(true));
  it('priority=3 → violation',     () => expect(evalPriorityCheck(bug({ priority: 3 }))).toBe(true));
  it('priority=null → violation',  () => expect(evalPriorityCheck(bug({ priority: null }))).toBe(true));
});

// ─── VERSION_SOUHAITEE_CHECK ──────────────────────────────────────────────────

describe('VERSION_SOUHAITEE_CHECK', () => {
  it('state=Closed → no violation regardless',        () => expect(evalVersionSouhaiteeCheck(bug({ state: 'Closed', version_souhaitee: null }))).toBe(false));
  it('state=Active, FAH_26.20 → no violation',        () => expect(evalVersionSouhaiteeCheck(bug({ version_souhaitee: 'FAH_26.20' }))).toBe(false));
  it('state=Active, FAH_26.25 (not ×10) → violation', () => expect(evalVersionSouhaiteeCheck(bug({ version_souhaitee: 'FAH_26.25' }))).toBe(true));
  it('state=Active, 13.87.150 → no violation',        () => expect(evalVersionSouhaiteeCheck(bug({ version_souhaitee: '13.87.150' }))).toBe(false));
  it('state=Active, "-" → no violation',              () => expect(evalVersionSouhaiteeCheck(bug({ version_souhaitee: '-' }))).toBe(false));
  it('state=Active, null → violation',                () => expect(evalVersionSouhaiteeCheck(bug({ version_souhaitee: null }))).toBe(true));
  it('state=Active, garbage → violation',             () => expect(evalVersionSouhaiteeCheck(bug({ version_souhaitee: 'some garbage' }))).toBe(true));
  it('state=Active, Outil Jbeg → no violation',       () => expect(evalVersionSouhaiteeCheck(bug({ version_souhaitee: 'Outil Jbeg' }))).toBe(false));
  it('state=New, FAH_25.10 → no violation',           () => expect(evalVersionSouhaiteeCheck(bug({ state: 'New', version_souhaitee: 'FAH_25.10' }))).toBe(false));
});

// ─── INTEGRATION_BUILD_REQUIRED ───────────────────────────────────────────────

describe('INTEGRATION_BUILD_REQUIRED', () => {
  it('Closed, build filled → no violation',  () => expect(evalIntegrationBuildRequired(bug({ state: 'Closed', integration_build: '26.11.005' }))).toBe(false));
  it('Closed, build null → violation',       () => expect(evalIntegrationBuildRequired(bug({ state: 'Closed', integration_build: null }))).toBe(true));
  it('Closed, build "-" → no violation',     () => expect(evalIntegrationBuildRequired(bug({ state: 'Closed', integration_build: '-' }))).toBe(false));
  it('Resolved, build null → violation',     () => expect(evalIntegrationBuildRequired(bug({ state: 'Resolved', integration_build: null }))).toBe(true));
  it('Active, build null → no violation',    () => expect(evalIntegrationBuildRequired(bug({ state: 'Active', integration_build: null }))).toBe(false));
});

// ─── VERSION_BUILD_COHERENCE — Live ───────────────────────────────────────────

describe('VERSION_BUILD_COHERENCE — Live', () => {
  const cfg = '{}';

  it('FAH_26.20, build 26.11.003 → no violation',  () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: 'FAH_26.20', integration_build: '26.11.003' }), cfg)).toBe(false));
  it('FAH_26.20, build 26.20.001 → violation',      () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: 'FAH_26.20', integration_build: '26.20.001' }), cfg)).toBe(true));
  it('FAH_26.10, build 25.31.001 → no violation',   () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: 'FAH_26.10', integration_build: '25.31.001' }), cfg)).toBe(false));
  it('FAH_26.10, build 26.10.001 → violation',      () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: 'FAH_26.10', integration_build: '26.10.001' }), cfg)).toBe(true));
  it('FAH_26.20, build "-" → no violation',         () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: 'FAH_26.20', integration_build: '-' }), cfg)).toBe(false));
  it('FAH_26.20, patch exception → no violation',   () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: 'FAH_26.20', integration_build: 'Version FAH_26.20 Patch 2 - Build 26.20.001-2' }), cfg)).toBe(false));
  it('Active → no violation',                       () => expect(evalVersionBuildCoherence(bug({ state: 'Active', version_souhaitee: 'FAH_26.20', integration_build: '26.20.001' }), cfg)).toBe(false));
  it('version unknown in sequence → no violation',  () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: 'FAH_99.10', integration_build: '99.11.001' }), cfg)).toBe(false));
});

// ─── VERSION_BUILD_COHERENCE — OnPremise ──────────────────────────────────────

describe('VERSION_BUILD_COHERENCE — OnPremise', () => {
  const cfg = '{}';

  it('13.87.200, build 13.87.175 → no violation',      () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: '13.87.200', integration_build: '13.87.175' }), cfg)).toBe(false));
  it('13.87.200, build 13.87.200 → violation',          () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: '13.87.200', integration_build: '13.87.200' }), cfg)).toBe(true));
  it('13.87.200, build 13.87.149 → violation',          () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: '13.87.200', integration_build: '13.87.149' }), cfg)).toBe(true));
  it('13.87.150, build 13.87.101 → no violation',       () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: '13.87.150', integration_build: '13.87.101' }), cfg)).toBe(false));
  it('13.87.200, build "Non concerné" → no violation',  () => expect(evalVersionBuildCoherence(bug({ state: 'Closed', version_souhaitee: '13.87.200', integration_build: 'Non concerné' }), cfg)).toBe(false));
});

// ─── INTEGRATION_BUILD_NOT_EMPTIED ────────────────────────────────────────────

describe('INTEGRATION_BUILD_NOT_EMPTIED', () => {
  it('Active, build null → no violation',    () => expect(evalIntegrationBuildNotEmptied(bug({ state: 'Active', integration_build: null }))).toBe(false));
  it('Active, build filled → violation',     () => expect(evalIntegrationBuildNotEmptied(bug({ state: 'Active', integration_build: '26.11.001' }))).toBe(true));
  it('Closed, build filled → no violation',  () => expect(evalIntegrationBuildNotEmptied(bug({ state: 'Closed', integration_build: '26.11.001' }))).toBe(false));
  it('New, build filled → violation',        () => expect(evalIntegrationBuildNotEmptied(bug({ state: 'New', integration_build: 'some build' }))).toBe(true));
});

// ─── CLOSED_BUG_COHERENCE ─────────────────────────────────────────────────────

describe('CLOSED_BUG_COHERENCE', () => {
  it('Closed, Corrigé, any values → no violation',   () => expect(evalClosedBugCoherence(bug({ state: 'Closed', resolved_reason: 'Corrigé', version_souhaitee: 'garbage', integration_build: 'garbage' }))).toBe(false));
  it('Closed, Réalisé → no violation',               () => expect(evalClosedBugCoherence(bug({ state: 'Closed', resolved_reason: 'Réalisé', version_souhaitee: 'FAH_26.20', integration_build: '26.11.001' }))).toBe(false));
  it('Closed, Abandon, both "-" → no violation',     () => expect(evalClosedBugCoherence(bug({ state: 'Closed', resolved_reason: 'Abandon', version_souhaitee: '-', integration_build: '-' }))).toBe(false));
  it('Closed, Abandon, version != "-" → violation',  () => expect(evalClosedBugCoherence(bug({ state: 'Closed', resolved_reason: 'Abandon', version_souhaitee: 'FAH_26.20', integration_build: '-' }))).toBe(true));
  it('Closed, Abandon, build != "-" → violation',    () => expect(evalClosedBugCoherence(bug({ state: 'Closed', resolved_reason: 'Abandon', version_souhaitee: '-', integration_build: '26.11.001' }))).toBe(true));
  it('Active → no violation',                        () => expect(evalClosedBugCoherence(bug({ state: 'Active' }))).toBe(false));
});

// ─── NON_CONCERNE_COHERENCE ───────────────────────────────────────────────────

describe('NON_CONCERNE_COHERENCE', () => {
  it('both "Non concerné" → no violation',  () => expect(evalNonConcerneCoherence(bug({ version_souhaitee: 'Non concerné', integration_build: 'Non concerné' }))).toBe(false));
  it('only version NC → violation',          () => expect(evalNonConcerneCoherence(bug({ version_souhaitee: 'Non concerné', integration_build: '-' }))).toBe(true));
  it('only build NC → violation',            () => expect(evalNonConcerneCoherence(bug({ version_souhaitee: 'FAH_26.20', integration_build: 'Non concerné' }))).toBe(true));
  it('neither NC → no violation',            () => expect(evalNonConcerneCoherence(bug({ version_souhaitee: 'FAH_26.20', integration_build: '26.11.001' }))).toBe(false));
});

// ─── FAH_VERSION_REQUIRED ─────────────────────────────────────────────────────

describe('FAH_VERSION_REQUIRED', () => {
  it('found_in=26.10, version has FAH → no violation',         () => expect(evalFahVersionRequired(bug({ found_in: '26.10', version_souhaitee: 'FAH_26.20' }))).toBe(false));
  it('found_in=26.10, version=13.87.200 → violation',          () => expect(evalFahVersionRequired(bug({ found_in: '26.10', version_souhaitee: '13.87.200' }))).toBe(true));
  it('found_in=14.10, year<24 → no violation',                 () => expect(evalFahVersionRequired(bug({ found_in: '14.10', version_souhaitee: '13.87.200' }))).toBe(false));
  it('found_in=24.10, version="-" → no violation (exception)', () => expect(evalFahVersionRequired(bug({ found_in: '24.10', version_souhaitee: '-' }))).toBe(false));
  it('found_in=25.20, version=Outil Jbeg → no violation',      () => expect(evalFahVersionRequired(bug({ found_in: '25.20', version_souhaitee: 'Outil Jbeg' }))).toBe(false));
  it('found_in=null → no violation',                           () => expect(evalFahVersionRequired(bug({ found_in: null }))).toBe(false));
  it('found_in=25.10, version=null → violation',               () => expect(evalFahVersionRequired(bug({ found_in: '25.10', version_souhaitee: null }))).toBe(true));
});

// ─── CLOSED_BUG_IN_TRIAGE_AREA ────────────────────────────────────────────────

describe('CLOSED_BUG_IN_TRIAGE_AREA', () => {
  it('Closed, Bugs à prioriser, version FAH → violation',     () => expect(evalClosedBugInTriageArea(bug({ state: 'Closed', area_path: PRIORISER, version_souhaitee: 'FAH_26.20' }))).toBe(true));
  it('Closed, Bugs à prioriser, version "-" → no violation',  () => expect(evalClosedBugInTriageArea(bug({ state: 'Closed', area_path: PRIORISER, version_souhaitee: '-' }))).toBe(false));
  it('Closed, Bugs à corriger subfolder, version FAH → violation', () => expect(evalClosedBugInTriageArea(bug({ state: 'Closed', area_path: LIVE_PATH, version_souhaitee: 'FAH_26.20' }))).toBe(true));
  it('Active, triage area → no violation',                    () => expect(evalClosedBugInTriageArea(bug({ state: 'Active', area_path: PRIORISER, version_souhaitee: 'FAH_26.20' }))).toBe(false));
  it('Closed, other area → no violation',                     () => expect(evalClosedBugInTriageArea(bug({ state: 'Closed', area_path: `${ADO}\\COCO`, version_souhaitee: 'FAH_26.20' }))).toBe(false));
});

// ─── AREA_PATH_PRODUCT_COHERENCE ──────────────────────────────────────────────

describe('AREA_PATH_PRODUCT_COHERENCE', () => {
  it('found_in=26.10, area=Versions LIVE → no violation',          () => expect(evalAreaPathProductCoherence(bug({ found_in: '26.10', area_path: LIVE_PATH }))).toBe(false));
  it('found_in=26.10, area=Versions historiques → violation',      () => expect(evalAreaPathProductCoherence(bug({ found_in: '26.10', area_path: HISTO_PATH }))).toBe(true));
  it('found_in=13.87.150, area=Versions historiques → no violation',() => expect(evalAreaPathProductCoherence(bug({ found_in: '13.87.150', area_path: HISTO_PATH }))).toBe(false));
  it('found_in=13.87.150, area=Versions LIVE → violation',         () => expect(evalAreaPathProductCoherence(bug({ found_in: '13.87.150', area_path: LIVE_PATH }))).toBe(true));
  it('area=COCO → no violation (not in Bugs à corriger)',          () => expect(evalAreaPathProductCoherence(bug({ found_in: '26.10', area_path: `${ADO}\\COCO` }))).toBe(false));
  it('found_in=null → no violation',                               () => expect(evalAreaPathProductCoherence(bug({ found_in: null, area_path: LIVE_PATH }))).toBe(false));
});

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { piFollowup } from './kpis';

function createDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE bugs_cache (
      id INTEGER PRIMARY KEY,
      title TEXT,
      state TEXT,
      team TEXT,
      sprint TEXT,
      raison_origine TEXT,
      created_date TEXT,
      resolved_date TEXT,
      closed_date TEXT,
      changed_date TEXT,
      version_souhaitee TEXT,
      found_in TEXT,
      integration_build TEXT
    );

    CREATE TABLE sprint_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pi_label TEXT NOT NULL,
      sprint_label TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );
  `);
  return db;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('piFollowup', () => {
  it('maps created/resolved/closed to PI with expected fallbacks and default PI', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
    const db = createDb();

    db.prepare(`
      INSERT INTO bugs_cache (
        id, title, state, team, sprint, raison_origine,
        created_date, resolved_date, closed_date, changed_date,
        version_souhaitee, found_in, integration_build
      ) VALUES (
        @id, @title, @state, @team, @sprint, @raison_origine,
        @created_date, @resolved_date, @closed_date, @changed_date,
        @version_souhaitee, @found_in, @integration_build
      )
    `).run({
      id: 1,
      title: 'Bug resolved fallback',
      state: 'Resolved',
      team: 'COCO',
      sprint: 'PI4-SP3',
      raison_origine: null,
      created_date: '2026-03-10T08:00:00.000Z',
      resolved_date: null,
      closed_date: null,
      changed_date: '2026-03-20T10:00:00.000Z',
      version_souhaitee: '13.87.250',
      found_in: '13.87.200',
      integration_build: null,
    });

    db.prepare(`
      INSERT INTO bugs_cache (
        id, title, state, team, sprint, raison_origine,
        created_date, resolved_date, closed_date, changed_date,
        version_souhaitee, found_in, integration_build
      ) VALUES (
        @id, @title, @state, @team, @sprint, @raison_origine,
        @created_date, @resolved_date, @closed_date, @changed_date,
        @version_souhaitee, @found_in, @integration_build
      )
    `).run({
      id: 2,
      title: 'Bug closed fallback',
      state: 'Closed',
      team: 'MAGIC SYSTEM',
      sprint: 'PI4-SP4',
      raison_origine: null,
      created_date: '2026-03-11T08:00:00.000Z',
      resolved_date: null,
      closed_date: null,
      changed_date: '2026-03-22T10:00:00.000Z',
      version_souhaitee: 'FAH_26.20',
      found_in: '26.10',
      integration_build: null,
    });

    const result = piFollowup(db);
    expect(result.defaultPi).toBe('25-26 PI4');

    const pi4 = result.piWindows.find((window) => window.label === '25-26 PI4');
    expect(pi4?.started).toBe(true);
    expect(pi4?.completed).toBe(false);

    const bug1 = result.bugs.find((bug) => bug.id === 1);
    expect(bug1?.createdPi).toBe('25-26 PI4');
    expect(bug1?.resolvedDate).toBe('2026-03-20T10:00:00.000Z');
    expect(bug1?.resolvedPi).toBe('25-26 PI4');
    expect(bug1?.closedDate).toBeNull();

    const bug2 = result.bugs.find((bug) => bug.id === 2);
    expect(bug2?.createdPi).toBe('25-26 PI4');
    expect(bug2?.closedDate).toBe('2026-03-22T10:00:00.000Z');
    expect(bug2?.closedPi).toBe('25-26 PI4');
  });

  it('keeps explicit resolved/closed dates over changed date and exposes version split', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
    const db = createDb();

    db.prepare(`
      INSERT INTO bugs_cache (
        id, title, state, team, sprint, raison_origine,
        created_date, resolved_date, closed_date, changed_date,
        version_souhaitee, found_in, integration_build
      ) VALUES (
        @id, @title, @state, @team, @sprint, @raison_origine,
        @created_date, @resolved_date, @closed_date, @changed_date,
        @version_souhaitee, @found_in, @integration_build
      )
    `).run({
      id: 3,
      title: 'Bug explicit dates',
      state: 'Resolved',
      team: 'GO FAHST',
      sprint: 'PI3-SP3',
      raison_origine: null,
      created_date: '2026-01-05T09:00:00.000Z',
      resolved_date: '2026-01-10T09:00:00.000Z',
      closed_date: '2026-01-15T09:00:00.000Z',
      changed_date: '2026-03-10T09:00:00.000Z',
      version_souhaitee: 'FAH_26.20 Patch 2',
      found_in: '26.10',
      integration_build: null,
    });

    const result = piFollowup(db);
    const bug = result.bugs.find((entry) => entry.id === 3);

    expect(bug?.resolvedDate).toBe('2026-01-10T09:00:00.000Z');
    expect(bug?.closedDate).toBe('2026-01-15T09:00:00.000Z');
    expect(bug?.resolvedPi).toBe('25-26 PI3');
    expect(bug?.closedPi).toBe('25-26 PI3');
    expect(bug?.majorVersion).toBe('FAH_26.20');
    expect(bug?.patch).toBe('FAH_26.20 Patch 2');
  });
});

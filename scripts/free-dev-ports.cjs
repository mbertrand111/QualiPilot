#!/usr/bin/env node

const { execSync } = require('child_process');

const PORTS = [3001, 5173];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseWindowsListeningPids(output, port) {
  const pids = new Set();
  const lines = output.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Example:
    // TCP    0.0.0.0:3001      0.0.0.0:0      LISTENING       1234
    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;

    const localAddress = parts[1];
    const state = parts[3];
    const pid = Number(parts[4]);

    if (state !== 'LISTENING') continue;
    if (!Number.isInteger(pid) || pid <= 0) continue;
    if (!localAddress.endsWith(`:${port}`)) continue;

    pids.add(pid);
  }

  return [...pids];
}

function getListeningPidsWindows(port) {
  const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
  return parseWindowsListeningPids(output, port);
}

function getListeningPidsUnix(port) {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, { encoding: 'utf8' }).trim();
    if (!out) return [];

    return [...new Set(out
      .split(/\r?\n/)
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v > 0)
    )];
  } catch {
    return [];
  }
}

function getListeningPids(port) {
  if (process.platform === 'win32') {
    return getListeningPidsWindows(port);
  }
  return getListeningPidsUnix(port);
}

function tryKill(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function killPid(pid) {
  if (pid === process.pid) return false;

  const sentTerm = tryKill(pid, 'SIGTERM');
  if (!sentTerm) return false;

  await sleep(400);

  if (isAlive(pid)) {
    tryKill(pid, 'SIGKILL');
    await sleep(300);
  }

  return !isAlive(pid);
}

async function main() {
  const killed = [];
  const failed = [];

  for (const port of PORTS) {
    const pids = getListeningPids(port);

    if (pids.length === 0) {
      console.log(`[free-ports] Port ${port}: free`);
      continue;
    }

    for (const pid of pids) {
      const ok = await killPid(pid);
      if (ok) {
        killed.push({ port, pid });
      } else {
        failed.push({ port, pid });
      }
    }
  }

  if (killed.length > 0) {
    for (const item of killed) {
      console.log(`[free-ports] Port ${item.port}: killed PID ${item.pid}`);
    }
  }

  if (failed.length > 0) {
    for (const item of failed) {
      console.error(`[free-ports] Port ${item.port}: failed to kill PID ${item.pid}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[free-ports] Done');
}

main().catch((err) => {
  console.error('[free-ports] Unexpected error:', err instanceof Error ? err.message : err);
  process.exit(1);
});

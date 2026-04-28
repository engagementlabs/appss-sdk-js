import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PACKAGES = [
  { name: '@appss/sdk-core', dir: 'packages/core' },
  { name: '@appss/sdk-browser', dir: 'packages/browser' },
  { name: '@appss/sdk-node', dir: 'packages/node' },
];

const CORE_DEPENDENTS = ['packages/browser', 'packages/node'];

function exec(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

function getLastReleaseTag() {
  try {
    return exec('git describe --tags --abbrev=0 --match "v*"');
  } catch {
    return exec('git rev-list --max-parents=0 HEAD');
  }
}

function getChangedFiles(since) {
  return exec(`git diff --name-only ${since}..HEAD`).split('\n').filter(Boolean);
}

function readPkg(dir) {
  const path = resolve(dir, 'package.json');
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writePkg(dir, pkg) {
  const path = resolve(dir, 'package.json');
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
}

function bumpPatch(version) {
  const parts = version.split('.');
  parts[2] = String(Number(parts[2]) + 1);
  return parts.join('.');
}

function detectChangedPackages(changedFiles) {
  const changed = new Set();
  for (const pkg of PACKAGES) {
    const hasChanges = changedFiles.some((f) => f.startsWith(pkg.dir + '/src/'));
    if (hasChanges) changed.add(pkg.dir);
  }
  return changed;
}

function cascadeCore(changed) {
  if (!changed.has('packages/core')) return;
  for (const dep of CORE_DEPENDENTS) {
    changed.add(dep);
  }
}

function bumpVersions(changed) {
  const published = [];

  const corePkg = readPkg('packages/core');
  let newCoreVersion = corePkg.version;

  if (changed.has('packages/core')) {
    newCoreVersion = bumpPatch(corePkg.version);
    corePkg.version = newCoreVersion;
    writePkg('packages/core', corePkg);
    published.push('@appss/sdk-core');
  }

  for (const depDir of CORE_DEPENDENTS) {
    if (!changed.has(depDir)) continue;

    const pkg = readPkg(depDir);
    pkg.version = bumpPatch(pkg.version);

    if (pkg.dependencies?.['@appss/sdk-core']) {
      pkg.dependencies['@appss/sdk-core'] = newCoreVersion;
    }

    writePkg(depDir, pkg);
    published.push(pkg.name);
  }

  return published;
}

const baseRef = getLastReleaseTag();
const changedFiles = getChangedFiles(baseRef);
const changed = detectChangedPackages(changedFiles);
cascadeCore(changed);
const published = bumpVersions(changed);

process.stdout.write(JSON.stringify(published));

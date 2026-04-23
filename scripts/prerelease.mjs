#!/usr/bin/env node
/**
 * Prepare or publish a GitHub prerelease.
 *
 * Examples:
 *   node scripts/prerelease.mjs
 *   node scripts/prerelease.mjs --version 1.2.3-beta.2
 *   node scripts/prerelease.mjs --base minor --preid beta
 *   node scripts/prerelease.mjs --publish
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const args = process.argv.slice(2);

function readArg(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.log(`Usage: node scripts/prerelease.mjs [options]

Options:
  --version <version>   Use an explicit prerelease version, e.g. 1.2.3-beta.2
  --base <type>         Base bump when starting a new prerelease: major, minor, patch
  --preid <id>          Prerelease identifier, default: beta
  --publish             Commit, tag, push, and create/update GitHub prerelease
  --help                Show this help

Default behavior:
  - If current version is 1.2.3-beta.1, next is 1.2.3-beta.2.
  - If current version is 1.2.2, next is 1.2.3-beta.1.
  - Without --publish, only files are updated and npm run prepublish is executed.
`);
}

if (hasFlag("--help")) {
  usage();
  process.exit(0);
}

const explicitVersion = readArg("--version");
const explicitBase = readArg("--base");
const preid = readArg("--preid") || "beta";
const shouldPublish = hasFlag("--publish");

if (explicitBase && !["major", "minor", "patch"].includes(explicitBase)) {
  fail(`Invalid --base "${explicitBase}". Expected major, minor, or patch.`);
}

const files = {
  manifest: path.join(rootDir, "manifest.json"),
  packageJson: path.join(rootDir, "package.json"),
  packageLock: path.join(rootDir, "package-lock.json"),
  readmeEn: path.join(rootDir, "README.md"),
  readmeZh: path.join(rootDir, "README.zh.md"),
};

const manifest = readJson(files.manifest);
const packageJson = readJson(files.packageJson);

if (manifest.version !== packageJson.version) {
  fail(`Version mismatch: manifest.json (${manifest.version}) vs package.json (${packageJson.version})`);
}

const currentVersion = manifest.version;
const nextVersion = explicitVersion || getNextPrereleaseVersion(currentVersion, preid, explicitBase);
validatePrereleaseVersion(nextVersion);

updateVersions(nextVersion);
run("npm", ["run", "prepublish"]);

console.log(`\nPrepared prerelease ${nextVersion}`);

if (shouldPublish) {
  publish(nextVersion);
}

function getNextPrereleaseVersion(version, id, baseType) {
  const parsed = parseVersion(version);

  if (!baseType && parsed.prerelease) {
    const prereleaseMatch = parsed.prerelease.match(new RegExp(`^${escapeRegExp(id)}\\.(\\d+)$`));
    if (prereleaseMatch) {
      return `${parsed.major}.${parsed.minor}.${parsed.patch}-${id}.${Number(prereleaseMatch[1]) + 1}`;
    }
  }

  const next = bumpBase(parsed, baseType || "patch");
  return `${next.major}.${next.minor}.${next.patch}-${id}.1`;
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) {
    fail(`Invalid version "${version}". Expected semver such as 1.2.3 or 1.2.3-beta.1.`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || null,
  };
}

function bumpBase(version, type) {
  switch (type) {
    case "major":
      return { major: version.major + 1, minor: 0, patch: 0 };
    case "minor":
      return { major: version.major, minor: version.minor + 1, patch: 0 };
    case "patch":
    default:
      return { major: version.major, minor: version.minor, patch: version.patch + 1 };
  }
}

function validatePrereleaseVersion(version) {
  const parsed = parseVersion(version);
  if (!parsed.prerelease) {
    fail(`"${version}" is not a prerelease version. Include a suffix such as -beta.1.`);
  }
}

function updateVersions(version) {
  manifest.version = version;
  packageJson.version = version;
  writeJson(files.manifest, manifest);
  writeJson(files.packageJson, packageJson);

  if (fs.existsSync(files.packageLock)) {
    const packageLock = readJson(files.packageLock);
    packageLock.version = version;
    if (packageLock.packages?.[""]) {
      packageLock.packages[""].version = version;
    }
    writeJson(files.packageLock, packageLock);
  }

  updateReadmeBadge(files.readmeEn, version);
  updateReadmeBadge(files.readmeZh, version);
}

function updateReadmeBadge(filePath, version) {
  if (!fs.existsSync(filePath)) return;
  const badgeVersion = version.replace(/-/g, "--");
  const badge = `![Version](https://img.shields.io/badge/version-${badgeVersion}-blue)`;
  const content = fs.readFileSync(filePath, "utf-8");
  const next = content.replace(
    /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-[^)]+-blue\)/,
    badge
  );
  fs.writeFileSync(filePath, next);
}

function publish(version) {
  const branch = commandOutput("git", ["branch", "--show-current"]);
  if (!branch) {
    fail("Could not determine current git branch.");
  }

  run("git", ["add", "-A"]);
  const staged = commandOutput("git", ["diff", "--cached", "--name-only"]);
  if (staged) {
    run("git", ["commit", "-m", `Release ${version}`]);
  } else {
    console.log("No staged changes to commit.");
  }

  run("git", ["tag", version]);
  run("git", ["push", "origin", branch, version]);

  const releaseExists = commandStatus("gh", ["release", "view", version]) === 0;
  if (releaseExists) {
    run("gh", ["release", "edit", version, "--title", `Release ${version}`, "--prerelease", "--draft=false"]);
    run("gh", ["release", "upload", version, "main.js", "manifest.json", "styles.css", "--clobber"]);
  } else {
    run("gh", [
      "release",
      "create",
      version,
      "main.js",
      "manifest.json",
      "styles.css",
      "--title",
      `Release ${version}`,
      "--notes",
      releaseNotes(version),
      "--prerelease",
    ]);
  }
}

function releaseNotes(version) {
  return `Prerelease ${version}

Validation:
- npm run prepublish`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, "\t") + "\n");
}

function commandOutput(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    return "";
  }
  return result.stdout.trim();
}

function commandStatus(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    stdio: "ignore",
  });
  return result.status ?? 1;
}

function run(command, commandArgs) {
  console.log(`\n$ ${[command, ...commandArgs].join(" ")}`);
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Generate concise stable release notes from commits since the previous stable tag.
 */

import { spawnSync } from "child_process";
import fs from "fs";

const version = process.argv[2];
const outputPath = readArg("--output");

if (!version || version === "--help") {
  console.log("Usage: node scripts/generate-release-notes.mjs <version> [--output release-notes.md]");
  process.exit(version ? 0 : 1);
}

validateStableVersion(version);

const previousTag = getPreviousStableTag(version);
const targetRef = refExists(version) ? version : "HEAD";
const range = previousTag ? `${previousTag}..${targetRef}` : targetRef;
const commits = getCommitSubjects(range)
  .filter((subject) => !/^Release \d+\.\d+\.\d+(?:-.+)?$/.test(subject))
  .map(formatReleaseBullet);

const body = [
  "## Changes",
  "",
  ...(commits.length > 0 ? commits : ["- 🔧 Maintenance updates"]),
  "",
  previousTag
    ? `**Full Changelog**: https://github.com/GenoZhou/easy-recall/compare/${previousTag}...${version}`
    : `**Full Changelog**: https://github.com/GenoZhou/easy-recall/releases/tag/${version}`,
  "",
].join("\n");

if (outputPath) {
  fs.writeFileSync(outputPath, body);
} else {
  process.stdout.write(body);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function validateStableVersion(value) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) {
    fail(`"${value}" is not a stable semver version.`);
  }
}

function getPreviousStableTag(targetVersion) {
  const tags = commandOutputStrict("git", ["tag", "--list", "[0-9]*.[0-9]*.[0-9]*", "--sort=-version:refname"])
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter((tag) => tag && /^\d+\.\d+\.\d+$/.test(tag) && tag !== targetVersion);

  return tags.find((tag) => compareVersions(tag, targetVersion) < 0) || null;
}

function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function getCommitSubjects(range) {
  const output = commandOutputStrict("git", ["log", "--format=%s", "--no-merges", range]);
  if (!output) return [];
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).reverse();
}

function refExists(ref) {
  const result = spawnSync("git", ["rev-parse", "--verify", "--quiet", ref], {
    encoding: "utf-8",
  });
  return result.status === 0;
}

function formatReleaseBullet(subject) {
  const cleanSubject = stripConventionalPrefix(subject);
  return `- ${pickEmoji(cleanSubject)} ${cleanSubject}`;
}

function stripConventionalPrefix(subject) {
  return subject
    .replace(/^(feat|fix|docs|test|tests|refactor|chore|build|ci|perf)(\([^)]+\))?!?:\s*/i, "")
    .replace(/\.$/, "");
}

function pickEmoji(subject) {
  const text = subject.toLowerCase();
  if (/(fix|bug|correct|prevent|avoid|fallback|missing|skip|error|fail)/.test(text)) return "🐛";
  if (/(test|coverage|verify|check|guard|harden|safe|release)/.test(text)) return "✅";
  if (/(doc|readme|instruction|guide)/.test(text)) return "📚";
  if (/(style|ui|setting|modal|view|button)/.test(text)) return "🎨";
  if (/(add|enable|support|introduce|new)/.test(text)) return "✨";
  return "🔧";
}

function commandOutputStrict(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    const details = result.stderr?.trim() || result.stdout?.trim() || `${command} exited with status ${result.status}`;
    fail(`Command failed: ${[command, ...args].join(" ")}\n${details}`);
  }
  return result.stdout.trim();
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

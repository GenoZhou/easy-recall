#!/usr/bin/env node
/**
 * Verify a tag-push GitHub release after scripts/prerelease.mjs or scripts/release.mjs.
 */

import { spawnSync } from "child_process";

const version = process.argv[2];
const repo = readArg("--repo") || "GenoZhou/ob-reviews";
const remote = readArg("--remote") || "origin";
const workflow = readArg("--workflow") || "Release";

if (!version || version === "--help") {
  console.log(`Usage: node scripts/verify-release.mjs <version> [--repo owner/name] [--remote origin] [--workflow Release]`);
  process.exit(version ? 0 : 1);
}

const tagSha = commandOutputStrict("git", ["rev-parse", `refs/tags/${version}`]);
const remoteTagOutput = commandOutputStrict("git", ["ls-remote", "--tags", remote, `refs/tags/${version}`]);
const remoteTagSha = remoteTagOutput.split(/\s+/)[0];
if (remoteTagSha !== tagSha) {
  fail(`Remote tag ${version} points to ${remoteTagSha || "(missing)"}, expected ${tagSha}.`);
}

const headSha = commandOutputStrict("git", ["rev-parse", "HEAD"]);
const localStatus = tagSha === headSha ? "tag matches HEAD" : `tag points to ${tagSha}`;

const release = JSON.parse(commandOutputStrict("gh", [
  "release",
  "view",
  version,
  "--repo",
  repo,
  "--json",
  "tagName,isPrerelease,isDraft,url,name",
]));
if (release.tagName !== version) {
  fail(`GitHub release tag is ${release.tagName}, expected ${version}.`);
}
if (release.isDraft) {
  fail(`GitHub release ${version} is still a draft.`);
}

const runs = JSON.parse(commandOutputStrict("gh", [
  "run",
  "list",
  "--repo",
  repo,
  "--workflow",
  workflow,
  "--limit",
  "20",
  "--json",
  "databaseId,headSha,status,conclusion,displayTitle,url,createdAt",
]));
const run = runs.find((candidate) => candidate.headSha === tagSha);
if (!run) {
  fail(`Could not find a ${workflow} workflow run for ${version} at ${tagSha}.`);
}
if (run.status !== "completed" || run.conclusion !== "success") {
  fail(`Release workflow ${run.databaseId} is ${run.status}/${run.conclusion || "pending"}: ${run.url}`);
}

console.log(`Release ${version} verified`);
console.log(`- Local tag: ${tagSha} (${localStatus})`);
console.log(`- Remote tag: ${remoteTagSha}`);
console.log(`- GitHub release: ${release.url}`);
console.log(`- Prerelease: ${release.isPrerelease ? "yes" : "no"}`);
console.log(`- Workflow: ${run.databaseId} success (${run.url})`);

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
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

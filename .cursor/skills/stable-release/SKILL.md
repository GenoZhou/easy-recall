---
name: stable-release
description: >-
  Publish an easy-recall stable release with npm release scripts, verify the
  GitHub release, then update release notes from the previous stable version.
  Use when the user says 发布正式版本, 发正式版, release:stable, or asks to
  publish a non-beta semver tag.
---

# easy-recall 正式发布

用户说「发布正式版本」/「发正式版」/ `release:stable` 时走本流程。

发布成功后必须执行 [release-notes](../release/release-notes.md)。

## 硬约束

- 不要绕过脚本的 git author 检查；期望作者 `Geno <6045730+GenoZhou@users.noreply.github.com>`。
- 不要本地 `gh release create`；release 由 tag push 触发的 `Release` workflow 创建。
- 工作树在生成版本文件前必须干净；先提交功能/修复，再跑发布命令。
- 不要额外向用户确认版本号；运行带 `--publish` 的命令本身即确认。
- 即将 `release:stable` 时不要先重复跑完整 `verify`/`prepublish`（脚本会跑）。
- 稳定版 notes 基于**上一个稳定 tag** 至今的提交，不要只依赖 GitHub `--generate-notes`。

## publish

1. 确认工作树干净。
2. 运行：`npm run release:stable`（或 `node scripts/release.mjs --publish` / `--version <x.y.z>` / `--bump minor|major|patch`）。
3. 从命令输出读取发布版本号 `<version>`。
4. 运行：`npm run verify:release -- <version>`。
5. 按 [release-notes](../release/release-notes.md) 比对上个版本至今的改动并更新 GitHub Release 正文。
6. 向用户回报：版本、release URL、notes 是否已更新。

## 失败处理

- git author / 脏工作树：按脚本报错修复，不要手动绕过。
- `verify:release` 失败：只查当前 tag / release / 本次 workflow run。

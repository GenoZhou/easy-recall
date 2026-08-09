---
name: prerelease
description: >-
  Prepare or publish an easy-recall beta prerelease with npm release scripts,
  verify the GitHub prerelease, then update release notes from the previous
  version. Use when the user says 提交 prerelease, 发布 prerelease, 发个
  prerelease, release:prerelease, or asks to bump/publish a beta tag.
---

# easy-recall 预发布

按用户意图选择模式，不要混用。

| 用户说法 | 模式 |
|---------|------|
| 提交 prerelease / 准备 prerelease | **prepare** |
| 发布 prerelease / 发个 prerelease | **publish** |

发布后（publish）必须执行 [release-notes](../release/release-notes.md)。

## 硬约束

- 版本以本地/远端 tag 与 GitHub release 为准，不只信 `package.json`。
- 不要绕过脚本的 git author 检查；期望作者 `Geno <6045730+GenoZhou@users.noreply.github.com>`。
- 不要本地 `gh release create`；release 由 tag push 触发的 `Release` workflow 创建。
- publish 前工作树必须干净；先提交功能/修复，再跑发布命令。
- 不要额外向用户确认版本号；运行带 `--publish` 的命令本身即确认。
- 即将 `release:prerelease` 时不要先重复跑完整 `verify`/`prepublish`（脚本会跑）。

## prepare

1. 工作树可有待提交改动。
2. 运行：`npm run prerelease`（或 `npm run prerelease -- --version <x.y.z-beta.n>`）。
3. 检查通过后，将生成的版本文件与本次代码改动一并提交（仅当用户要求提交时）。
4. **不**推送 tag，**不**创建 GitHub release。

## publish

1. 确认工作树干净（无关改动已提交）。
2. 运行：`npm run release:prerelease`（或 `npm run prerelease -- --version <ver> --publish`）。
3. 从命令输出读取发布版本号 `<version>`。
4. 运行：`npm run verify:release -- <version>`。
5. 按 [release-notes](../release/release-notes.md) 比对上个版本至今的改动并更新 GitHub Release 正文。
6. 向用户回报：版本、release URL、notes 是否已更新。

## 失败处理

- git author / 脏工作树：按脚本报错修复，不要手动绕过提交/打 tag。
- `verify:release` 失败：只查当前 tag / release / 本次 workflow run，不要刷历史 workflow。

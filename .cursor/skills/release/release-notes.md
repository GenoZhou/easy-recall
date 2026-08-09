# 发布后更新 Release Notes

预发布与正式发布在 `verify:release` 通过后都要执行本流程。不要跳过。

## 上个版本怎么定

| 当前版本 | 比对基线 |
|---------|---------|
| 稳定版 `x.y.z` | 上一个**稳定** tag |
| 预发布 `x.y.z-beta.n` | 上一个 semver tag（通常是同系列上一个 beta，否则上一个稳定版） |

脚本已实现上述规则：`npm run changelog:release -- <version>`。

## 步骤

1. 生成草稿：

```bash
npm run changelog:release -- <version> --output /tmp/easy-recall-release-notes.md
```

2. 人工核对（必做）：
   - `git log --oneline --no-merges <previous>..<version>`（或 `HEAD` 若 tag 本地可见）
   - 对照草稿：漏改、噪音 commit、表述是否对用户可读
   - 需要时直接编辑 `/tmp/easy-recall-release-notes.md`（保留 `## Changes` 与 Full Changelog 链接）

3. 写入 GitHub Release 正文：

```bash
gh release edit <version> --notes-file /tmp/easy-recall-release-notes.md
```

4. 确认：`gh release view <version> --json body,url --jq '{url,body}'`

## 规则

- workflow 创建 release 时也会写入初稿；本步骤是**发布后复核并覆盖更新**，不是可选项。
- 不要用 GitHub 自动 `--generate-notes` 作为最终正文。
- 过滤 `Release x.y.z` / `Release x.y.z-beta.n` 这类发布提交噪音（生成脚本已过滤）。

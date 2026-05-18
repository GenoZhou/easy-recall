# AGENTS.md - easy-recall 仓库工作规范

> 面向智能体与贡献者的仓库级约束。用户可见行为、卡片语法、安装与使用说明以 `README.md` / `README.zh.md` 为准。

## 文档边界

- `README.md` 和 `README.zh.md` 是用户文档的事实来源：
  - 卡片语法
  - Hint / SR 注释格式
  - 评分行为的用户说明
  - 安装、使用、发布文件说明
- `AGENTS.md` 只描述“如何修改代码”，不重复用户文档。
- 如果实现与 README 描述不一致，应优先修实现；只有在产品行为确实改变时才同步更新 README。

## 快速参考

| 项目 | 说明 |
|------|------|
| 技术栈 | TypeScript + Obsidian API + esbuild + Jest |
| 开发 | `npm run dev` |
| 构建 | `npm run build` |
| 测试 | `npm test` |
| 本地验证 | `npm run verify` |
| 发布前检查 | `npm run prepublish` |
| 准备预发布 | `npm run prerelease` |
| 发布预发布 | `npm run release:prerelease` |
| 发布核验 | `npm run verify:release -- <version>` |
| 生成稳定版发布说明 | `npm run changelog:release -- <version>` |

## 工作方式与 token 预算

- 先确认实现模型，再动手改代码。涉及复习队列、行号、发布流程这类状态边界时，先用几句话明确数据来源和状态归属，避免先实现一版再推翻。
- 搜索要窄：
  - 优先限定目录，例如 `src/ui src/commands src/settings`。
  - 只在需要用户文档或测试证据时再扩大到 `README*` / `src/__tests__`。
  - 避免一次 `rg` 把源码、测试、文档和构建产物全部刷出来。
- 读文件要分段：
  - 优先读相关函数附近的片段，不要整文件展开。
  - 大文件先用 `rg -n` 定位，再用 `sed -n` 读局部。
- diff 要分层：
	- 默认先看 `git diff --stat` 或限定文件的关键片段。
	- 只有在检查行为细节、提交前审阅或怀疑误改时再输出完整 diff。
	- 大功能完成后优先看关键文件限定 diff；不要一次展开核心大文件和测试大文件的完整 diff，除非准备提交前审阅风险点。
- 测试输出要克制：
	- 开发中可以只保留失败信息或摘要。
	- 常规实现验证优先用 `npm run verify`。
	- 如果接下来马上运行 `npm run release:prerelease` / `npm run release:stable`，优先依赖发布命令自带的 `prepublish`，不要在同一轮里重复跑同样的完整检查，除非刚修过失败。
- GitHub 发布核验要直达当前版本：
	- 优先运行 `npm run verify:release -- <version>`。
	- 该命令会等待 GitHub release / workflow 的短暂异步创建；不要先手动查大量历史 workflow。
	- 手动核验只在核验脚本失败时使用，并且只查当前 tag / release / workflow run。
	- 不要拉大量历史 workflow，除非当前 run 查不到。
- 命令输出要避开环境噪音：
	- 如果 shell 初始化持续输出与任务无关的错误，优先使用不会触发登录初始化的命令方式。
	- 汇报时只保留和任务相关的失败信息或摘要。
- 使用记忆时只读命中的少量行；不要展开整段历史记录，除非发布中断、状态不明或需要复盘旧失败。

## 架构约束

### 模块职责

| 模块 | 职责 |
|------|------|
| `src/main.ts` | 保持精简，只处理插件生命周期、模块装配和事件注册。 |
| `src/parser.ts` | 负责卡片解析与渲染辅助；`lineStart` / `lineEnd` / `scheduleLine` 的语义必须稳定。 |
| `src/store.ts` | 只负责 SR 注释读写，不承载解析规则。 |
| `src/scheduler.ts` | 只负责调度算法，不混入 UI 或存储逻辑。 |
| `src/deck.ts` | 负责卡组发现、扫描与过滤；枚举文件用公开 Vault API，MetadataCache 只做预过滤。 |
| `src/commands/` | 负责命令注册与调用路径，不堆业务细节到 `main.ts`。 |
| `src/settings/` | 负责设置加载、更新和设置页接入。 |
| `src/ui/` | 负责 Modal / 交互层；文件写入要通过 `Vault.process()` 等安全路径完成。 |
| `src/utils/` | 放日志、错误处理和通用辅助函数，避免散落的重复实现。 |

### 设计原则

1. `main.ts` 最小化：不要把业务逻辑继续堆回入口文件。
2. 单一职责：解析、调度、存储、UI、命令分层清晰。
3. 可测试性优先：新增逻辑尽量写成纯函数或可注入依赖的形式。
4. 向后兼容优先：不要轻易改变已有卡片语法、SR 注释格式、行号语义。

## 修改代码时必须遵守

### Parser / Store 边界

- `parser.ts` 负责“卡片是什么、起止行在哪里、SR 注释归属哪张卡”。
- `store.ts` 负责“在已知行号处替换/插入 SR 注释”。
- 不要把 frontmatter、标题、注释、block 规则的补丁散落到 `store.ts`；这类问题优先在 `parser.ts` 修。

### Obsidian 最佳实践

- 文件筛选先用 `vault.getMarkdownFiles()` 取得 Markdown 文件，再用 `app.metadataCache.getFileCache(file)` 预过滤；不要依赖 `metadataCache.fileCache` 这类内部字段。
- MetadataCache 缺失或单文件 cache 尚未生成时，必须有可解释 fallback，避免全库复习静默扫出 0 张卡。
- 修改文件优先用 `vault.process()`，避免 `read -> modify -> write` 的非原子流程。
- 事件监听使用 `registerEvent()`，让资源在 `onunload` 时自动清理。
- 读取内容优先考虑 `vault.cachedRead()`，不要自建长期内容缓存。

### UI 与交互

- 复习流程相关修改要特别注意：
	- 当前卡片索引推进
	- `Again` 回队尾的行为
	- `lineStart` / `scheduleLine` 更新后的当前队列偏移
	- `scheduleLine` 的 `0` 是合法行号，判断“没有 SR 行”必须用 `scheduleLine === undefined`
	- 单次复习上限下的下一批加载方式
	- 关闭 Modal 时是否会误触发回调
- 如果进入下一批复习，优先重新扫描 / 重新解析剩余到期卡片，而不是在 UI/session 层维护跨批次行号状态。
- 链接、按钮和快捷键要保持基本可访问性，不要只改视觉不改语义。

### 日志与错误处理

- 不要新增裸 `console.log` 作为常规输出。
- 统一复用 `src/utils/logger.ts` / `src/utils/errors.ts` 的能力。
- 用户可感知的失败应给出明确反馈，不要静默失败后继续推进复习流程。

## 测试要求

- 改解析、存储、调度逻辑时，必须补或更新对应单元测试。
- 改复习流程时，优先覆盖这些边界：
  - frontmatter
  - 标题路径
  - 空行分隔 block
  - 多行 Cloze 合并
  - Hint callout
  - SR 注释替换 / 插入
  - 同文件多卡片的当前队列行号偏移
  - 单次复习上限后的继续复习 / 剩余到期卡片加载
- 修改完成后至少运行：
  - `npm test`
  - `npm run build`
- 涉及发布或版本变更时再运行：
  - `npm run prepublish`

## 扩展入口

- 新命令：
  - 在 `src/commands/types.ts` 定义上下文
  - 在 `src/commands/` 新增实现
  - 在 `src/commands/index.ts` 注册
- 新设置：
  - 通过 `src/settings/` 管理默认值、加载与更新
- 新语言：
  - 在 `src/i18n/` 增加翻译文件并在 `src/i18n/index.ts` 注册
- 新 UI：
  - 优先放在 `src/ui/`，不要把交互逻辑塞回 `main.ts`

## 发布与版本

- 版本号需要保持这些位置一致：
  - `manifest.json`
  - `package.json`
  - README 中静态版本徽章
  - 如有需要，`package-lock.json` 顶层版本元数据
- 当前 `npm run version` 脚本只会执行默认 bump；若需要 `minor` / `major`，优先直接调用：
  - `node scripts/version-bump.mjs minor`
  - `node scripts/version-bump.mjs major`
- 预发布版本号以本地和远端 tag 为准，不要只相信当前分支的 `package.json`：
  - `scripts/prerelease.mjs` 会检查本地 tag、远端 tag 和 GitHub release，自动选择下一个可用 `beta` 版本。
  - 显式版本可用：`npm run prerelease -- --version 1.2.3-beta.2`，但脚本仍应阻止重复 tag / release。
- 用户说“提交 prerelease”时：
  - 运行 `npm run prerelease`。
  - 确认发布前检查通过后提交生成的版本文件和本次代码改动。
  - 不推送 tag，也不创建 GitHub release，除非用户同时要求发布。
- 用户说“发布 prerelease”或“发个 prerelease”时：
	- 使用 `npm run release:prerelease` 或 `npm run prerelease -- --version <version> --publish`。
	- 发布前脚本会重新检查 tag / release 是否已存在；不要再额外要求用户输入版本号确认，命令授权本身就是确认门槛。
	- 发布脚本会在提交前确认 repo-local git author 是 `Geno <6045730+GenoZhou@users.noreply.github.com>`；如果脚本失败，不要绕过身份检查手动提交。
	- 发布模式要求工作树在生成版本文件前是干净的；先提交本次功能/修复，再运行发布命令，避免 release commit 混入无关改动。
	- 成功后运行 `npm run verify:release -- <version>`，确认 GitHub prerelease、tag、分支推送和 release workflow 状态。
- 用户说“发布正式版本”时：
	- 使用 `npm run release:stable` 或 `node scripts/release.mjs --publish`。
	- 同样依赖脚本内置的 git author 检查和发布前检查。
	- 稳定版 GitHub Release 正文由 `scripts/generate-release-notes.mjs` 基于上一个稳定 tag 之后的提交生成，不要只依赖 GitHub `--generate-notes`。
	- 成功后运行 `npm run verify:release -- <version>`。
- GitHub Actions 的 `Release` workflow 由 tag push 触发：
  - 本地发布脚本负责版本文件、提交、tag 和 push。
  - GitHub release 由 workflow 创建；不要在本地脚本里重复创建 release。
  - workflow 应保持使用当前 GitHub Actions 支持的 Node/action 版本。

## 不要做的事

- 不要把 README 里的用户说明整段复制回 `AGENTS.md`。
- 不要为了解一个边界 bug，在多个层次同时打补丁。
- 不要引入新的全局缓存或隐藏状态。
- 不要把测试数字、目录说明写死得过细，除非它真是约束而不是快照。

## 参考

- 用户文档：`README.md` / `README.zh.md`
- 发布检查：`scripts/check-dist.mjs`
- 版本脚本：`scripts/version-bump.mjs`
- 预发布脚本：`scripts/prerelease.mjs`

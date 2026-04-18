# AGENTS.md - ob-reviews 仓库工作规范

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
| 发布前检查 | `npm run prepublish` |

## 架构约束

### 模块职责

- `src/main.ts`
  - 保持精简，只处理插件生命周期、模块装配和事件注册。
- `src/parser.ts`
  - 负责卡片解析与渲染辅助；`lineStart` / `lineEnd` / `scheduleLine` 的语义必须稳定。
- `src/store.ts`
  - 只负责 SR 注释读写，不承载解析规则。
- `src/scheduler.ts`
  - 只负责调度算法，不混入 UI 或存储逻辑。
- `src/deck.ts`
  - 负责卡组发现、扫描与过滤，优先依赖 `MetadataCache`。
- `src/commands/`
  - 负责命令注册与调用路径，不堆业务细节到 `main.ts`。
- `src/settings/`
  - 负责设置加载、更新和设置页接入。
- `src/ui/`
  - 负责 Modal / 交互层；文件写入要通过 `Vault.process()` 等安全路径完成。
- `src/utils/`
  - 放日志、错误处理和通用辅助函数，避免散落的重复实现。

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

- 文件筛选优先用 `app.metadataCache.getFileCache()`，避免无差别全量读取。
- 修改文件优先用 `vault.process()`，避免 `read -> modify -> write` 的非原子流程。
- 事件监听使用 `registerEvent()`，让资源在 `onunload` 时自动清理。
- 读取内容优先考虑 `vault.cachedRead()`，不要自建长期内容缓存。

### UI 与交互

- 复习流程相关修改要特别注意：
  - 当前卡片索引推进
  - `Again` 回队尾的行为
  - `lineStart` / `scheduleLine` 更新后的队列偏移
  - 关闭 Modal 时是否会误触发回调
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
  - 同文件多卡片的行号偏移
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

## 不要做的事

- 不要把 README 里的用户说明整段复制回 `AGENTS.md`。
- 不要为了解一个边界 bug，在多个层次同时打补丁。
- 不要引入新的全局缓存或隐藏状态。
- 不要把测试数字、目录说明写死得过细，除非它真是约束而不是快照。

## 参考

- 用户文档：`README.md` / `README.zh.md`
- 发布检查：`scripts/check-dist.mjs`
- 版本脚本：`scripts/version-bump.mjs`

# ob-reviews

> [English](./README.md) | **中文**

极简 Obsidian 间隔重复插件，专注核心记忆功能，去除复杂配置。

![Version](https://img.shields.io/badge/version-1.2.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Obsidian](https://img.shields.io/badge/obsidian-0.15%2B-purple)

## 特性

- **零配置即用** - 安装后即可开始复习，无需复杂设置
- **Markdown 原生语法** - 使用 `==高亮==` 和 `?问答` 创建卡片，支持全角问号 `？`
- **文件级标签** - `#ob-reviews/xxx` 定义卡组，支持中文标签
- **三态评分** - 没记住/有点难/记住了，简化决策负担
- **即时反馈** - "没记住"卡片立即放回队尾，当前 session 继续复习
- **多语言支持** - 自动适配 Obsidian 语言设置（英文/中文）
- **SuggestModal 选卡组** - Quick Switcher 式卡组选择体验
- **复习界面可选** - 默认模态窗口，也可复用 Obsidian 标签页复习
- **移动端支持** - 完美适配手机和平板

## 安装

### 手动安装

1. 下载最新版本的 `main.js`, `manifest.json`, `styles.css`
2. 在你的 Obsidian Vault 中创建 `.obsidian/plugins/ob-reviews/` 目录
3. 将下载的文件复制到该目录
4. 在 Obsidian 设置中启用插件

### 从社区插件市场（未来支持）

等待上架 Obsidian 社区插件市场后可直接安装。

## 使用方法

### 创建卡片

**基本规则：卡片之间必须有空行分隔。** 一个卡片 = 一个连续的非空文本块。

**挖空卡片 (Cloze)**
```markdown
中医学是研究==人体生命运动==的科学。
```

**多行挖空卡片**
同一块内相邻的 Cloze 行会自动合并为一张卡片：
```markdown
应用：
1. 风寒感冒：==发汗解表之要药==
2. 咳嗽气喘：==肺气壅遏所致咳喘的要药==
```

如需分成多张卡片，请用空行分隔：
```markdown
1. 风寒感冒：==发汗解表之要药==

2. 咳嗽气喘：==肺气壅遏所致咳喘的要药==
```

**问答卡片 (QA)**
```markdown
什么是 2+2?
4

或：

圆的面积公式是什么
?
S = πr²
```

**带提示的卡片（可选）**
```markdown
圆的面积公式是什么？
?
S = πr²
> [!hint] 想想半径和面积的关系
> π 约等于 3.14159...
```

> 💡 支持全角问号 `？`，适合中文输入习惯
> 
> 💡 提示使用 Obsidian callout 语法 `> [!hint]`，复习时可选择显示

### 定义卡组

在文件开头添加标签：
```markdown
---
tags:
  - ob-reviews/math
---

卡片内容...
```

或在正文中：
```markdown
#ob-reviews/math

卡片内容...
```

### 开始复习

1. 点击左侧栏的复习图标 📚，或使用命令面板执行"开始复习"
2. 在 SuggestModal 中搜索并选择牌组，或按 Enter 复习全部到期卡片
3. 查看卡片，按 Enter 显示答案
4. 选择评分：
   - **1 - 没记住** (🔴): 立即放回队尾，当前 session 重新复习
   - **2 - 有点难** (🟠): 间隔 ×1.2，ease -15
   - **3 - 记住了** (🔵): 标准间隔，ease 不变

复习默认使用模态窗口。可在插件设置中分别配置「桌面端复习界面」和「手机端复习界面」，为不同平台选择模态窗口或复用一个专用 Obsidian 标签页。

## 快捷键

| 按键 | 功能 |
|------|------|
| Enter | 显示答案 / 记住了 |
| 1 | 没记住 |
| 2 | 有点难 |
| 3 | 记住了 |

## 数据存储

复习数据以 HTML 注释形式存储在卡片**上方**：

```markdown
<!--SR:1,250,2026-02-18T10:00:00Z,1-->
中医学是研究==人体生命运动==的科学。
```

格式：`<!--SR:interval,ease,due,reps-->`

**你的笔记永远属于你**，数据不依赖任何外部服务。

## 算法

基于 SM-2 算法简化版：

- **间隔天数**: 根据评分动态计算，最大 365 天
- **简易度 (ease)**: 130-350 范围，影响间隔增长速度
- **连续成功次数**: 影响新卡片进入正式复习的节奏

## 开发

```bash
# 安装依赖
npm install

# 开发模式（自动重建）
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage
```

仓库规范、模块职责和实现边界见 `AGENTS.md`。

## 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 致谢

- 灵感来源于 Anki 和 Obsidian Spaced Repetition 插件
- 遵循 Obsidian 官方插件开发最佳实践

---

**Made with ❤️ for Obsidian users**

---

[切换到英文版](./README.md)

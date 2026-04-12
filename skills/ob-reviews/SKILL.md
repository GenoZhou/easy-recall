---
name: ob-reviews
description: Create flashcard notes compatible with the ob-reviews Obsidian plugin. Use when the user wants to convert study materials, notes, or articles into ob-reviews flashcard format, create cloze deletion cards, Q&A cards, deck tags, or hints for spaced repetition review in Obsidian.
---

# ob-reviews Flashcard Maker

Create well-structured flashcards for the [ob-reviews](https://github.com/gengxiankun-gene/ob-reviews) Obsidian plugin.

## ⚠️ 优先依赖技能（必须阅读）

在使用本技能前，**必须先阅读并使用以下技能**：

1. **obsidian-cli** — 用于读取、创建、追加或搜索 Obsidian vault 中的笔记
   - 使用 `obsidian create` 创建新笔记
   - 使用 `obsidian read` 读取现有笔记内容
   - 使用 `obsidian append` 向现有笔记追加内容
   - 使用 `obsidian search` 搜索 vault 中的笔记

2. **obsidian-markdown** — 确保笔记使用正确的 Obsidian Flavored Markdown 格式
   - YAML frontmatter 格式（用于 deck tags）
   - Wikilinks 语法 `[[...]]`
   - Callouts 语法 `> [!hint]`
   - 其他 Obsidian 特定语法

**工作流程要求**：
- 如果用户要求写入 Obsidian vault → **必须使用 obsidian-cli**
- 如果用户要求生成 Obsidian 笔记格式 → **必须遵循 obsidian-markdown**

---

## Quick Reference

| Card Type | Syntax |
|-----------|--------|
| Cloze | `==hidden text==` |
| Q&A (inline) | `Question?\nAnswer` |
| Q&A (separate) | `Question\n?\nAnswer` |
| Hint | `> [!hint] content` |
| Deck tag | `#ob-reviews/deck-name` or YAML frontmatter |

---

## Workflow

### 1. 识别内容并读取/创建笔记

询问用户（或从上下文推断）：
- 使用什么 deck 名称？（例如 `math`, `history`, `cs`）
- 输出应该直接写入 Obsidian vault 还是作为代码片段返回？
- 首选什么卡片类型？（cloze 用于定义，Q&A 用于概念问题）
- 来源是手写笔记还是图片？如果是，切换到**精确转录模式**（见下文）

**如果要写入 vault，使用 obsidian-cli**：

```bash
# 创建新笔记
obsidian create name="Biology Flashcards" content="..." silent

# 读取现有笔记
obsidian read file="Biology Flashcards"

# 追加内容到现有笔记
obsidian append file="Biology Flashcards" content="..."

# 搜索已存在的 flashcard 笔记
obsidian search query="ob-reviews"
```

### 2. 选择卡片类型

使用 **cloze** 用于：
- 定义和填空事实
- 带变量的公式
- 句子中的关键术语

使用 **Q&A** 用于：
- 概念解释
- "为什么"和"如何"问题
- 多步骤程序

使用 **hints** 谨慎用于：
- 经常失败的卡片
- 复杂公式或推导
- 有帮助但不泄露答案的上下文

### 3. 生成卡片（遵循 obsidian-markdown）

对于每条信息，创建一张卡片。遵循以下规则：

- **每张卡片一个想法**：避免双问题
- **Cloze 卡片必须适合单行**
- **Q&A 答案最多 1-3 行**
- **始终在文件顶部包含 deck tag**
- **不要添加 `<!--SR:...-->` 注释**：ob-reviews 会自动生成这些

构建笔记内容时，遵循 **obsidian-markdown** 规范：

```markdown
---
tags:
  - ob-reviews/biology
---

# Biology Flashcards

The ==mitochondria== is the ==powerhouse== of the cell.

What is the primary function of ribosomes?
?
Protein synthesis
> [!hint] Think about where amino acids are assembled
```

**关键点**：
- 使用 YAML frontmatter 定义 `tags`（例如 `ob-reviews/biology`）
- 使用标准 Markdown 构建结构
- 使用 `> [!hint]` callouts 添加提示
- 使用 `[[wikilinks]]` 链接 vault 内部相关笔记

### 4. 使用 obsidian-cli 写入 Vault

生成内容后，使用 obsidian-cli 写入：

```bash
# 创建新笔记
obsidian create name="Flashcards" content="---
tags:
  - ob-reviews/math
---

What is 2+2?
?
4
" silent

# 或使用多行内容（将换行符替换为 \n）
obsidian create name="Flashcards" content="# Flashcards\n\n== mitochondria == is the powerhouse." silent
```

### 5. 审查和完善

在交付输出或写入 vault 之前：
- 验证每张卡片都有有效的 deck tag
- 确保 cloze 语法正确使用 `==`
- 检查 Q&A 卡片有清晰的问题和简洁的答案
- 确认 hints 有帮助但不泄露答案
- **验证笔记内容符合 Obsidian Flavored Markdown（obsidian-markdown）**
- **如果使用 obsidian-cli，确认命令成功执行**

---

## 从手写笔记或图片转录

当用户提供手写笔记、照片或截图并要求转换为 flashcards 时（特别是高亮部分作为 cloze 删除），遵循此**分步工作流程**：

### 第 1 步：提取所有文本
首先，完整逐字转录图像中的**所有可见文本**：
- 保留每个原始字符、标点符号和词序
- 不要总结、改写或替换同义词
- 保留原始结构：标题、编号样式（`1、` vs `1.`）、缩进和段落分隔
- 不要"标准化"布局——尽可能保持接近原始样式

### 第 2 步：识别高亮部分
提取所有文本后，识别哪些部分被高亮：
- 寻找荧光笔标记、下划线、粗体文本或任何视觉强调
- 注意每个高亮区域的确切边界
- 只有实际被高亮覆盖的文本才应成为 cloze 删除

### 第 3 步：创建 Flashcards
对高亮部分应用 cloze 语法：
- 用 `==…==` 包裹高亮文本以创建 cloze 删除
- 保留 clozes 周围的上下文，使每张卡片独立有意义
- 不要扩展或缩小高亮区域——边界必须精确

### 第 4 步：验证完整性
与源文件交叉检查以确保**没有遗漏任何内容**：
- 将每行与原始图像对比
- 确保没有项目、clozes 或字符缺失
- 验证所有高亮部分都已转换为 clozes

### 第 5 步：使用 obsidian-cli 写入
使用 obsidian-cli 将生成的 flashcards 写入 Obsidian vault：

```bash
obsidian create name="Transcribed Flashcards" content="..." silent
```

---

## 完整示例

### 示例 1：创建新 Flashcard 笔记

```markdown
---
tags:
  - ob-reviews/biology
---

# Biology Flashcards

The ==mitochondria== is the ==powerhouse== of the cell.

What is the primary function of ribosomes?
?
Protein synthesis
> [!hint] Think about where amino acids are assembled

DNA replication occurs in the ==nucleus== of eukaryotic cells.

What is the difference between mitosis and meiosis?
Mitosis produces two identical diploid cells; meiosis produces four genetically unique haploid cells.
```

使用 obsidian-cli 创建：
```bash
obsidian create name="Biology Flashcards" content="---
tags:
  - ob-reviews/biology
---

# Biology Flashcards

The ==mitochondria== is the ==powerhouse== of the cell.

What is the primary function of ribosomes?
?
Protein synthesis
> [!hint] Think about where amino acids are assembled

DNA replication occurs in the ==nucleus== of eukaryotic cells.

What is the difference between mitosis and meiosis?
Mitosis produces two identical diploid cells; meiosis produces four genetically unique haploid cells." silent
```

### 示例 2：追加到现有笔记

```bash
# 先读取现有内容
obsidian read file="Biology Flashcards"

# 追加新卡片
obsidian append file="Biology Flashcards" content="\n\nATP is produced in the ==mitochondria== through cellular respiration."
```

---

## Reference

- **ob-reviews 语法详情**: [references/syntax-guide.md](references/syntax-guide.md)
- **起始模板**: [assets/flashcard-template.md](assets/flashcard-template.md)
- **obsidian-cli 技能**: 查看 obsidian-cli 以获取完整的 CLI 命令参考
- **obsidian-markdown 技能**: 查看 obsidian-markdown 以获取 Obsidian Flavored Markdown 完整指南

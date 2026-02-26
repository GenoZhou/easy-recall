# FSRS 算法迁移方案

## 现状
当前使用简化版 SM-2 算法，数据结构：
```typescript
interface Schedule {
  interval: number;  // 间隔天数
  ease: number;      // 简易度 130-350
  due: Date;         // 到期时间
  reps: number;      // 连续成功次数
}
```

## FSRS 核心参数
```typescript
interface Schedule {
  // 原有字段（保持兼容）
  interval: number;
  due: Date;
  
  // FSRS 新增字段
  difficulty: number;    // 难度 1-10，默认 5
  stability: number;     // 稳定性（天），默认 0
  retrievability: number; // 可提取性 0-1，计算得出
  
  // 可选：学习状态追踪
  reps: number;          // 总复习次数
  lapses: number;        // 失败次数
  lastReview: Date;      // 上次复习时间
}
```

## 最小实现改动量估算

### 文件改动清单

| 文件 | 改动类型 | 代码行数 | 说明 |
|------|---------|---------|------|
| `src/types.ts` | 扩展接口 | +5 行 | 添加 FSRS 字段 |
| `src/scheduler.ts` | 重写 | ~80 行 | 替换 SM-2 为 FSRS 公式 |
| `src/store.ts` | 兼容处理 | +10 行 | 新旧格式转换 |
| `src/ui/review-modal.ts` | 显示优化 | +5 行 | 显示难度/稳定性 |

**总计：约 100 行代码改动**

### FSRS 核心公式（简化版）

```typescript
// 1. 计算可提取性（遗忘概率）
function calcRetrievability(stability: number, daysSinceReview: number): number {
  return Math.exp(-daysSinceReview / stability);
}

// 2. 更新稳定性（根据评分 1-4）
function updateStability(
  stability: number, 
  difficulty: number, 
  rating: number, 
  retrievability: number
): number {
  // FSRS-4.5 简化公式
  const w = [0.4, 0.6, 2.0, 0.2]; // 可调校参数
  
  if (rating === 1) {
    // 失败：稳定性下降
    return stability * Math.exp(w[3] * (1 - difficulty));
  } else {
    // 成功：稳定性上升
    const hardPenalty = rating === 2 ? w[1] : 1.0;
    const easyBonus = rating === 4 ? w[2] : 1.0;
    return stability * (1 + Math.exp(w[0]) * (9 - difficulty) * hardPenalty * easyBonus);
  }
}

// 3. 更新难度
function updateDifficulty(difficulty: number, rating: number): number {
  const delta = [-2, -1, 0, 1][rating - 1]; // 1=again, 2=hard, 3=good, 4=easy
  return Math.max(1, Math.min(10, difficulty + delta * 0.2));
}

// 4. 计算下次间隔
function calcInterval(stability: number): number {
  return Math.round(stability);
}
```

### 三键评分（兼容现有 UI）

现有两键（没记住/记住了）可映射为：
- 没记住 → Rating 1 (Again)
- 记住了 → Rating 3 (Good)

或扩展为三键：
- 没记住 (Again) - 重置进度
- 有点难 (Hard) - 较小间隔增长
- 记住了 (Good) - 正常间隔增长
- 太简单 (Easy) - 较大间隔增长（可选）

### 数据迁移策略

**方案 A：向后兼容（推荐）**
```typescript
function migrateSchedule(old: any): Schedule {
  if (old.difficulty !== undefined) {
    return old as Schedule; // 已是新格式
  }
  // 从 SM-2 迁移
  return {
    interval: old.interval,
    due: old.due,
    difficulty: 5, // 默认中等难度
    stability: old.interval, // 近似转换
    reps: old.reps || 0,
    lapses: 0,
    lastReview: new Date(),
  };
}
```

**方案 B：重置学习（简单）**
- 检测到旧格式时，视为新卡片开始学习
- 实现简单，但会丢失历史进度

### 实施步骤

1. **Phase 1**：扩展数据结构（1 小时）
   - 修改 `types.ts`
   - 修改 `store.ts` 迁移逻辑

2. **Phase 2**：实现 FSRS 算法（2-3 小时）
   - 重写 `scheduler.ts`
   - 单元测试核心公式

3. **Phase 3**：UI 适配（1 小时）
   - 显示难度指示器
   - 可选：扩展为三键评分

4. **Phase 4**：数据迁移（30 分钟）
   - 实现迁移函数
   - 测试旧卡片兼容性

### 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 参数调优复杂 | 中 | 复习体验差 | 提供默认参数，允许高级用户调整 |
| 数据迁移出错 | 低 | 丢失进度 | 备份旧数据，可回滚 |
| 算法不适应 | 低 | 记忆效果差 | 保留 SM-2 作为选项 |

### 结论

**可行性：✅ 高**

- 代码改动量适中（约 100 行）
- 算法成熟，有大量开源参考
- 可向后兼容，平滑迁移
- 最小实现可在 **1 天内完成**

**建议**：
1. 先实现最小可用版本（两键评分）
2. 观察 1-2 周效果
3. 再决定是否扩展为三键评分和高级参数调整

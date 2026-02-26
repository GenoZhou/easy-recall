# FSRS 算法集成设计方案

## 分支信息
- **分支**: `feature/fsrs-algorithm`
- **目标**: 基于现有 SM-2 代码，集成 FSRS-4.5 算法
- **原则**: 向后兼容、平滑迁移、用户可选

---

## 1. 核心设计

### 1.1 算法选择
- **实现版本**: FSRS-4.5 简化版
- **评分系统**: 4 键评分 (1=Again, 2=Hard, 3=Good, 4=Easy)
- **默认启用**: FSRS（新用户）
- **向后兼容**: SM-2 卡片自动迁移

### 1.2 数据结构变更

```typescript
// src/types.ts
export interface Schedule {
  // 通用字段
  interval: number;      // 间隔天数
  due: Date;             // 到期时间
  reps: number;          // 总复习次数
  
  // SM-2 字段（保持兼容）
  ease?: number;         // 简易度 130-350
  
  // FSRS 字段（新增）
  difficulty?: number;   // 难度 1-10，默认 5
  stability?: number;    // 稳定性（天）
  lapses?: number;       // 失败次数
  lastReview?: Date;     // 上次复习时间
  
  // 算法标识
  algorithm?: 'sm2' | 'fsrs';  // 默认 'fsrs'
}

// 评分类型更新为 4 键
export type Rating = 1 | 2 | 3 | 4;
```

### 1.3 文件结构重构

```
src/
├── scheduler/
│   ├── index.ts          # 统一调度接口
│   ├── types.ts          # 调度相关类型
│   ├── fsrs.ts           # FSRS 算法实现
│   ├── sm2.ts            # SM-2 算法实现（保留）
│   └── migrate.ts        # 数据迁移工具
```

---

## 2. FSRS 算法实现

### 2.1 核心参数
```typescript
// FSRS-4.5 默认参数（基于开源实现优化）
const FSRS_PARAMS = {
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  requestRetention: 0.9,  // 目标保持率 90%
  maximumInterval: 365,   // 最大间隔（天）
};
```

### 2.2 核心函数
```typescript
// 计算可提取性（遗忘概率）
function calcRetrievability(stability: number, elapsedDays: number): number;

// 初始化新卡片
function initCard(): Schedule;

// 首次复习（状态转换: New -> Learning/Review）
function initStability(rating: Rating): number;
function initDifficulty(rating: Rating): number;

// 更新参数
function updateStability(schedule: Schedule, rating: Rating): number;
function updateDifficulty(schedule: Schedule, rating: Rating): number;

// 计算下次间隔
function calcInterval(stability: number): number;

// 主调度函数
function calcSchedule(current: Schedule | null, rating: Rating): Schedule;
```

### 2.3 学习状态管理
```typescript
type CardState = 'new' | 'learning' | 'review' | 'relearning';

interface Schedule {
  // ... 其他字段
  state?: CardState;
}
```

---

## 3. 评分系统升级

### 3.1 UI 适配
- **桌面端**: 4 个按钮（Again/Hard/Good/Easy）
- **快捷键**: 1/2/3/4 对应四个评分
- **颜色编码**:
  - Again: 红色 (#ef5350)
  - Hard: 橙色 (#fb8c00)
  - Good: 蓝色 (#1e88e5)
  - Easy: 绿色 (#43a047)

### 3.2 按钮标签
```typescript
// src/i18n/en.ts
rating: {
  again: 'Again',
  hard: 'Hard', 
  good: 'Good',
  easy: 'Easy',
  againShort: 'A',
  hardShort: 'H',
  goodShort: 'G',
  easyShort: 'E',
}

// src/i18n/zh.ts
rating: {
  again: '没记住',
  hard: '有点难',
  good: '记住了',
  easy: '太简单',
  againShort: '忘',
  hardShort: '难',
  goodShort: '对',
  easyShort: '易',
}
```

---

## 4. 数据迁移策略

### 4.1 自动迁移
```typescript
// src/scheduler/migrate.ts
function migrateSchedule(old: Schedule): Schedule {
  // 已迁移或已是 FSRS
  if (old.algorithm === 'fsrs' || old.difficulty !== undefined) {
    return old;
  }
  
  // SM-2 -> FSRS 迁移
  return {
    interval: old.interval,
    due: old.due,
    reps: old.reps,
    ease: old.ease,
    // FSRS 新字段
    difficulty: 5,  // 默认中等难度
    stability: old.interval > 0 ? old.interval : 0.5,
    lapses: 0,
    lastReview: new Date(),
    algorithm: 'fsrs',
    state: old.reps > 0 ? 'review' : 'new',
  };
}
```

### 4.2 版本兼容
- 旧数据格式自动检测并迁移
- 迁移后添加 `algorithm: 'fsrs'` 标记
- 保留 `ease` 字段用于回退 SM-2

---

## 5. 设置项

### 5.1 新增设置
```typescript
interface OBReviewsSettings {
  // ... 现有设置
  
  // 算法选择
  algorithm: 'sm2' | 'fsrs';
  
  // FSRS 参数（高级设置，可选）
  fsrsParams?: {
    requestRetention: number;  // 0.8-0.95
    maximumInterval: number;   // 180-730
    weights?: number[];        // 17 个权重参数
  };
}
```

### 5.2 设置界面
- 基础设置：算法选择下拉框
- 高级设置：FSRS 参数调整（折叠面板）

---

## 6. 实施计划

### Phase 1: 基础架构 (2h)
- [ ] 创建 `src/scheduler/` 目录结构
- [ ] 重构 `types.ts` 更新 Schedule 接口
- [ ] 实现 `scheduler/types.ts`
- [ ] 实现 `scheduler/sm2.ts`（从现有代码迁移）

### Phase 2: FSRS 算法 (3h)
- [ ] 实现 `scheduler/fsrs.ts` 核心算法
- [ ] 实现 `scheduler/migrate.ts` 数据迁移
- [ ] 实现 `scheduler/index.ts` 统一接口
- [ ] 编写 FSRS 单元测试（45+ 测试）

### Phase 3: UI 适配 (2h)
- [ ] 更新 `i18n/en.ts` 和 `i18n/zh.ts` 添加 4 键翻译
- [ ] 更新 `review-modal.ts` 支持 4 按钮布局
- [ ] 更新 `config/constants.ts` 添加第 4 个按钮配置
- [ ] 测试移动端适配

### Phase 4: 设置集成 (1h)
- [ ] 更新 `settings/index.ts` 添加算法选择
- [ ] 更新 `settings/tab.ts` 添加设置界面
- [ ] 更新 `settings.test.ts` 添加测试

### Phase 5: 数据迁移 (1h)
- [ ] 在 `store.ts` 中集成迁移逻辑
- [ ] 测试旧卡片迁移
- [ ] 测试混合数据（新旧卡片共存）

### Phase 6: 文档更新 (30min)
- [ ] 更新 README.md 说明 FSRS 特性
- [ ] 更新 AGENTS.md 开发文档
- [ ] 添加 MIGRATION.md 用户迁移指南

**总计预计: 约 10 小时**

---

## 7. 测试策略

### 7.1 单元测试
```typescript
// scheduler/fsrs.test.ts
describe('FSRS Algorithm', () => {
  describe('initCard', () => { ... });
  describe('calcRetrievability', () => { ... });
  describe('updateStability', () => { ... });
  describe('updateDifficulty', () => { ... });
  describe('calcSchedule', () => { ... });
  describe('migrate from SM-2', () => { ... });
});
```

### 7.2 集成测试
- 新旧算法切换
- 数据迁移端到端
- 多卡片调度一致性

---

## 8. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 算法参数调优困难 | 中 | 复习效果差 | 使用社区验证参数，允许高级用户调整 |
| 4键评分增加决策负担 | 低 | 用户体验下降 | 保留快捷键，默认显示简短标签 |
| 数据迁移出错 | 低 | 进度丢失 | 备份原数据，可回退 SM-2 |
| 性能下降 | 低 | 卡顿 | 算法计算量小，预计算调度 |

---

## 9. 后续优化（可选）

1. **自定义参数**: 允许用户调整 FSRS 权重
2. **算法对比**: 显示 SM-2 vs FSRS 预测对比
3. **统计面板**: 难度分布、稳定性趋势
4. **间隔优化**: 基于用户反馈自动微调参数

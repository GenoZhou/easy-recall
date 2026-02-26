/**
 * 评分等级 (FSRS 4键)
 * 1 = Again (没记住) - 重置进度，短间隔
 * 2 = Hard (有点难)  - 间隔增长较慢
 * 3 = Good (记住了)  - 标准间隔
 * 4 = Easy (太简单)  - 间隔增长更快
 */
export type Rating = 1 | 2 | 3 | 4;

/**
 * 卡片学习状态
 */
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

/**
 * 算法类型
 */
export type Algorithm = 'sm2' | 'fsrs';

/**
 * 卡片调度信息 (兼容 SM-2 和 FSRS)
 */
export interface Schedule {
	// 通用字段
	interval: number;      // 单位：天（0.01 表示约 15 分钟）
	due: Date;             // 到期时间
	reps: number;          // 总复习次数
	
	// SM-2 字段（向后兼容）
	ease?: number;         // 简易度 130-350
	
	// FSRS 字段（新增）
	difficulty?: number;   // 难度 1-10，默认 5
	stability?: number;    // 稳定性（天）
	lapses?: number;       // 失败次数
	lastReview?: Date;     // 上次复习时间
	state?: CardState;     // 学习状态
	
	// 算法标识
	algorithm?: Algorithm; // 默认 'fsrs'
}

/**
 * 卡片类型
 */
export type CardType = 'cloze' | 'qa';

/**
 * 卡片数据结构
 */
export interface Card {
	id: string;           // 文件路径 + 行号哈希
	type: CardType;
	content: string;      // 原始文本（含挖空标记）
	question?: string;    // QA 模式问题
	answer?: string;      // QA 模式答案或挖空答案
	hint?: string;        // 原始 callout 文本（包括 > [!hint] 前缀）
	tags: string[];
	schedule?: Schedule;
	filePath: string;
	lineStart: number;    // 起始行号（0-based）
	lineEnd: number;      // 结束行号（0-based，包含）
	scheduleLine?: number; // SR 注释所在行号（0-based），如果没有则为 undefined
}

/**
 * 牌组数据结构
 */
export interface Deck {
	tag: string;
	cards: Card[];
}

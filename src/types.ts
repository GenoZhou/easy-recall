/**
 * 评分等级 (简化版)
 * 1 = 没记住 - 立即放回队尾重新复习
 * 2 = 有点难 - 间隔增长较慢
 * 3 = 记住了 - 标准间隔
 */
export type Rating = 1 | 2 | 3;

export interface ReviewHistory {
	total: number;
	again: number;
	hard: number;
	good: number;
	recent: Rating[];
	lastReviewed?: Date;
}

/**
 * 卡片调度信息
 */
export interface Schedule {
	interval: number;  // 单位：天（0.01 表示约 15 分钟）
	ease: number;      // 初始 250，范围 130-350
	due: Date;         // 到期时间
	reps: number;      // 连续记住次数
	history?: ReviewHistory; // 压缩评分历史，用于易错题识别
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
	headingPath?: string[]; // 卡片所在位置的标题路径（不含文件名）
}

/**
 * 牌组数据结构
 */
export interface Deck {
	tag: string;
	cards: Card[];
}

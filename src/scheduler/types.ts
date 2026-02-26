/**
 * 调度模块类型定义
 */

import { Schedule, Rating } from '../types';

/**
 * FSRS 参数配置
 */
export interface FSRSParams {
	/** 目标保持率 (0.8-0.95) */
	requestRetention: number;
	/** 最大间隔天数 */
	maximumInterval: number;
	/** 17 个权重参数 */
	w: number[];
}

/**
 * SM-2 参数配置
 */
export interface SM2Params {
	/** 初始简易度 */
	initialEase: number;
	/** 最小简易度 */
	minEase: number;
	/** 最大简易度 */
	maxEase: number;
	/** 最大间隔天数 */
	maxInterval: number;
}

/**
 * 调度计算结果
 */
export interface ScheduleResult {
	schedule: Schedule;
	/** 下次间隔（天） */
	nextInterval: number;
	/** 可提取性（遗忘概率）- FSRS 专用 */
	retrievability?: number;
}

/**
 * 调度器接口
 */
export interface Scheduler {
	/** 创建初始调度 */
	createInitialSchedule(): Schedule;
	/** 计算下次调度 */
	calcSchedule(current: Schedule | null, rating: Rating): Schedule;
	/** 获取下次复习时间描述 */
	getNextReviewText(schedule: Schedule | null | undefined, rating: Rating): string;
	/** 获取短格式下次复习时间 */
	getNextReviewShortText(schedule: Schedule | null | undefined, rating: Rating): string;
	/** 检查是否到期 */
	isDue(schedule: Schedule | undefined): boolean;
}

/**
 * 默认 FSRS 参数 (FSRS-4.5)
 * 基于开源实现和社区优化
 */
export const DEFAULT_FSRS_PARAMS: FSRSParams = {
	requestRetention: 0.9,
	maximumInterval: 365,
	w: [
		0.4,    // w0: 初始稳定性 (Again)
		0.6,    // w1: 初始稳定性 (Hard)
		2.4,    // w2: 初始稳定性 (Good)
		5.8,    // w3: 初始稳定性 (Easy)
		4.93,   // w4: 难度因子
		0.94,   // w5: 难度因子
		0.86,   // w6: 难度因子
		0.01,   // w7: 难度因子
		1.49,   // w8: 稳定性因子
		0.14,   // w9: 稳定性因子
		0.94,   // w10: 稳定性因子
		2.18,   // w11: 稳定性因子
		0.05,   // w12: 稳定性因子
		0.34,   // w13: 稳定性因子
		1.26,   // w14: 稳定性因子
		0.29,   // w15: 稳定性因子
		2.61,   // w16: 稳定性因子
	],
};

/**
 * 默认 SM-2 参数
 */
export const DEFAULT_SM2_PARAMS: SM2Params = {
	initialEase: 250,
	minEase: 130,
	maxEase: 350,
	maxInterval: 365,
};

/**
 * 新卡片首次复习间隔（天）- SM2
 */
export const SM2_NEW_CARD_INTERVALS: Record<Rating, number> = {
	1: 0,      // Again: 立即重新复习
	2: 0.25,   // Hard: 6 小时后
	3: 1,      // Good: 1 天后
	4: 3,      // Easy: 3 天后（新增）
};

/**
 * 评分对 ease 的影响 - SM2
 */
export const SM2_EASE_DELTAS: Record<Rating, number> = {
	1: -20,    // Again: ease 降低
	2: -15,    // Hard: ease 略降
	3: 0,      // Good: ease 不变
	4: 10,     // Easy: ease 增加（新增）
};

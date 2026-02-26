/**
 * 调度模块统一接口
 * 
 * 提供算法无关的调度功能
 * 自动检测算法类型并调用相应实现
 */

import { Schedule, Rating, Algorithm } from '../types';
import { Scheduler, FSRSParams, SM2Params } from './types';
import { createFSRSScheduler, fsrsScheduler, DEFAULT_FSRS_PARAMS } from './fsrs';
import { createSM2Scheduler, sm2Scheduler, DEFAULT_SM2_PARAMS } from './sm2';
import { detectAlgorithm, migrateSchedule, needsMigration } from './migrate';

export * from './types';
export * from './migrate';
export { createFSRSScheduler, createSM2Scheduler, DEFAULT_FSRS_PARAMS, DEFAULT_SM2_PARAMS };

/**
 * 全局算法设置
 */
let globalAlgorithm: Algorithm = 'fsrs';
let globalFSRSParams: FSRSParams = DEFAULT_FSRS_PARAMS;
let globalSM2Params: SM2Params = DEFAULT_SM2_PARAMS;

/**
 * 设置全局算法
 */
export function setAlgorithm(algorithm: Algorithm): void {
	globalAlgorithm = algorithm;
}

/**
 * 获取当前算法
 */
export function getAlgorithm(): Algorithm {
	return globalAlgorithm;
}

/**
 * 设置 FSRS 参数
 */
export function setFSRSParams(params: Partial<FSRSParams>): void {
	globalFSRSParams = { ...DEFAULT_FSRS_PARAMS, ...params };
}

/**
 * 设置 SM-2 参数
 */
export function setSM2Params(params: Partial<SM2Params>): void {
	globalSM2Params = { ...DEFAULT_SM2_PARAMS, ...params };
}

/**
 * 获取调度器实例
 */
export function getScheduler(algorithm?: Algorithm): Scheduler {
	const algo = algorithm ?? globalAlgorithm;
	
	if (algo === 'sm2') {
		return createSM2Scheduler(globalSM2Params);
	}
	
	return createFSRSScheduler(globalFSRSParams);
}

/**
 * 创建初始调度
 * 使用全局算法设置
 */
export function createInitialSchedule(algorithm?: Algorithm): Schedule {
	return getScheduler(algorithm).createInitialSchedule();
}

/**
 * 计算下次调度
 * 
 * 自动检测输入数据的算法类型并进行必要的迁移
 * 优先使用数据中指定的算法，除非显式覆盖
 */
export function calcSchedule(
	current: Schedule | null, 
	rating: Rating, 
	forceAlgorithm?: Algorithm
): Schedule {
	// 迁移旧数据
	const migrated = migrateSchedule(current);
	
	// 确定使用哪种算法
	const algo = forceAlgorithm ?? 
		(migrated?.algorithm) ?? 
		globalAlgorithm;
	
	// 使用对应算法计算
	const scheduler = getScheduler(algo);
	const newSchedule = scheduler.calcSchedule(migrated, rating);
	
	// 确保标记算法
	return { ...newSchedule, algorithm: algo };
}

/**
 * 获取下次复习时间描述
 */
export function getNextReviewText(
	schedule: Schedule | null | undefined, 
	rating: Rating
): string {
	const migrated = migrateSchedule(schedule);
	const algo = migrated?.algorithm ?? globalAlgorithm;
	return getScheduler(algo).getNextReviewText(migrated, rating);
}

/**
 * 获取短格式下次复习时间
 */
export function getNextReviewShortText(
	schedule: Schedule | null | undefined, 
	rating: Rating
): string {
	const migrated = migrateSchedule(schedule);
	const algo = migrated?.algorithm ?? globalAlgorithm;
	return getScheduler(algo).getNextReviewShortText(migrated, rating);
}

/**
 * 检查卡片是否到期
 */
export function isDue(schedule: Schedule | undefined): boolean {
	if (!schedule) return true;
	
	const migrated = migrateSchedule(schedule);
	const algo = migrated?.algorithm ?? globalAlgorithm;
	return getScheduler(algo).isDue(migrated ?? undefined);
}

/**
 * 格式化日期为易读格式
 */
export function formatDueDate(date: Date, precise: boolean = false): string {
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffMinutes = Math.ceil(diffMs / (1000 * 60));
	const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	if (precise) {
		if (diffMinutes <= 0) return 'now';
		if (diffMinutes < 60) return `${diffMinutes} min`;
		if (diffHours < 24) return `${diffHours} hr`;
	}

	if (diffDays <= 0) return 'today';
	if (diffDays === 1) return 'tomorrow';
	if (diffDays < 7) return `${diffDays} days`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo`;
	return `${Math.floor(diffDays / 365)} yr`;
}

/**
 * 获取卡片统计信息
 */
export function getCardStats(schedule: Schedule | null | undefined): {
	algorithm: Algorithm;
	interval: number;
	reps: number;
	difficulty?: number;
	stability?: number;
	retrievability?: number;
	ease?: number;
} {
	if (!schedule) {
		return {
			algorithm: globalAlgorithm,
			interval: 0,
			reps: 0,
		};
	}
	
	const migrated = migrateSchedule(schedule);
	const algo = migrated?.algorithm ?? 'fsrs';
	
	if (algo === 'fsrs' && migrated) {
		// 计算当前可提取性
		let retrievability: number | undefined;
		if (migrated.stability && migrated.lastReview) {
			const elapsedDays = (Date.now() - migrated.lastReview.getTime()) / (1000 * 60 * 60 * 24);
			retrievability = Math.exp(-elapsedDays / migrated.stability);
		}
		
		return {
			algorithm: algo,
			interval: migrated.interval,
			reps: migrated.reps,
			difficulty: migrated.difficulty,
			stability: migrated.stability,
			retrievability,
		};
	}
	
	return {
		algorithm: algo,
		interval: migrated?.interval ?? 0,
		reps: migrated?.reps ?? 0,
		ease: migrated?.ease,
	};
}

/**
 * 导出 SM-2 兼容函数（用于向后兼容）
 */
export const sm2 = {
	createInitialSchedule: () => sm2Scheduler.createInitialSchedule(),
	calcSchedule: (current: Schedule | null, rating: Rating) => 
		sm2Scheduler.calcSchedule(current, rating),
	getNextReviewText: (schedule: Schedule | null | undefined, rating: Rating) =>
		sm2Scheduler.getNextReviewText(schedule, rating),
	isDue: (schedule: Schedule | undefined) =>
		sm2Scheduler.isDue(schedule),
};

/**
 * 导出 FSRS 函数
 */
export const fsrs = {
	createInitialSchedule: () => fsrsScheduler.createInitialSchedule(),
	calcSchedule: (current: Schedule | null, rating: Rating) =>
		fsrsScheduler.calcSchedule(current, rating),
	getNextReviewText: (schedule: Schedule | null | undefined, rating: Rating) =>
		fsrsScheduler.getNextReviewText(schedule, rating),
	isDue: (schedule: Schedule | undefined) =>
		fsrsScheduler.isDue(schedule),
	getCurrentRetrievability: (schedule: Schedule) =>
		(fsrsScheduler as unknown as { getCurrentRetrievability: (s: Schedule) => number })
			.getCurrentRetrievability(schedule),
};

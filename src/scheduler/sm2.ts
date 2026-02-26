/**
 * SM-2 算法实现
 * 
 * 基于 SuperMemo SM-2 算法简化版
 * 支持 4 键评分（兼容原 3 键）
 */

import { Schedule, Rating } from '../types';
import { SM2Params, SM2_NEW_CARD_INTERVALS, SM2_EASE_DELTAS, DEFAULT_SM2_PARAMS } from './types';

export { DEFAULT_SM2_PARAMS };

/**
 * 创建 SM-2 调度器
 */
export function createSM2Scheduler(params: SM2Params = DEFAULT_SM2_PARAMS) {
	const { initialEase, minEase, maxEase, maxInterval } = params;

	/**
	 * 创建初始调度（新卡片）
	 */
	function createInitialSchedule(): Schedule {
		const now = new Date();
		return {
			interval: 0,
			ease: initialEase,
			due: now,
			reps: 0,
			algorithm: 'sm2',
		};
	}

	/**
	 * 计算新卡片的调度
	 */
	function calcNewCardSchedule(rating: Rating, ease: number = initialEase): Schedule {
		const now = new Date();
		const intervalDays = SM2_NEW_CARD_INTERVALS[rating];
		const newEase = Math.max(minEase, Math.min(maxEase, ease + SM2_EASE_DELTAS[rating]));
		
		const due = new Date(now);
		if (intervalDays < 1) {
			due.setMinutes(due.getMinutes() + Math.round(intervalDays * 24 * 60));
		} else {
			due.setDate(due.getDate() + Math.round(intervalDays));
		}
		
		return {
			interval: intervalDays,
			ease: newEase,
			due,
			reps: rating === 1 ? 0 : 1,
			algorithm: 'sm2',
		};
	}

	/**
	 * 计算已有卡片的调度
	 */
	function calcExistingCardSchedule(current: Schedule, rating: Rating): Schedule {
		const now = new Date();
		const easeDelta = SM2_EASE_DELTAS[rating];
		const newEase = Math.max(minEase, Math.min(maxEase, (current.ease ?? initialEase) + easeDelta));
		
		let newInterval: number;
		if (rating === 1) {
			// Again: 立即重新复习
			newInterval = 0;
		} else if (current.reps === 0) {
			// 第一次复习后记住
			newInterval = SM2_NEW_CARD_INTERVALS[rating];
		} else if (rating === 2) {
			// Hard: 间隔增长较慢
			newInterval = current.interval * 1.2;
		} else if (rating === 4) {
			// Easy: 间隔增长更快
			newInterval = current.interval * ((current.ease ?? initialEase) / 100) * 1.3;
		} else {
			// Good: 使用 ease 计算
			newInterval = current.interval * ((current.ease ?? initialEase) / 100);
		}
		
		// 限制最大间隔
		newInterval = Math.min(newInterval, maxInterval);
		
		const due = new Date(now);
		if (newInterval < 1) {
			due.setMinutes(due.getMinutes() + Math.round(newInterval * 24 * 60));
		} else {
			due.setDate(due.getDate() + Math.round(newInterval));
		}
		
		return {
			interval: newInterval,
			ease: newEase,
			due,
			reps: rating === 1 ? 0 : current.reps + 1,
			algorithm: 'sm2',
		};
	}

	/**
	 * 计算下次调度
	 */
	function calcSchedule(current: Schedule | null, rating: Rating): Schedule {
		if (!current || current.reps === 0) {
			return calcNewCardSchedule(rating, current?.ease);
		}
		return calcExistingCardSchedule(current, rating);
	}

	/**
	 * 计算时间差
	 */
	function getTimeDiff(schedule: Schedule): { minutes: number; hours: number; days: number } {
		const diffMs = schedule.due.getTime() - Date.now();
		return {
			minutes: Math.round(diffMs / (1000 * 60)),
			hours: Math.round(diffMs / (1000 * 60 * 60)),
			days: Math.round(diffMs / (1000 * 60 * 60 * 24)),
		};
	}

	/**
	 * 获取下次复习时间的描述
	 */
	function getNextReviewText(schedule: Schedule | null | undefined, rating: Rating): string {
		const newSchedule = calcSchedule(schedule ?? null, rating);
		const { minutes, hours, days } = getTimeDiff(newSchedule);

		if (minutes <= 1) return '< 1 min';
		if (minutes < 60) return `${minutes} min`;
		if (hours < 24) return `${hours} hr`;
		if (days === 1) return '1 day';
		if (days < 30) return `${days} days`;
		if (days < 365) return `${Math.floor(days / 30)} mo`;
		return `${Math.floor(days / 365)} yr`;
	}

	/**
	 * 获取短格式下次复习时间
	 */
	function getNextReviewShortText(schedule: Schedule | null | undefined, rating: Rating): string {
		return getNextReviewText(schedule, rating);
	}

	/**
	 * 检查卡片是否到期
	 */
	function isDue(schedule: Schedule | undefined): boolean {
		if (!schedule) return true;
		return schedule.due <= new Date();
	}

	return {
		createInitialSchedule,
		calcSchedule,
		getNextReviewText,
		getNextReviewShortText,
		isDue,
	};
}

// 默认导出
export const sm2Scheduler = createSM2Scheduler();

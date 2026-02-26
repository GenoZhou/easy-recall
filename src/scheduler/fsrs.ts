/**
 * FSRS-4.5 算法实现
 * 
 * Free Spaced Repetition Scheduler (FSRS)
 * 基于遗忘曲线理论，比 SM-2 更精准预测记忆保持率
 * 
 * 参考: https://github.com/open-spaced-repetition/fsrs4anki
 */

import { Schedule, Rating, CardState } from '../types';
import { FSRSParams, DEFAULT_FSRS_PARAMS } from './types';

export { DEFAULT_FSRS_PARAMS };

/**
 * 创建 FSRS 调度器
 */
export function createFSRSScheduler(params: FSRSParams = DEFAULT_FSRS_PARAMS) {
	const { w, requestRetention, maximumInterval } = params;

	/**
	 * 创建初始调度（新卡片）
	 */
	function createInitialSchedule(): Schedule {
		const now = new Date();
		return {
			interval: 0,
			due: now,
			reps: 0,
			difficulty: 5,
			stability: 0,
			lapses: 0,
			lastReview: now,
			state: 'new',
			algorithm: 'fsrs',
		};
	}

	/**
	 * 计算可提取性（遗忘概率）
	 * R = e^(-t/S)
	 * t: 距上次复习的天数
	 * S: 稳定性（天）
	 */
	function calcRetrievability(stability: number, elapsedDays: number): number {
		if (stability <= 0) return 0;
		return Math.exp(-elapsedDays / stability);
	}

	/**
	 * 初始化稳定性（首次评分）
	 * 根据评分返回初始稳定性
	 */
	function initStability(rating: Rating): number {
		// w[0-3] 对应 Again/Hard/Good/Easy 的初始稳定性
		return Math.max(0.1, w[rating - 1]);
	}

	/**
	 * 初始化难度（首次评分）
	 * D = w[4] - w[5] * (R - 3)
	 * R: 评分 (1-4)
	 */
	function initDifficulty(rating: Rating): number {
		const difficulty = w[4] - w[5] * (rating - 3);
		return clampDifficulty(difficulty);
	}

	/**
	 * 限制难度范围 1-10
	 */
	function clampDifficulty(d: number): number {
		return Math.max(1, Math.min(10, d));
	}

	/**
	 * 更新难度
	 * D' = D + w[6] * (R - 3)
	 * 失败后难度调整: D' = w[7] * D0 + (1 - w[7]) * D
	 */
	function updateDifficulty(schedule: Schedule, rating: Rating): number {
		const currentD = schedule.difficulty ?? 5;
		
		if (rating === 1) {
			// 失败后难度调整
			const initialD = initDifficulty(3); // 以 Good 评分为基准
			return clampDifficulty(w[7] * initialD + (1 - w[7]) * currentD);
		}
		
		// 成功复习后难度调整
		return clampDifficulty(currentD + w[6] * (rating - 3));
	}

	/**
	 * 更新稳定性
	 * 
	 * 成功复习:
	 * S' = S * (1 + Math.exp(w[8]) * (11 - D) * Math.pow(S, w[9]) * 
	 *           (Math.exp((1 - requestRetention) * w[10]) - 1) * 
	 *           hardPenalty * easyBonus)
	 * 
	 * 失败后重新学习:
	 * S' = w[11] * Math.pow(D, w[12]) * Math.pow(S, w[13]) * 
	 *      Math.exp((1 - requestRetention) * w[14])
	 */
	function updateStability(schedule: Schedule, rating: Rating): number {
		const currentS = schedule.stability ?? 0.1;
		const currentD = schedule.difficulty ?? 5;
		
		if (rating === 1) {
			// 失败：重新计算稳定性
			const newS = w[11] * Math.pow(currentD, w[12]) * Math.pow(currentS, w[13]) * 
				         Math.exp((1 - requestRetention) * w[14]);
			return Math.max(0.1, newS);
		}
		
		// 成功：稳定性增长
		const hardPenalty = rating === 2 ? w[15] : 1;
		const easyBonus = rating === 4 ? w[16] : 1;
		
		const retrievability = calcRetrievability(currentS, schedule.interval);
		const newS = currentS * (1 + 
			Math.exp(w[8]) * 
			(11 - currentD) * 
			Math.pow(currentS, w[9]) * 
			(Math.exp((1 - retrievability) * w[10]) - 1) * 
			hardPenalty * 
			easyBonus
		);
		
		return Math.max(0.1, newS);
	}

	/**
	 * 计算下次间隔
	 * I = S * Math.log(requestRetention) / Math.log(retrievability)
	 * 简化为: I = S （当使用目标保持率时）
	 */
	function calcInterval(stability: number): number {
		// 使用对数计算，确保目标保持率
		// 简化为直接使用稳定性作为基础间隔
		const interval = stability * Math.log(requestRetention) / Math.log(0.9);
		return Math.min(Math.round(interval), maximumInterval);
	}

	/**
	 * 确定学习状态
	 */
	function getNextState(current: Schedule, rating: Rating): CardState {
		const currentState = current.state ?? 'new';
		
		if (currentState === 'new') {
			return rating === 1 ? 'learning' : 'review';
		}
		
		if (currentState === 'learning' || currentState === 'relearning') {
			return rating === 1 ? currentState : 'review';
		}
		
		// review 状态
		return rating === 1 ? 'relearning' : 'review';
	}

	/**
	 * 计算新卡片调度（首次复习）
	 */
	function calcNewCardSchedule(rating: Rating): Schedule {
		const now = new Date();
		const stability = initStability(rating);
		const difficulty = initDifficulty(rating);
		
		// 新卡片间隔：Again=立即，其他=当天或短间隔
		let interval: number;
		if (rating === 1) {
			interval = 0; // 立即重新复习
		} else if (rating === 2) {
			interval = 0.25; // 6小时后
		} else {
			interval = calcInterval(stability);
		}
		
		const due = new Date(now);
		if (interval < 1) {
			due.setMinutes(due.getMinutes() + Math.round(interval * 24 * 60));
		} else {
			due.setDate(due.getDate() + Math.round(interval));
		}
		
		return {
			interval,
			due,
			reps: 1,
			difficulty,
			stability,
			lapses: 0,
			lastReview: now,
			state: getNextState({ reps: 0, interval: 0, due: now, algorithm: 'fsrs' } as Schedule, rating),
			algorithm: 'fsrs',
		};
	}

	/**
	 * 计算已有卡片的调度
	 */
	function calcExistingCardSchedule(current: Schedule, rating: Rating): Schedule {
		const now = new Date();
		const newDifficulty = updateDifficulty(current, rating);
		const newStability = updateStability(current, rating);
		const newState = getNextState(current, rating);
		
		let interval: number;
		let lapses = current.lapses ?? 0;
		
		if (rating === 1) {
			// 失败：短间隔重新学习
			interval = 0;
			lapses += 1;
		} else {
			// 成功：使用 FSRS 计算间隔
			interval = calcInterval(newStability);
		}
		
		const due = new Date(now);
		if (interval < 1) {
			due.setMinutes(due.getMinutes() + Math.round(interval * 24 * 60));
		} else {
			due.setDate(due.getDate() + Math.round(interval));
		}
		
		return {
			interval,
			due,
			reps: rating === 1 ? current.reps : current.reps + 1,
			difficulty: newDifficulty,
			stability: newStability,
			lapses,
			lastReview: now,
			state: newState,
			algorithm: 'fsrs',
		};
	}

	/**
	 * 计算下次调度
	 */
	function calcSchedule(current: Schedule | null, rating: Rating): Schedule {
		if (!current || current.reps === 0) {
			return calcNewCardSchedule(rating);
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

	/**
	 * 计算当前可提取性（用于调试和显示）
	 */
	function getCurrentRetrievability(schedule: Schedule): number {
		if (!schedule.lastReview || !schedule.stability) return 0;
		const elapsedDays = (Date.now() - schedule.lastReview.getTime()) / (1000 * 60 * 60 * 24);
		return calcRetrievability(schedule.stability, elapsedDays);
	}

	return {
		createInitialSchedule,
		calcSchedule,
		getNextReviewText,
		getNextReviewShortText,
		isDue,
		getCurrentRetrievability,
		// 导出内部函数用于测试
		_initStability: initStability,
		_initDifficulty: initDifficulty,
		_updateStability: updateStability,
		_updateDifficulty: updateDifficulty,
		_calcRetrievability: calcRetrievability,
		calcInterval,
	};
}

// 默认导出
export const fsrsScheduler = createFSRSScheduler();

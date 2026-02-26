/**
 * 调度数据迁移工具
 * 
 * 支持 SM-2 -> FSRS 自动迁移
 * 向后兼容旧数据格式
 */

import { Schedule, Rating, Algorithm } from '../types';
import { DEFAULT_FSRS_PARAMS } from './types';

/**
 * 检测调度数据使用的算法
 */
export function detectAlgorithm(schedule: Schedule | null | undefined): Algorithm {
	if (!schedule) return 'fsrs';
	
	// 显式标记
	if (schedule.algorithm) {
		return schedule.algorithm;
	}
	
	// 通过字段推断
	if (schedule.difficulty !== undefined || schedule.stability !== undefined) {
		return 'fsrs';
	}
	
	// 旧格式只有 ease 字段
	if (schedule.ease !== undefined) {
		return 'sm2';
	}
	
	return 'fsrs';
}

/**
 * 检查是否需要迁移
 */
export function needsMigration(schedule: Schedule | null | undefined): boolean {
	if (!schedule) return false;
	
	// 已有算法标记，无需迁移
	if (schedule.algorithm === 'fsrs') return false;
	
	// 有 FSRS 字段，只需添加标记
	if (schedule.difficulty !== undefined) {
		return true;
	}
	
	// 纯 SM-2 格式，需要完整迁移
	if (schedule.ease !== undefined) {
		return true;
	}
	
	return false;
}

/**
 * 从 SM-2 迁移到 FSRS
 * 
 * 迁移策略：
 * - interval -> stability (近似)
 * - ease -> difficulty (反向映射: ease 高 = difficulty 低)
 * - reps -> reps (保留)
 * - 添加 FSRS 特有字段
 */
export function migrateToFSRS(schedule: Schedule): Schedule {
	// 已是 FSRS 格式
	if (schedule.algorithm === 'fsrs' && schedule.difficulty !== undefined) {
		return schedule;
	}
	
	const now = new Date();
	const ease = schedule.ease ?? 250;
	const interval = schedule.interval ?? 0;
	
	// ease (130-350) 反向映射到 difficulty (1-10)
	// ease 250 -> difficulty 5 (中等)
	// ease 越高，difficulty 越低
	const normalizedEase = (ease - 130) / (350 - 130); // 0-1
	const difficulty = 10 - (normalizedEase * 8 + 1);  // 1-10，反向
	
	// interval 近似为 stability
	// 新卡片 stability 使用默认值
	const stability = interval > 0 
		? interval 
		: DEFAULT_FSRS_PARAMS.w[2]; // Good 评分的初始稳定性
	
	return {
		...schedule,
		difficulty: Math.round(difficulty * 10) / 10,
		stability: Math.round(stability * 10) / 10,
		lapses: 0,
		lastReview: schedule.lastReview ?? now,
		state: schedule.reps > 0 ? 'review' : 'new',
		algorithm: 'fsrs',
		// 保留原 ease 用于回退
		ease: schedule.ease,
	};
}

/**
 * 迁移调度数据（自动检测并迁移）
 */
export function migrateSchedule(schedule: Schedule | null | undefined): Schedule | null {
	if (!schedule) return null;
	
	const algo = detectAlgorithm(schedule);
	
	if (algo === 'fsrs') {
		// 确保有 algorithm 标记
		if (!schedule.algorithm) {
			return { ...schedule, algorithm: 'fsrs' };
		}
		return schedule;
	}
	
	// SM-2 -> FSRS
	return migrateToFSRS(schedule);
}

/**
 * 降级回 SM-2（用于回退）
 */
export function downgradeToSM2(schedule: Schedule): Schedule {
	// 提取核心字段
	const { interval, due, reps, ease } = schedule;
	
	return {
		interval,
		due,
		reps,
		ease: ease ?? 250,
		algorithm: 'sm2',
	};
}

/**
 * 批量迁移多个调度
 */
export function migrateSchedules(schedules: (Schedule | null | undefined)[]): (Schedule | null)[] {
	return schedules.map(migrateSchedule);
}

/**
 * 验证调度数据完整性
 */
export function validateSchedule(schedule: Schedule | null): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	
	if (!schedule) {
		return { valid: false, errors: ['Schedule is null'] };
	}
	
	// 必需字段检查
	if (typeof schedule.interval !== 'number') {
		errors.push('interval must be a number');
	}
	if (!(schedule.due instanceof Date) || isNaN(schedule.due.getTime())) {
		errors.push('due must be a valid Date');
	}
	if (typeof schedule.reps !== 'number') {
		errors.push('reps must be a number');
	}
	
	// FSRS 字段检查
	if (schedule.algorithm === 'fsrs' || schedule.difficulty !== undefined || schedule.stability !== undefined) {
		if (schedule.difficulty !== undefined && (schedule.difficulty < 1 || schedule.difficulty > 10)) {
			errors.push('difficulty must be between 1 and 10');
		}
		if (schedule.stability !== undefined && schedule.stability < 0) {
			errors.push('stability must be non-negative');
		}
		if (schedule.lapses !== undefined && schedule.lapses < 0) {
			errors.push('lapses must be non-negative');
		}
	}
	
	return { valid: errors.length === 0, errors };
}

/**
 * 获取调度统计信息（用于调试）
 */
export function getScheduleStats(schedule: Schedule | null): Record<string, unknown> {
	if (!schedule) {
		return { type: 'null' };
	}
	
	const algo = detectAlgorithm(schedule);
	const base = {
		type: algo,
		interval: schedule.interval,
		reps: schedule.reps,
		due: schedule.due.toISOString(),
	};
	
	if (algo === 'fsrs') {
		return {
			...base,
			difficulty: schedule.difficulty,
			stability: schedule.stability,
			lapses: schedule.lapses,
			state: schedule.state,
		};
	}
	
	return {
		...base,
		ease: schedule.ease,
	};
}

import { Card, Schedule, Rating, ReviewHistory } from './types';
import { t } from './i18n';

// SM-2 算法参数
export const INITIAL_EASE = 250;
export const MIN_EASE = 130;
export const MAX_EASE = 350;
export const MAX_INTERVAL = 365;
export const MATURE_REPS = 2;
export const MATURE_AGAIN_INTERVAL_FACTOR = 0.25;
export const RECENT_RATING_LIMIT = 8;
export const MASTERY_INTERVAL_DAYS = 30;
export const DAILY_REVIEW_CAPACITY = 30;

export type MistakeReason = 'consecutiveAgain' | 'highErrorRate' | 'unstable';

export interface MistakeProfile {
	score: number;
	reason?: MistakeReason;
}

// 新卡片首次复习的间隔（天）
const NEW_CARD_INTERVALS: Record<Rating, number> = {
	1: 0,      // 没记住: 立即重新复习
	2: 0.25,   // 有点难: 6 小时后
	3: 1,      // 记住了: 1 天后
};

// 评分对 ease 的影响
const EASE_DELTAS: Record<Rating, number> = {
	1: -20,    // 没记住: ease 降低
	2: -15,    // 有点难: ease 略降
	3: 5,      // 记住了: ease 缓慢恢复
};

function clampEase(ease: number): number {
	return Math.max(MIN_EASE, Math.min(MAX_EASE, ease));
}

function createDueDate(intervalDays: number, now: Date = new Date()): Date {
	const due = new Date(now);
	if (intervalDays < 1) {
		due.setMinutes(due.getMinutes() + Math.round(intervalDays * 24 * 60));
	} else {
		due.setDate(due.getDate() + Math.round(intervalDays));
	}
	return due;
}

function updateReviewHistory(history: ReviewHistory | undefined, rating: Rating, now: Date): ReviewHistory {
	const current: ReviewHistory = history ?? {
		total: 0,
		again: 0,
		hard: 0,
		good: 0,
		recent: [],
	};

	return {
		total: current.total + 1,
		again: current.again + (rating === 1 ? 1 : 0),
		hard: current.hard + (rating === 2 ? 1 : 0),
		good: current.good + (rating === 3 ? 1 : 0),
		recent: [...current.recent, rating].slice(-RECENT_RATING_LIMIT),
		lastReviewed: now,
	};
}

/**
 * 创建初始调度（新卡片）
 */
export function createInitialSchedule(): Schedule {
	const now = new Date();
	return {
		interval: 0,
		ease: INITIAL_EASE,
		due: now,
		reps: 0,
	};
}

/**
 * 计算新卡片的调度
 */
function calcNewCardSchedule(rating: Rating, ease: number = INITIAL_EASE): Schedule {
	const now = new Date();
	// 新卡片使用对应评分的间隔
	const intervalDays = NEW_CARD_INTERVALS[rating];
	const newEase = clampEase(ease + EASE_DELTAS[rating]);
	const due = createDueDate(intervalDays, now);
	
	return {
		interval: intervalDays,
		ease: newEase,
		due,
		reps: rating === 1 ? 0 : 1,
		history: updateReviewHistory(undefined, rating, now),
	};
}

/**
 * 计算已有卡片的调度
 */
function calcExistingCardSchedule(current: Schedule, rating: Rating): Schedule {
	const now = new Date();
	const easeDelta = EASE_DELTAS[rating];
	const newEase = clampEase(current.ease + easeDelta);
	
	let newInterval: number;
	if (rating === 1) {
		// 成熟卡没记住: 回退到较短周期，而不是打回新卡
		newInterval = Math.max(1, current.interval * MATURE_AGAIN_INTERVAL_FACTOR);
	} else if (rating === 2) {
		// 有点难: 间隔增长较慢
		newInterval = current.interval * 1.2;
	} else {
		// 记住了: 使用 ease 计算
		newInterval = current.interval * (current.ease / 100);
	}
	
	// 限制最大间隔
	newInterval = Math.min(newInterval, MAX_INTERVAL);
	const due = createDueDate(newInterval, now);
	
	return {
		interval: newInterval,
		ease: newEase,
		due,
		reps: rating === 1 ? current.reps : current.reps + 1,
		history: updateReviewHistory(current.history, rating, now),
	};
}

/**
 * 计算下一次调度
 * @param current 当前调度信息，null 表示新卡片
 * @param rating 评分等级 1-3
 */
export function calcSchedule(current: Schedule | null, rating: Rating): Schedule {
	if (!current || current.reps === 0) {
		// 新卡片或已被打回学习阶段的卡片
		const schedule = calcNewCardSchedule(rating, current?.ease);
		if (current?.history) {
			schedule.history = updateReviewHistory(current.history, rating, new Date());
		}
		return schedule;
	}

	if (rating === 1 && current.reps < MATURE_REPS) {
		// 学习中卡片没记住: 重新进入学习
		return calcNewCardSchedule(rating, current?.ease);
	}
	return calcExistingCardSchedule(current, rating);
}

export function getMistakeProfile(card: Card): MistakeProfile {
	const history = card.schedule?.history;
	if (!history || history.total === 0) {
		return { score: 0 };
	}

	const recent = history.recent;
	const endsWithConsecutiveAgain = recent.length >= 2
		&& recent[recent.length - 1] === 1
		&& recent[recent.length - 2] === 1;
	const againRate = history.again / history.total;
	const difficultRate = (history.again + history.hard) / history.total;

	let reason: MistakeReason | undefined;
	if (endsWithConsecutiveAgain) {
		reason = 'consecutiveAgain';
	} else if (history.total >= 3 && againRate >= 0.4) {
		reason = 'highErrorRate';
	} else if (history.total >= 4 && (difficultRate >= 0.6 || card.schedule!.ease <= 200)) {
		reason = 'unstable';
	}

	const recentPenalty = recent.slice(-3).reduce((sum, rating) => {
		if (rating === 1) return sum + 5;
		if (rating === 2) return sum + 2;
		return sum;
	}, 0);

	const score = history.again * 3
		+ history.hard
		+ recentPenalty
		+ (card.schedule!.ease <= 200 ? 3 : 0);

	return { score: reason ? Math.max(score, 1) : 0, reason };
}

export function compareCardsForReview(a: Card, b: Card): number {
	const profileA = getMistakeProfile(a);
	const profileB = getMistakeProfile(b);

	if (profileA.score !== profileB.score) {
		return profileB.score - profileA.score;
	}

	const dueA = a.schedule?.due?.getTime() || 0;
	const dueB = b.schedule?.due?.getTime() || 0;
	return dueA - dueB;
}

export function isMastered(card: Card): boolean {
	const schedule = card.schedule;
	if (!schedule || schedule.interval < MASTERY_INTERVAL_DAYS) {
		return false;
	}

	const recent = schedule.history?.recent;
	return !recent?.length || recent[recent.length - 1] !== 1;
}

export function estimateMasteryWork(card: Card): number {
	if (isMastered(card)) {
		return 0;
	}

	if (!card.schedule) {
		return 3;
	}

	const interval = Math.max(card.schedule.interval, 1);
	const baseWork = Math.max(1, Math.ceil(Math.log2(MASTERY_INTERVAL_DAYS / interval)));
	const multiplier = getMistakeProfile(card).reason ? 1.5 : 1;
	return Math.ceil(baseWork * multiplier);
}

/**
 * 计算时间差（分钟、小时、天）
 * 用于避免 getNextReviewText 和 getNextReviewShortText 重复计算
 */
function getTimeDiff(schedule: Schedule): { minutes: number; hours: number; days: number } {
	const diffMs = schedule.due.getTime() - Date.now();
	return {
		minutes: Math.round(diffMs / (1000 * 60)),
		hours: Math.round(diffMs / (1000 * 60 * 60)),
		days: Math.round(diffMs / (1000 * 60 * 60 * 24))
	};
}

/**
 * 获取下次复习时间的描述
 */
export function getNextReviewText(schedule: Schedule | null | undefined, rating: Rating): string {
	const lang = t();
	const newSchedule = calcSchedule(schedule ?? null, rating);
	const { minutes, hours, days } = getTimeDiff(newSchedule);

	if (minutes <= 1) return lang.time.immediate;
	if (minutes < 60) return lang.time.minutes(minutes);
	if (hours < 24) return lang.time.hours(hours);
	if (days === 1) return lang.time.tomorrow;
	if (days < 30) return lang.time.days(days);
	if (days < 365) return lang.time.months(Math.floor(days / 30));
	return lang.time.years(Math.floor(days / 365));
}

/**
 * 获取短格式下次复习时间（用于按钮标注）
 * 格式: now, 6hr, 1d, 3mo 等
 */
export function getNextReviewShortText(schedule: Schedule | null | undefined, rating: Rating): string {
	const newSchedule = calcSchedule(schedule ?? null, rating);
	const { minutes, hours, days } = getTimeDiff(newSchedule);

	if (minutes <= 1) return 'now';
	if (minutes < 60) return `${minutes}m`;
	if (hours < 24) return `${hours}hr`;
	if (days === 1) return '1d';
	if (days < 30) return `${days}d`;
	if (days < 365) return `${Math.floor(days / 30)}mo`;
	return `${Math.floor(days / 365)}y`;
}

/**
 * 检查卡片是否到期
 */
export function isDue(schedule: Schedule | undefined): boolean {
	if (!schedule) return true;
	return schedule.due <= new Date();
}

/**
 * 格式化日期为易读格式
 */
export function formatDueDate(date: Date, precise: boolean = false): string {
	const lang = t();
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffMinutes = Math.ceil(diffMs / (1000 * 60));
	const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	if (precise) {
		if (diffMinutes <= 0) return lang.time.now;
		if (diffMinutes < 60) return lang.time.minutes(diffMinutes);
		if (diffHours < 24) return lang.time.hours(diffHours);
	}

	if (diffDays <= 0) return lang.time.today;
	if (diffDays === 1) return lang.time.tomorrow;
	if (diffDays < 7) return lang.time.days(diffDays);
	if (diffDays < 30) return lang.time.weeks(Math.floor(diffDays / 7));
	if (diffDays < 365) return lang.time.months(Math.floor(diffDays / 30));
	return lang.time.years(Math.floor(diffDays / 365));
}

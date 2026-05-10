import { Card } from '../types';

export const UPCOMING_REVIEW_CHART_DAYS = 30;

export interface DailyReviewCount {
	date: string;
	count: number;
}

export interface ReviewStats {
	total: number;
	totalDecks: number;
	matureCards: number;
	dueNow: number;
	upcoming1d: number;
	upcoming3d: number;
	upcoming7d: number;
	upcoming30d: number;
	upcomingDaily: DailyReviewCount[];
	later: number;
}

export function calculateReviewStats(cards: Card[], now: Date = new Date()): ReviewStats {
	const stats: ReviewStats = {
		total: cards.length,
		totalDecks: 0,
		matureCards: 0,
		dueNow: 0,
		upcoming1d: 0,
		upcoming3d: 0,
		upcoming7d: 0,
		upcoming30d: 0,
		upcomingDaily: [],
		later: 0,
	};
	const deckSet = new Set<string>();
	const dailyCounts = new Map<string, number>();

	for (const card of cards) {
		const primaryDeck = card.tags[0] ?? 'default';
		deckSet.add(primaryDeck);

		if (!card.schedule) {
			stats.dueNow++;
			continue;
		}

		if (card.schedule.reps > 1) {
			stats.matureCards++;
		}

		if (card.schedule.due <= now) {
			stats.dueNow++;
			continue;
		}

		const diffMs = card.schedule.due.getTime() - now.getTime();
		const diffDays = diffMs / (1000 * 60 * 60 * 24);
		const chartDay = getCalendarDayOffset(now, card.schedule.due);

		if (chartDay >= 0 && chartDay <= UPCOMING_REVIEW_CHART_DAYS) {
			const dateKey = formatLocalDateKey(card.schedule.due);
			dailyCounts.set(dateKey, (dailyCounts.get(dateKey) ?? 0) + 1);
		}

		if (diffDays <= 1) {
			stats.upcoming1d++;
		} else if (diffDays <= 3) {
			stats.upcoming3d++;
		} else if (diffDays <= 7) {
			stats.upcoming7d++;
		} else if (diffDays <= 30) {
			stats.upcoming30d++;
		} else {
			stats.later++;
		}
	}

	stats.totalDecks = deckSet.size;
	stats.upcomingDaily = Array.from(dailyCounts.entries())
		.sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
		.map(([date, count]) => ({ date, count }));

	return stats;
}

function getCalendarDayOffset(from: Date, to: Date): number {
	const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
	const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
	return Math.round((toDay - fromDay) / (1000 * 60 * 60 * 24));
}

function formatLocalDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

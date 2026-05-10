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
	upcomingDaily: DailyReviewCount[];
}

export function calculateReviewStats(cards: Card[], now: Date = new Date()): ReviewStats {
	const stats: ReviewStats = {
		total: cards.length,
		totalDecks: 0,
		matureCards: 0,
		dueNow: 0,
		upcomingDaily: [],
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

		const chartDay = getCalendarDayOffset(now, card.schedule.due);

		if (chartDay >= 0 && chartDay <= UPCOMING_REVIEW_CHART_DAYS) {
			const dateKey = formatLocalDateKey(card.schedule.due);
			dailyCounts.set(dateKey, (dailyCounts.get(dateKey) ?? 0) + 1);
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

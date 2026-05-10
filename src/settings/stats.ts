import { Card } from '../types';

export const UPCOMING_REVIEW_CHART_DAYS = 30;

export interface DailyReviewCount {
	day: number;
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
		upcomingDaily: Array.from({ length: UPCOMING_REVIEW_CHART_DAYS }, (_, index) => ({
			day: index + 1,
			count: 0,
		})),
		later: 0,
	};
	const deckSet = new Set<string>();

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
		const chartDay = Math.ceil(diffDays);

		if (chartDay >= 1 && chartDay <= UPCOMING_REVIEW_CHART_DAYS) {
			stats.upcomingDaily[chartDay - 1].count++;
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

	return stats;
}

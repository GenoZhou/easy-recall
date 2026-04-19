import { Card } from '../types';

export interface ReviewStats {
	total: number;
	newCards: number;
	relearningCards: number;
	learningCards: number;
	matureCards: number;
	dueNow: number;
	upcoming1d: number;
	upcoming3d: number;
	upcoming7d: number;
	upcoming30d: number;
	later: number;
}

export function calculateReviewStats(cards: Card[], now: Date = new Date()): ReviewStats {
	const stats: ReviewStats = {
		total: cards.length,
		newCards: 0,
		relearningCards: 0,
		learningCards: 0,
		matureCards: 0,
		dueNow: 0,
		upcoming1d: 0,
		upcoming3d: 0,
		upcoming7d: 0,
		upcoming30d: 0,
		later: 0,
	};

	for (const card of cards) {
		if (!card.schedule) {
			stats.newCards++;
			stats.dueNow++;
			continue;
		}

		if (card.schedule.reps === 0) {
			stats.relearningCards++;
		} else if (card.schedule.reps === 1) {
			stats.learningCards++;
		} else {
			stats.matureCards++;
		}

		if (card.schedule.due <= now) {
			stats.dueNow++;
			continue;
		}

		const diffMs = card.schedule.due.getTime() - now.getTime();
		const diffDays = diffMs / (1000 * 60 * 60 * 24);

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

	return stats;
}

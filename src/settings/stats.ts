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
	decks: DeckReviewStats[];
}

export interface DeckReviewStats {
	deck: string;
	total: number;
	dueNow: number;
	matureCards: number;
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
		decks: [],
	};
	const deckMap = new Map<string, DeckReviewStats>();

	for (const card of cards) {
		const primaryDeck = card.tags[0] ?? 'default';
		if (!deckMap.has(primaryDeck)) {
			deckMap.set(primaryDeck, {
				deck: primaryDeck,
				total: 0,
				dueNow: 0,
				matureCards: 0,
			});
		}
		const deckStats = deckMap.get(primaryDeck)!;
		deckStats.total++;

		if (!card.schedule) {
			stats.newCards++;
			stats.dueNow++;
			deckStats.dueNow++;
			continue;
		}

		if (card.schedule.reps === 0) {
			stats.relearningCards++;
		} else if (card.schedule.reps === 1) {
			stats.learningCards++;
		} else {
			stats.matureCards++;
			deckStats.matureCards++;
		}

		if (card.schedule.due <= now) {
			stats.dueNow++;
			deckStats.dueNow++;
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

	stats.decks = [...deckMap.values()].sort((a, b) => {
		if (b.dueNow !== a.dueNow) return b.dueNow - a.dueNow;
		if (b.total !== a.total) return b.total - a.total;
		return a.deck.localeCompare(b.deck);
	});

	return stats;
}

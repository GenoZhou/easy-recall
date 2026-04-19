import { Card } from '../types';

export interface ReviewStats {
	total: number;
	totalDecks: number;
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
	stageDecks: StageDeckBreakdown;
}

export interface DeckReviewStats {
	deck: string;
	count: number;
}

export interface StageDeckBreakdown {
	newCards: DeckReviewStats[];
	relearningCards: DeckReviewStats[];
	learningCards: DeckReviewStats[];
	matureCards: DeckReviewStats[];
}

export function calculateReviewStats(cards: Card[], now: Date = new Date()): ReviewStats {
	const stats: ReviewStats = {
		total: cards.length,
		totalDecks: 0,
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
		stageDecks: {
			newCards: [],
			relearningCards: [],
			learningCards: [],
			matureCards: [],
		},
	};
	const deckSet = new Set<string>();
	const stageDeckMaps = {
		newCards: new Map<string, number>(),
		relearningCards: new Map<string, number>(),
		learningCards: new Map<string, number>(),
		matureCards: new Map<string, number>(),
	};

	for (const card of cards) {
		const primaryDeck = card.tags[0] ?? 'default';
		deckSet.add(primaryDeck);

		if (!card.schedule) {
			stats.newCards++;
			stats.dueNow++;
			stageDeckMaps.newCards.set(primaryDeck, (stageDeckMaps.newCards.get(primaryDeck) ?? 0) + 1);
			continue;
		}

		if (card.schedule.reps === 0) {
			stats.relearningCards++;
			stageDeckMaps.relearningCards.set(primaryDeck, (stageDeckMaps.relearningCards.get(primaryDeck) ?? 0) + 1);
		} else if (card.schedule.reps === 1) {
			stats.learningCards++;
			stageDeckMaps.learningCards.set(primaryDeck, (stageDeckMaps.learningCards.get(primaryDeck) ?? 0) + 1);
		} else {
			stats.matureCards++;
			stageDeckMaps.matureCards.set(primaryDeck, (stageDeckMaps.matureCards.get(primaryDeck) ?? 0) + 1);
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

	stats.totalDecks = deckSet.size;
	stats.stageDecks = {
		newCards: toSortedDeckStats(stageDeckMaps.newCards),
		relearningCards: toSortedDeckStats(stageDeckMaps.relearningCards),
		learningCards: toSortedDeckStats(stageDeckMaps.learningCards),
		matureCards: toSortedDeckStats(stageDeckMaps.matureCards),
	};

	return stats;
}

function toSortedDeckStats(deckMap: Map<string, number>): DeckReviewStats[] {
	return [...deckMap.entries()].map(([deck, count]) => ({ deck, count })).sort((a, b) => {
		if (b.count !== a.count) return b.count - a.count;
		return a.deck.localeCompare(b.deck);
	});
}

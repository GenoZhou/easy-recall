import { Card, Schedule } from '../types';
import {
	buildVirtualDecks,
	deckMatchesQuery,
	filterCardsForVirtualDeck,
	isLeechCard,
	isNewCard,
	isVirtualDeckId,
	LEECH_EASE_FALLBACK,
} from '../smart-decks';

function makeCard(overrides: Partial<Card> = {}): Card {
	return {
		id: 'card-1',
		type: 'cloze',
		content: '==answer==',
		tags: ['math'],
		filePath: 'math.md',
		lineStart: 0,
		lineEnd: 0,
		...overrides,
	};
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
	return {
		interval: 2,
		ease: 250,
		due: new Date('2026-01-01T00:00:00Z'),
		reps: 2,
		lapses: 0,
		...overrides,
	};
}

describe('smart-decks', () => {
	describe('card kinds', () => {
		it('treats unscheduled cards and reps 0 as new', () => {
			expect(isNewCard(makeCard())).toBe(true);
			expect(isNewCard(makeCard({ schedule: makeSchedule({ reps: 0 }) }))).toBe(true);
			expect(isNewCard(makeCard({ schedule: makeSchedule({ reps: 1 }) }))).toBe(false);
		});

		it('enters leech at the lapse threshold and leaves below it', () => {
			const leech = makeCard({ schedule: makeSchedule({ lapses: 3 }) });
			const graduated = makeCard({ schedule: makeSchedule({ lapses: 2 }) });
			expect(isLeechCard(leech, 3)).toBe(true);
			expect(isLeechCard(graduated, 3)).toBe(false);
			expect(isLeechCard(makeCard(), 3)).toBe(false);
		});

		it('uses low ease as a fallback when lapses are below the threshold', () => {
			const lowEase = makeCard({
				schedule: makeSchedule({ ease: LEECH_EASE_FALLBACK, lapses: 0 }),
			});
			const recovered = makeCard({
				schedule: makeSchedule({ ease: LEECH_EASE_FALLBACK + 1, lapses: 0 }),
			});
			expect(isLeechCard(lowEase, 3)).toBe(true);
			expect(isLeechCard(recovered, 3)).toBe(false);
		});
	});

	describe('filters', () => {
		const now = new Date('2026-04-01T00:00:00Z');

		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(now);
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('includes not-due leeches and omits empty virtual decks', () => {
			const later = new Date('2026-05-01T00:00:00Z');
			const cards = [
				makeCard({ id: 'leech-later', schedule: makeSchedule({ lapses: 3, due: later }) }),
				makeCard({ id: 'plain', schedule: makeSchedule({ lapses: 0, due: later }) }),
			];

			const decks = buildVirtualDecks(cards, 3, { leech: true });
			expect(decks.map(deck => deck.id)).toEqual(['leech']);
			expect(filterCardsForVirtualDeck(cards, 'leech', 3)).toHaveLength(1);
			expect(filterCardsForVirtualDeck(cards, 'new', 3)).toHaveLength(0);
		});

		it('only includes due new cards in the new deck', () => {
			const later = new Date('2026-05-01T00:00:00Z');
			const cards = [
				makeCard({ id: 'new-due' }),
				makeCard({ id: 'new-later', schedule: makeSchedule({ reps: 0, due: later }) }),
				makeCard({ id: 'learned-due', schedule: makeSchedule({ reps: 1, due: now }) }),
			];

			expect(filterCardsForVirtualDeck(cards, 'new', 3).map(card => card.id)).toEqual(['new-due']);
		});

		it('hides virtual decks when they are disabled', () => {
			const cards = [
				makeCard({ id: 'new-due' }),
				makeCard({ id: 'leech', schedule: makeSchedule({ lapses: 3, due: now }) }),
			];

			expect(buildVirtualDecks(cards, 3)).toEqual([]);
			expect(buildVirtualDecks(cards, 3, { leech: false, new: true }).map(deck => deck.id)).toEqual(['new']);
			expect(buildVirtualDecks(cards, 3, { leech: true, new: false }).map(deck => deck.id)).toEqual(['leech']);
			expect(buildVirtualDecks(cards, 3, { leech: false, new: false })).toEqual([]);
		});

		it('treats only extra practice as a not-due virtual deck', () => {
			expect(isVirtualDeckId('leech')).toBe(true);
			expect(isVirtualDeckId('new')).toBe(true);
			expect(isVirtualDeckId('all')).toBe(false);
		});
	});

	describe('deckMatchesQuery', () => {
		it('matches display names, original tags, and aliases', () => {
			expect(deckMatchesQuery('易错加练', ['@leech', 'leech', '易错'], 'leech')).toBe(true);
			expect(deckMatchesQuery('全部到期', ['@all', 'all', '全部'], '全部')).toBe(true);
			expect(deckMatchesQuery('中药到期', ['中药'], '中药')).toBe(true);
			expect(deckMatchesQuery('math due', ['math'], 'math')).toBe(true);
			expect(deckMatchesQuery('math due', ['math'], 'leech')).toBe(false);
		});
	});
});

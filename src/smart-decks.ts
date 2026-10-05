import { Card, Deck, DeckId } from './types';
import { isDue, isNewCard } from './scheduler';

export type VirtualDeckId = Exclude<DeckId, 'all'>;

export const LEECH_EASE_FALLBACK = 180;

export { isNewCard };

export function isVirtualDeckId(id: DeckId | undefined): id is VirtualDeckId {
	return id === 'leech' || id === 'new';
}

export function isLeechCard(card: Card, leechLapses: number): boolean {
	const schedule = card.schedule;
	if (!schedule) {
		return false;
	}

	const lapses = schedule.lapses ?? 0;
	return lapses >= leechLapses || schedule.ease <= LEECH_EASE_FALLBACK;
}

export function filterCardsForVirtualDeck(
	cards: Card[],
	id: VirtualDeckId,
	leechLapses: number
): Card[] {
	switch (id) {
		case 'leech':
			return cards.filter(card => isLeechCard(card, leechLapses));
		case 'new':
			return cards.filter(card => isNewCard(card) && isDue(card.schedule));
	}
}

export function buildVirtualDecks(
	cards: Card[],
	leechLapses: number,
	enabled: { leech?: boolean; new?: boolean } = {}
): Deck[] {
	const decks: Deck[] = [];
	if (enabled.leech) {
		const leechCards = filterCardsForVirtualDeck(cards, 'leech', leechLapses);
		if (leechCards.length > 0) {
			decks.push({ id: 'leech', tag: 'leech', cards: leechCards });
		}
	}
	if (enabled.new) {
		const newCards = filterCardsForVirtualDeck(cards, 'new', leechLapses);
		if (newCards.length > 0) {
			decks.push({ id: 'new', tag: 'new', cards: newCards });
		}
	}
	return decks;
}

export function deckMatchesQuery(tag: string, aliases: string[], query: string): boolean {
	const normalized = query.toLowerCase().trim();
	if (!normalized) {
		return true;
	}
	if (tag.toLowerCase().includes(normalized)) {
		return true;
	}
	return aliases.some(alias => alias.toLowerCase().includes(normalized));
}

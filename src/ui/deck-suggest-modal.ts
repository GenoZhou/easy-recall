import { App, SuggestModal, Notice, Vault } from 'obsidian';
import { Deck, Card } from '../types';
import { scanVault, groupByDecks, getDueCards } from '../deck';
import { formatDueDate, isDue } from '../scheduler';
import { error } from '../utils/';
import { t } from '../i18n';
import { DEFAULT_LEECH_LAPSES, DEFAULT_SETTINGS, ReviewSurface } from '../settings';
import { openReview } from './open-review';
import {
	buildVirtualDecks,
	deckMatchesQuery,
	filterCardsForVirtualDeck,
	isVirtualDeckId,
} from '../smart-decks';

interface DeckWithStats extends Deck {
	dueCount: number;
	nextReviewTime: string | null;
}

export class DeckSuggestModal extends SuggestModal<DeckWithStats> {
	private vault: Vault;
	private decks: DeckWithStats[] = [];
	private virtualDecks: DeckWithStats[] = [];
	private allCards: Card[] = [];
	private allDueDeck: DeckWithStats | null = null;
	private onReviewComplete?: () => void;
	private reviewSurface: ReviewSurface;
	private maxCardsPerReview: number;
	private deckTagPrefix: string;
	private clickToRevealCloze: boolean;
	private leechLapses: number;
	private showLeechDeck: boolean;
	private showNewDeck: boolean;

	constructor(
		app: App,
		vault: Vault,
		reviewSurface: ReviewSurface,
		maxCardsPerReview: number,
		deckTagPrefix: string,
		onReviewComplete?: () => void,
		clickToRevealCloze?: boolean,
		leechLapses?: number,
		showLeechDeck?: boolean,
		showNewDeck?: boolean
	) {
		super(app);
		this.vault = vault;
		this.reviewSurface = reviewSurface;
		this.maxCardsPerReview = maxCardsPerReview;
		this.deckTagPrefix = deckTagPrefix;
		this.onReviewComplete = onReviewComplete;
		this.clickToRevealCloze = clickToRevealCloze ?? false;
		this.leechLapses = leechLapses ?? DEFAULT_LEECH_LAPSES;
		this.showLeechDeck = showLeechDeck ?? DEFAULT_SETTINGS.showLeechDeck;
		this.showNewDeck = showNewDeck ?? DEFAULT_SETTINGS.showNewDeck;

		const lang = t();
		this.emptyStateText = lang.deckSelector.emptyState;
	}

	async onOpen() {
		const lang = t();
		this.resultContainerEl.setText(lang.deckSelector.loading);

		try {
			const allCards = await scanVault(this.vault, this.app, this.deckTagPrefix);
			this.allCards = allCards;
			const allDecks = groupByDecks(allCards);
			const dueCards = getDueCards(allCards);
			const dueDecks = groupByDecks(dueCards);

			this.allDueDeck = dueCards.length === 0
				? null
				: {
					id: 'all',
					tag: lang.deckSelector.allDeck.name,
					cards: dueCards,
					dueCount: dueCards.length,
					nextReviewTime: null,
				};
			this.decks = this.enrichDecks(allDecks, dueDecks)
				.sort((a, b) => b.dueCount - a.dueCount);
			this.virtualDecks = this.enrichVirtualDecks(buildVirtualDecks(allCards, this.leechLapses, {
				leech: this.showLeechDeck,
				new: this.showNewDeck,
			}));

			this.resultContainerEl.empty();

			await super.onOpen();

			this.inputEl.placeholder = lang.deckSelector.placeholder;

			this.setInstructions([
				{ command: '↑↓', purpose: lang.deckSelector.instructions.navigate },
				{ command: '↵', purpose: lang.deckSelector.instructions.select },
				{ command: 'esc', purpose: lang.deckSelector.instructions.close }
			]);

		} catch (err) {
			error('Failed to load decks:', err);
			this.resultContainerEl.setText(lang.deckSelector.loadFailed);
		}
	}

	private enrichDecks(allDecks: Deck[], dueDecks: Deck[]): DeckWithStats[] {
		return allDecks.map(deck => {
			const dueDeck = dueDecks.find(d => d.tag === deck.tag);
			const dueCount = dueDeck?.cards.length ?? 0;

			let nextReviewTime: string | null = null;
			if (dueCount === 0) {
				const nonDueCards = deck.cards
					.filter(c => c.schedule && !isDue(c.schedule))
					.sort((a, b) => a.schedule!.due.getTime() - b.schedule!.due.getTime());

				if (nonDueCards.length > 0) {
					nextReviewTime = formatDueDate(nonDueCards[0].schedule!.due, true);
				}
			}

			return {
				...deck,
				dueCount,
				nextReviewTime
			};
		});
	}

	private enrichVirtualDecks(decks: Deck[]): DeckWithStats[] {
		const lang = t();
		return decks.map(deck => ({
			...deck,
			tag: isVirtualDeckId(deck.id) ? lang.deckSelector.virtualDecks[deck.id].name : deck.tag,
			dueCount: deck.cards.length,
			nextReviewTime: null,
		}));
	}

	getSuggestions(query: string): DeckWithStats[] {
		const normalized = query.toLowerCase().trim();
		const suggestions = [
			...(this.allDueDeck ? [this.allDueDeck] : []),
			...this.virtualDecks,
			...this.decks,
		];

		if (!normalized) {
			return suggestions;
		}

		return suggestions.filter(deck =>
			deckMatchesQuery(this.getDeckLabel(deck), this.getDeckAliases(deck), normalized)
		);
	}

	private getDeckLabel(deck: DeckWithStats): string {
		const lang = t();
		if (deck.id) {
			return deck.tag;
		}
		if (deck.dueCount > 0) {
			return lang.deckSelector.dueDeck(deck.tag);
		}
		return deck.tag;
	}

	private getDeckAliases(deck: DeckWithStats): string[] {
		const lang = t();
		if (deck.id === 'all') {
			return lang.deckSelector.allDeck.aliases;
		}
		if (isVirtualDeckId(deck.id)) {
			return lang.deckSelector.virtualDecks[deck.id].aliases;
		}
		return [deck.tag];
	}

	private getDeckHint(deck: DeckWithStats): string {
		const lang = t();
		if (deck.id === 'all') {
			return lang.deckSelector.allDeck.hint;
		}
		if (isVirtualDeckId(deck.id)) {
			return lang.deckSelector.virtualDecks[deck.id].hint;
		}
		if (deck.dueCount > 0) {
			return lang.deckSelector.taggedHint;
		}
		return '';
	}

	renderSuggestion(deck: DeckWithStats, el: HTMLElement) {
		const lang = t();
		const container = el.createDiv({ cls: 'er-suggest-item' });

		const leftEl = container.createDiv({ cls: 'er-suggest-left' });
		leftEl.createSpan({ text: this.getDeckIcon(deck), cls: 'er-suggest-icon' });
		leftEl.createSpan({ text: this.getDeckLabel(deck), cls: 'er-suggest-name' });
		const hint = this.getDeckHint(deck);
		if (hint) {
			leftEl.createSpan({ text: hint, cls: 'er-suggest-hint' });
		}

		const rightEl = container.createDiv({ cls: 'er-suggest-right' });

		if (deck.dueCount > 0) {
			rightEl.createSpan({
				text: lang.deckSelector.deckItem.count(deck.dueCount),
				cls: deck.id === 'all' ? 'er-badge er-badge-all' : 'er-badge er-badge-due'
			});
			return;
		}

		if (deck.nextReviewTime) {
			rightEl.createSpan({
				text: deck.nextReviewTime,
				cls: 'er-badge er-badge-later'
			});
		}
	}

	private getDeckIcon(deck: DeckWithStats): string {
		if (deck.id === 'all') return '📚';
		if (deck.id === 'leech') return '⚠️';
		if (deck.id === 'new') return '🆕';
		if (deck.dueCount > 0) return '🔥';
		return '⏳';
	}

	onChooseSuggestion(deck: DeckWithStats, _evt: MouseEvent | KeyboardEvent) {
		const lang = t();
		const cardsToReview = this.getReviewCards(deck);

		if (cardsToReview.length === 0) {
			new Notice(lang.notifications.noDueCards, 2000);
			return;
		}

		this.close();

		window.setTimeout(() => {
			void openReview(this.app, {
				cards: cardsToReview,
				vault: this.vault,
				maxCardsPerReview: this.maxCardsPerReview,
				reloadCards: () => this.reloadCardsForDeck(deck),
				onComplete: () => {
					if (this.onReviewComplete) {
						this.onReviewComplete();
					}
				},
				clickToRevealCloze: this.clickToRevealCloze,
				includeNotDue: deck.id === 'leech',
			}, this.reviewSurface);
		}, 100);
	}

	private getReviewCards(deck: DeckWithStats): Card[] {
		if (deck.id === 'all') {
			return getDueCards(this.allCards);
		}
		if (isVirtualDeckId(deck.id)) {
			return deck.cards;
		}
		return getDueCards(deck.cards);
	}

	private async reloadCardsForDeck(deck: DeckWithStats): Promise<Card[]> {
		const allCards = await scanVault(this.vault, this.app, this.deckTagPrefix);

		if (deck.id === 'all') {
			return getDueCards(allCards);
		}

		if (isVirtualDeckId(deck.id)) {
			return filterCardsForVirtualDeck(allCards, deck.id, this.leechLapses);
		}

		const dueDecks = groupByDecks(getDueCards(allCards));
		return dueDecks.find(dueDeck => dueDeck.tag === deck.tag)?.cards ?? [];
	}

	onClose() {
		this.contentEl.empty();
	}
}

export async function openDeckModal(
	app: App,
	vault: Vault,
	reviewSurface: ReviewSurface,
	maxCardsPerReview: number,
	deckTagPrefix: string,
	onComplete?: () => void,
	clickToRevealCloze?: boolean,
	leechLapses?: number,
	showLeechDeck?: boolean,
	showNewDeck?: boolean
): Promise<void> {
	new DeckSuggestModal(
		app,
		vault,
		reviewSurface,
		maxCardsPerReview,
		deckTagPrefix,
		onComplete,
		clickToRevealCloze,
		leechLapses,
		showLeechDeck,
		showNewDeck
	).open();
}

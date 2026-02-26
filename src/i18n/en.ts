/**
 * English translations
 */
export const en = {
	// Rating buttons
	rating: {
		again: 'Again',
		hard: 'Hard',
		good: 'Good',
	},

	// Commands
	commands: {
		startReview: 'Start Review',
		reviewCurrentNote: 'Review Current Note',
	},

	// Notifications
	notifications: {
		reviewComplete: 'Review complete!',
		noDueCards: 'No due cards in this deck',
		noDueCardsInNote: 'No due cards in current note',
		failedToStart: 'Failed to start review, please check console',
		failedToSave: '❌ Failed to save, please retry',
		fileChanged: (path: string) => `Review file changed: ${path}`,
	},

	// Deck selector
	deckSelector: {
		placeholder: 'Search decks... (type @all to review all)',
		loading: 'Loading cards...',
		loadFailed: 'Failed to load, please retry',
		emptyState: 'No matching decks found',
		noDecks: 'No decks found',
		stats: {
			decks: 'decks',
			cards: 'cards',
			due: 'due',
			new: 'new',
			scheduled: 'scheduled',
		},
		allDeck: {
			name: '@all',
			total: (count: number) => `${count} total`,
		},
		deckItem: {
			due: (count: number) => `${count} due`,
			new: (count: number) => `${count} new`,
			total: (count: number) => `${count} cards`,
		},
		instructions: {
			navigate: 'navigate',
			select: 'select',
			close: 'close',
		},
	},

	// Review modal
	review: {
		title: 'Review Cards',
		progress: (current: number, total: number) => `Review (${current}/${total})`,
		showAnswer: 'Show Answer',
		showHint: 'Show Hint',
		hint: 'Hint',
		complete: {
			title: 'Review Complete',
			button: 'Done',
		},
	},

	// Time formatting
	time: {
		now: 'now',
		minutes: (n: number) => `${n} min`,
		hours: (n: number) => `${n} hr`,
		days: (n: number) => `${n} days`,
		weeks: (n: number) => `${n} weeks`,
		months: (n: number) => `${n} months`,
		years: (n: number) => `${n} years`,
		tomorrow: 'tomorrow',
		today: 'today',
		yesterday: 'yesterday',
		immediate: 'immediate',
	},

	// Card types
	cardTypes: {
		cloze: 'Cloze',
		qa: 'Q&A',
	},
};

/**
 * Translation type definition
 * Uses 'any' for string values to allow any language's strings
 */
export type Translations = typeof en;

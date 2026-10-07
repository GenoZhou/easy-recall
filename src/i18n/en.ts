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
		reviewCurrentNote: 'Review Due Cards in Current Note',
	},

	// Notifications
	notifications: {
		reviewComplete: 'Review complete!',
		noDueCards: 'No due cards in this deck',
		noDueCardsInNote: 'No due cards in current note',
		failedToStart: 'Failed to start review, please check console',
		failedToSave: '❌ Failed to save, please retry',
		failedToOpenFile: '❌ Failed to open source note, please retry',
		fileChanged: (path: string) => `Review file changed: ${path}`,
		undoFailed: '❌ Failed to undo, please retry',
	},

	// Deck selector
	deckSelector: {
		placeholder: 'Search decks',
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
			name: 'All due',
			hint: 'Due cards from every tag',
			aliases: ['@all', 'all'],
		},
		virtualDecks: {
			leech: {
				name: 'Extra practice',
				hint: 'Often-missed cards, even if not due',
				aliases: ['@leech', 'leech', 'leeches'],
			},
			new: {
				name: 'New due',
				hint: 'Due new cards only, skip the backlog',
				aliases: ['@new', 'new'],
			},
		},
		taggedHint: 'Due cards in this tag only',
		dueDeck: (tag: string) => `${tag} due`,
		deckItem: {
			count: (count: number) => `${count}`,
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
		openSource: 'Open source',
		undoLast: 'Undo last',
		undoLastAria: 'Undo the last rating',
		hint: 'Hint',
		shortcutsInactive: 'Click here to enable shortcuts',
		statusTags: {
			newCard: 'New card',
		},
		complete: {
			title: 'Review Complete',
			button: 'Done',
			continueButton: 'Continue Review',
			remaining: (count: number) => `${count} due cards remain in this deck.`,
		},
	},

	settings: {
		sections: {
			stats: 'Stats',
		},
		language: {
			name: 'Language',
			desc: 'Interface language. Auto will follow Obsidian settings.',
			auto: 'Auto',
			en: 'English',
			zh: 'Chinese',
		},
		debug: {
			name: 'Debug Mode',
			desc: 'Show debug logs in console (requires restart).',
		},
		deckTagPrefix: {
			name: 'Deck Tag Prefix',
			desc: 'Tag prefix used to find decks, such as easy-recall for #easy-recall/math.',
		},
		reviewBatchSize: {
			name: 'Review Batch Size',
			desc: 'Maximum number of due cards to include in one review session.',
		},
		reviewSurface: {
			name: 'Review Interface',
			desc: 'Choose whether reviews open in a modal window or a reusable Obsidian tab.',
			modal: 'Modal',
			tab: 'Tab',
		},
		clickToRevealCloze: {
			name: 'Click-to-reveal review',
			desc: 'Tap a cloze to cycle hidden, shown, and crossed out. Any crossed-out item counts as Again; after all are shown, choose Hard or Good.',
			demoPrefix: 'Earth orbits the ',
			demoAnswer1: 'Sun',
			demoMiddle: ', and the Moon orbits ',
			demoAnswer2: 'Earth',
			demoSuffix: '.',
			demoEmptyHint: 'Reveal every cloze item to see the rating buttons.',
			demoRevealAriaLabel: 'Reveal answer',
		},
		enableUndo: {
			name: 'Undo last rating',
			desc: 'Show Undo last in the review header. On desktop, Backspace also undoes. Off by default.',
		},
		leechLapses: {
			name: 'Extra practice deck threshold',
			desc: 'Cards join Extra practice after this many Again ratings, and leave after enough Good ratings.',
		},
		showLeechDeck: {
			name: 'Extra practice deck',
			desc: 'List often-missed cards in the deck picker, even if they are not due yet. They leave after enough Good ratings.',
		},
		showNewDeck: {
			name: 'New due deck',
			desc: 'List due new cards on their own in the deck picker, so you can learn new cards when the backlog is large.',
		},
		stats: {
			desc: 'Summary of review counts and upcoming review windows.',
			refresh: 'Refresh',
			loading: 'Loading review stats...',
			loadFailed: 'Failed to load review stats.',
			empty: 'No review cards found yet.',
			total: 'Total cards',
			totalDecks: 'Decks',
			matureCards: 'Mature',
			dueNow: 'Due now',
			dayAxis: 'Due date',
			countAxis: 'Due cards',
			dateCount: (date: string, count: number) => `${date}: ${count} due cards`,
			onlyDueDates: 'Only dates with due cards are shown.',
			noUpcoming: 'No scheduled cards due in the next 30 days.',
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

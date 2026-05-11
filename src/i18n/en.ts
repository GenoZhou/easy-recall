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
		openSource: 'Open source',
		hint: 'Hint',
		shortcutsInactive: 'Click here to enable shortcuts',
		statusTags: {
			newCard: 'New card',
		},
		complete: {
			title: 'Review Complete',
			button: 'Done',
		},
	},

	settings: {
		title: 'ob-reviews Settings',
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
		reviewBatchSize: {
			name: 'Review Batch Size',
			desc: 'Maximum number of due cards to include in one review session.',
		},
		reviewSurface: {
			desktopName: 'Desktop Review Interface',
			desktopDesc: 'Choose whether desktop reviews open in a modal window or a reusable Obsidian tab.',
			mobileName: 'Mobile Review Interface',
			mobileDesc: 'Choose whether mobile reviews open in a modal window or a reusable Obsidian tab.',
			modal: 'Modal',
			tab: 'Tab',
		},
		stats: {
			name: 'Review Stats',
			desc: 'Summary of review counts and upcoming review windows.',
			refresh: 'Refresh',
			loading: 'Loading review stats...',
			loadFailed: 'Failed to load review stats.',
			empty: 'No review cards found yet.',
			upcoming: 'Upcoming Review Windows',
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

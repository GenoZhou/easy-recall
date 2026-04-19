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
		stats: {
			name: 'Review Stats',
			desc: 'Overview of card progress and upcoming review windows.',
			refresh: 'Refresh',
			loading: 'Loading review stats...',
			loadFailed: 'Failed to load review stats.',
			empty: 'No review cards found yet.',
			overview: 'Progress',
			upcoming: 'Upcoming Review Windows',
			total: 'Total cards',
			totalDecks: 'Decks',
			newCards: 'New cards',
			relearningCards: 'Relearning',
			learningCards: 'Learning',
			matureCards: 'Mature',
			dueNow: 'Due now',
			upcoming1d: 'Within 1 day',
			upcoming3d: 'Within 3 days',
			upcoming7d: 'Within 7 days',
			upcoming30d: 'Within 30 days',
			later: 'Later',
			explanations: {
				newCards: 'Not reviewed yet.',
				relearningCards: 'Failed recently and back in relearning.',
				learningCards: 'Passed once and still stabilizing.',
				matureCards: 'Reviewed multiple times and relatively stable.',
				dueNow: 'Available to review immediately.',
				upcoming1d: 'Likely to come back very soon.',
				upcoming3d: 'Short-term reinforcement window.',
				upcoming7d: 'Near-future review load.',
				upcoming30d: 'Mid-term scheduled reviews.',
				later: 'Longer-term queue beyond 30 days.',
			},
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

import { executeStartReview } from '../commands/start-review';
import { getReviewCurrentNoteCommand, reviewCurrentNoteCheckCallback } from '../commands/review-current-note';
import { setLanguage } from '../i18n';
import { openDeckModal } from '../ui/deck-suggest-modal';

jest.mock('obsidian', () => ({
	Notice: jest.fn(),
}), { virtual: true });

jest.mock('../deck', () => ({
	getDueCardsFromFile: jest.fn(),
}));

jest.mock('../ui/open-review', () => ({
	openReview: jest.fn(),
}));

jest.mock('../ui/deck-suggest-modal', () => ({
	openDeckModal: jest.fn().mockResolvedValue(undefined),
}));

describe('commands', () => {
	afterEach(() => {
		setLanguage('zh');
		jest.clearAllMocks();
	});

	it('should name the current-note command as due-card review', () => {
		setLanguage('zh');
		const command = getReviewCurrentNoteCommand({
			app: {} as any,
			plugin: {} as any,
		});

		expect(command.id).toBe('review-current-note');
		expect(command.name).toBe('复习当前笔记内到期卡片');
	});

	it('should only enable current-note due review for markdown files', () => {
		const context = {
			app: {
				workspace: {
					getActiveFile: jest.fn(),
				},
			},
			plugin: {},
		} as any;

		context.app.workspace.getActiveFile.mockReturnValue(null);
		expect(reviewCurrentNoteCheckCallback(context, true)).toBe(false);

		context.app.workspace.getActiveFile.mockReturnValue({ extension: 'canvas' });
		expect(reviewCurrentNoteCheckCallback(context, true)).toBe(false);

		context.app.workspace.getActiveFile.mockReturnValue({ extension: 'md' });
		expect(reviewCurrentNoteCheckCallback(context, true)).toBe(true);
	});

	it('passes disabled click-to-reveal as false on global review', async () => {
		const vault = {};
		await executeStartReview({
			app: { vault } as any,
			plugin: {
				settings: {
					reviewBatchSize: 20,
					deckTagPrefix: 'easy-recall',
					reviewSurface: 'modal',
					clickToRevealCloze: false,
					leechLapses: 3,
					showLeechDeck: true,
					showNewDeck: false,
					enableUndo: false,
				},
			} as any,
		});

		expect(openDeckModal).toHaveBeenCalledWith(expect.anything(), {
			vault,
			reviewSurface: 'modal',
			maxCardsPerReview: 20,
			deckTagPrefix: 'easy-recall',
			onComplete: expect.any(Function),
			clickToRevealCloze: false,
			leechLapses: 3,
			showLeechDeck: true,
			showNewDeck: false,
			enableUndo: false,
		});
	});

	it('passes enabled click-to-reveal as true on global review', async () => {
		await executeStartReview({
			app: { vault: {} } as any,
			plugin: {
				settings: {
					reviewBatchSize: 20,
					deckTagPrefix: 'easy-recall',
					reviewSurface: 'modal',
					clickToRevealCloze: true,
					leechLapses: 3,
					showLeechDeck: false,
					showNewDeck: true,
					enableUndo: true,
				},
			} as any,
		});

		const options = (openDeckModal as jest.Mock).mock.calls[0][1];
		expect(options.clickToRevealCloze).toBe(true);
		expect(options.showLeechDeck).toBe(false);
		expect(options.showNewDeck).toBe(true);
		expect(options.enableUndo).toBe(true);
	});
});

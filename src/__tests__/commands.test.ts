import { Platform } from 'obsidian';
import { executeStartReview } from '../commands/start-review';
import { getReviewCurrentNoteCommand, reviewCurrentNoteCheckCallback } from '../commands/review-current-note';
import { setLanguage } from '../i18n';
import { openDeckModal } from '../ui/deck-suggest-modal';

jest.mock('obsidian', () => ({
	Notice: jest.fn(),
	Platform: { isMobile: false },
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
		(Platform as any).isMobile = false;
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

	it('passes disabled click-to-reveal as false on mobile global review', async () => {
		(Platform as any).isMobile = true;

		await executeStartReview({
			app: { vault: {} } as any,
			plugin: {
				settings: {
					reviewBatchSize: 20,
					deckTagPrefix: 'easy-recall',
					mobileReviewSurface: 'modal',
					desktopReviewSurface: 'modal',
					clickToRevealCloze: 'disabled',
				},
			} as any,
		});

		expect(openDeckModal).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			'modal',
			20,
			'easy-recall',
			expect.any(Function),
			false
		);
	});

	it('resolves click-to-reveal modes for mobile global review', async () => {
		(Platform as any).isMobile = true;

		const baseContext = {
			app: { vault: {} } as any,
			plugin: {
				settings: {
					reviewBatchSize: 20,
					deckTagPrefix: 'easy-recall',
					mobileReviewSurface: 'modal',
					desktopReviewSurface: 'modal',
				},
			} as any,
		};

		for (const [mode, expected] of [
			['desktop', false],
			['mobile', true],
			['enabled', true],
			['disabled', false],
		] as const) {
			(openDeckModal as jest.Mock).mockClear();
			baseContext.plugin.settings.clickToRevealCloze = mode;

			await executeStartReview(baseContext);

			expect((openDeckModal as jest.Mock).mock.calls[0][6]).toBe(expected);
		}
	});
});

import { getReviewCurrentNoteCommand, reviewCurrentNoteCheckCallback } from '../commands/review-current-note';
import { setLanguage } from '../i18n';

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
});

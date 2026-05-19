import { getReviewCurrentNoteCommand, reviewCurrentNoteCheckCallback } from '../commands/review-current-note';
import { getToggleClickToRevealClozeCommand } from '../commands/toggle-click-to-reveal';
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

	it('should toggle click-to-reveal cloze setting from false to true', async () => {
		setLanguage('en');
		const updateMock = jest.fn().mockResolvedValue(undefined);
		const plugin = {
			settings: { clickToRevealCloze: false },
			settingsManager: {
				update: updateMock,
				get: jest.fn().mockReturnValue({ clickToRevealCloze: true }),
			},
		} as any;

		const command = getToggleClickToRevealClozeCommand({ app: {} as any, plugin });
		expect(command.id).toBe('toggle-click-to-reveal-cloze');
		expect(command.name).toBe('Toggle Click-to-Reveal Cloze Review');

		await command.callback();
		expect(updateMock).toHaveBeenCalledWith({ clickToRevealCloze: true });
		expect(plugin.settings.clickToRevealCloze).toBe(true);
	});

	it('should toggle click-to-reveal cloze setting from true to false', async () => {
		setLanguage('zh');
		const updateMock = jest.fn().mockResolvedValue(undefined);
		const plugin = {
			settings: { clickToRevealCloze: true },
			settingsManager: {
				update: updateMock,
				get: jest.fn().mockReturnValue({ clickToRevealCloze: false }),
			},
		} as any;

		const command = getToggleClickToRevealClozeCommand({ app: {} as any, plugin });
		expect(command.name).toBe('切换点击逐项复习');

		await command.callback();
		expect(updateMock).toHaveBeenCalledWith({ clickToRevealCloze: false });
		expect(plugin.settings.clickToRevealCloze).toBe(false);
	});
});

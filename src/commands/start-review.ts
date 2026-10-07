/**
 * 开始全局复习命令
 */

import { Notice } from 'obsidian';
import { openDeckModal } from '../ui/deck-suggest-modal';
import { t } from '../i18n';
import { info } from '../utils/';
import type { CommandContext } from './types';

/**
 * 执行全局复习
 */
export async function executeStartReview(context: CommandContext): Promise<void> {
	const { app, plugin } = context;
	const lang = t();
	
	info('Starting global review');
	
	try {
		await openDeckModal(app, {
			vault: app.vault,
			reviewSurface: plugin.settings.reviewSurface,
			maxCardsPerReview: plugin.settings.reviewBatchSize,
			deckTagPrefix: plugin.settings.deckTagPrefix,
			onComplete: () => {
				new Notice(lang.notifications.reviewComplete, 2000);
			},
			clickToRevealCloze: plugin.settings.clickToRevealCloze,
			leechLapses: plugin.settings.leechLapses,
			showLeechDeck: plugin.settings.showLeechDeck,
			showNewDeck: plugin.settings.showNewDeck,
			enableUndo: plugin.settings.enableUndo,
		});
	} catch (err) {
		console.error('Failed to start review:', err);
		new Notice(lang.notifications.failedToStart, 3000);
	}
}

/**
 * 获取命令配置
 */
export function getStartReviewCommand(context: CommandContext) {
	const lang = t();
	
	return {
		id: 'start-review',
		name: lang.commands.startReview,
		callback: () => executeStartReview(context),
	};
}

/**
 * 复习当前笔记命令
 */

import { TFile, Notice } from 'obsidian';
import { getDueCardsFromFile } from '../deck';
import { t } from '../i18n';
import { info } from '../utils/';
import type { CommandContext, FileCheckCallback } from './types';
import { openReview } from '../ui/open-review';

/**
 * 执行当前笔记复习
 */
export async function executeReviewCurrentNote(
	context: CommandContext,
	file: TFile
): Promise<void> {
	const { app, plugin } = context;
	const lang = t();
	
	info('Starting file review:', file.path);
	
	try {
		const dueCards = await getDueCardsFromFile(app.vault, file);

		if (dueCards.length === 0) {
			new Notice(lang.notifications.noDueCardsInNote, 2000);
			return;
		}

		await openReview(app, {
			cards: dueCards,
			vault: app.vault,
			onComplete: () => {
				new Notice(lang.notifications.reviewComplete, 2000);
			},
		}, plugin.settings.reviewSurface);

	} catch (err) {
		console.error('Failed to start file review:', err);
		new Notice(lang.notifications.failedToStart, 3000);
	}
}

/**
 * 检查回调 - 判断当前是否有激活的 Markdown 文件
 */
export function reviewCurrentNoteCheckCallback(
	context: CommandContext,
	checking: boolean
): boolean {
	const activeFile = context.app.workspace.getActiveFile();
	const isValid = activeFile !== null && activeFile.extension === 'md';
	
	if (!checking && isValid && activeFile) {
		executeReviewCurrentNote(context, activeFile);
	}
	
	return isValid;
}

/**
 * 获取命令配置
 */
export function getReviewCurrentNoteCommand(context: CommandContext) {
	const lang = t();
	
	return {
		id: 'review-current-note',
		name: lang.commands.reviewCurrentNote,
		checkCallback: (checking: boolean) => reviewCurrentNoteCheckCallback(context, checking),
	};
}
